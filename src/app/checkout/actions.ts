// app/checkout/actions.ts
"use server";

import { createHash } from "crypto";
import { headers } from "next/headers";
import { getServerSupabase } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import {
    attachMerchCreditReservationToStripeSession,
    releaseMerchCreditReservation,
    reserveMerchCreditsForCheckout,
} from "@/lib/merch-credits/checkout";
import {
    merchCreditDiscountCents as calculateMerchCreditDiscountCents,
    MERCH_CREDIT_REDEMPTION_POINTS,
} from "@/lib/merch-credits/constants";
import { logger } from "@/lib/logger";
import { publicCatalogProductQuery } from "@/lib/catalog/public-product-query";
import { checkDurableRateLimit } from "@/lib/rate-limit";
import { recordPlatformEvent } from "@/lib/platform-events";
import { checkoutShippingAmountCents, normaliseShippingMethodId } from "@/lib/shipping-methods";
import { stripe } from "@/lib/stripe/client";
import {
    ARTIST_SELF_ORDER_TYPE,
    RETAIL_PURCHASE_TYPE,
    artistBulkDiscountBps,
    artistBulkUnitPriceCents,
    artistSelfOrderUnitPriceCents,
} from "@/lib/artist-self-orders";
import Stripe from "stripe";
import { z } from "zod";
import { AUSTRALIAN_STATE_CODES, COUNTRY_CODES } from "@/lib/address-options";
import { applyAmplifyEarnings, getActiveAmplifyEntitlements } from "@/lib/amplify/entitlements";

const cartItemSchema = z.object({
    product_id: z.string().min(1).max(100),
    sku: z.string().max(200).nullish(),
    color_label: z.string().max(100).nullish(),
    size: z.string().max(20).nullish(),
    purchase_type: z.enum([RETAIL_PURCHASE_TYPE, ARTIST_SELF_ORDER_TYPE]).default(RETAIL_PURCHASE_TYPE),
    qty: z.coerce.number().int().min(1).max(99),
});

const MAX_CHECKOUT_PRODUCT_LINES = 99;
const STRIPE_WEBHOOK_LINE_ITEM_FETCH_LIMIT = 100;
const cartSchema = z.array(cartItemSchema).min(1).max(MAX_CHECKOUT_PRODUCT_LINES);

const checkoutDetailsSchema = z.object({
    email: z.email().max(320),
    first_name: z.string().min(1).max(80),
    last_name: z.string().min(1).max(80),
    line1: z.string().min(3).max(160),
    line2: z.string().max(160).optional(),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(100),
    postal_code: z.string().min(3).max(20),
    country: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()),
    phone: z.string().min(6).max(40),
    voucher: z.string().max(100).optional(),
    use_merch_credits: z.boolean().optional(),
}).superRefine((details, context) => {
    if (!COUNTRY_CODES.has(details.country)) {
        context.addIssue({ code: "custom", path: ["country"], message: "Country is invalid." });
    }
    if (details.country === "AU" && !AUSTRALIAN_STATE_CODES.has(details.state.toUpperCase())) {
        context.addIssue({ code: "custom", path: ["state"], message: "Australian state or territory is invalid." });
    }
}).transform((details) => ({
    ...details,
    state: details.country === "AU" ? details.state.toUpperCase() : details.state,
}));

const checkoutAttemptIdSchema = z.uuid();
const attributionSchema = z.record(z.string(), z.unknown());

const CHECKOUT_ATTEMPT_LIMIT = 12;
const CHECKOUT_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

function cleanMetadataValue(value: FormDataEntryValue | null, max = 500) {
    return String(value || "").trim().slice(0, max);
}

function hashRateLimitPart(value: string) {
    return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function compactAttribution(value: Record<string, unknown>) {
    const allowed = [
        "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
        "gclid", "gbraid", "wbraid", "fbclid", "ttclid", "first_landing_page",
    ];
    return Object.fromEntries(
        allowed.flatMap((key) => {
            const item = value[key];
            return typeof item === "string" && item.trim()
                ? [[key, item.trim().slice(0, 120)]]
                : [];
        })
    );
}

function stripeAttributionMetadata(value: Record<string, unknown>) {
    const compact: Record<string, string> = {};

    for (const [key, rawValue] of Object.entries(value)) {
        compact[key] = String(rawValue);
        const serialised = JSON.stringify(compact);
        if (serialised.length > 500) {
            delete compact[key];
        }
    }

    return JSON.stringify(compact);
}

async function checkoutRateLimitKey(userId: string | null, email: string) {
    const headerStore = await headers();
    const ip =
        headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headerStore.get("x-real-ip") ||
        "unknown";

    return `checkout:${userId ?? `email:${hashRateLimitPart(email.toLowerCase())}`}:ip:${hashRateLimitPart(ip)}`;
}

export async function placeOrderAndGoToStripe(formData: FormData) {
    const supabase = getServerSupabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const parsedDetails = checkoutDetailsSchema.safeParse({
        email: cleanMetadataValue(formData.get("email"), 320),
        first_name: cleanMetadataValue(formData.get("first_name"), 80),
        last_name: cleanMetadataValue(formData.get("last_name"), 80),
        line1: cleanMetadataValue(formData.get("line1"), 160),
        line2: cleanMetadataValue(formData.get("line2"), 160),
        city: cleanMetadataValue(formData.get("city"), 100),
        state: cleanMetadataValue(formData.get("state"), 100),
        postal_code: cleanMetadataValue(formData.get("postal_code"), 20),
        country: cleanMetadataValue(formData.get("country"), 80),
        phone: cleanMetadataValue(formData.get("phone"), 40),
        voucher: cleanMetadataValue(formData.get("voucher"), 100),
        use_merch_credits: formData.get("use_merch_credits") === "true",
    });

    if (!parsedDetails.success) {
        return { error: "Please complete your contact and shipping details." };
    }

    const details = parsedDetails.data;
    const checkoutAttemptId = checkoutAttemptIdSchema.catch(crypto.randomUUID()).parse(
        cleanMetadataValue(formData.get("checkout_attempt_id"), 80)
    );
    const checkoutAllowed = await checkDurableRateLimit(
        supabase,
        await checkoutRateLimitKey(user?.id ?? null, details.email),
        CHECKOUT_ATTEMPT_LIMIT,
        CHECKOUT_ATTEMPT_WINDOW_MS,
        "check_public_rate_limit",
        { fallback: "deny" }
    );

    if (!checkoutAllowed) {
        return { error: "Too many checkout attempts. Try again shortly." };
    }

    const rawCart = formData.get("cart_json") as string | null;
    let cartItems: z.infer<typeof cartSchema>;

    try {
        cartItems = cartSchema.parse(rawCart ? JSON.parse(rawCart) : []);
    } catch {
        return { error: "Cart contents are invalid" };
    }

    const purchaseTypes = new Set(cartItems.map((item) => item.purchase_type));
    if (purchaseTypes.size !== 1) {
        return { error: "Retail items and artist-priced items must be checked out separately." };
    }
    const purchaseType = cartItems[0]?.purchase_type ?? RETAIL_PURCHASE_TYPE;
    const isArtistSelfOrder = purchaseType === ARTIST_SELF_ORDER_TYPE;

    if (isArtistSelfOrder && !user) {
        return { error: "Sign in with your artist account to use artist pricing." };
    }

    const shippingMethod = normaliseShippingMethodId(formData.get("shipping_method"));
    const shippingAmountCents = checkoutShippingAmountCents(
        shippingMethod,
        details.country,
        cartItems.length,
        cartItems.reduce((sum, item) => sum + item.qty, 0)
    );
    const voucher = details.voucher ?? "";
    const marketingAttribution = compactAttribution(attributionSchema.catch({}).parse(
        (() => {
            try {
                return JSON.parse(cleanMetadataValue(formData.get("marketing_attribution"), 4000) || "{}");
            } catch {
                return {};
            }
        })()
    ));

    const productIds = [...new Set(cartItems.map((item) => item.product_id))];
    const productQuery = supabase
        .from("products")
        .select("id, title, price_cents, artist_cut_cents, currency, is_published, artist_id")
        .in("id", productIds);
    const { data: products, error: productsError } = isArtistSelfOrder
        ? await productQuery
        : await publicCatalogProductQuery(productQuery);

    if (productsError) {
        logger.error("checkout product lookup failed", {
            product_count: productIds.length,
            error: productsError.message,
        });
        return { error: "Could not validate the products in your cart." };
    }

    const productsById = new Map(
        (products ?? []).map((product) => [product.id, product])
    );
    const missingProduct = productIds.find((id) => !productsById.has(id));
    if (missingProduct) {
        return { error: "One or more products in your cart are no longer available" };
    }

    if (isArtistSelfOrder) {
        const { data: artist, error: artistError } = await supabase
            .from("artists")
            .select("id")
            .eq("user_id", user!.id)
            .maybeSingle();

        if (artistError || !artist) {
            return { error: "Artist pricing is only available to verified artist accounts." };
        }

        if (products?.some((product) => product.artist_id !== artist.id)) {
            return { error: "Artist pricing only applies to products owned by your artist account." };
        }
    }

    const currency = products?.[0]?.currency || "AUD";
    if (products?.some((product) => product.currency !== currency)) {
        return { error: "Cart contains products with mixed currencies" };
    }

    const amplifyEntitlements = isArtistSelfOrder
        ? new Map()
        : await getActiveAmplifyEntitlements((products ?? []).map((product) => product.artist_id));
    const artistEarningsFor = (product: NonNullable<typeof products>[number]) => applyAmplifyEarnings({
        baseArtistCutCents: product.artist_cut_cents ?? 0,
        retailPriceCents: product.price_cents,
        entitlement: product.artist_id ? amplifyEntitlements.get(product.artist_id) : null,
    });

    const unitPriceFor = (product: NonNullable<typeof products>[number]) =>
        isArtistSelfOrder
            ? artistSelfOrderUnitPriceCents(product.price_cents, product.artist_cut_cents ?? 0)
            : product.price_cents;
    const totalItemQuantity = cartItems.reduce((sum, item) => sum + item.qty, 0);
    const artistBulkDiscountRateBps = artistBulkDiscountBps(totalItemQuantity, purchaseType);
    const checkoutUnitPriceFor = (product: NonNullable<typeof products>[number]) =>
        artistBulkUnitPriceCents(unitPriceFor(product), totalItemQuantity, purchaseType);

    const cartSubtotalCents = cartItems.reduce((sum, item) => {
        const product = productsById.get(item.product_id)!;
        return sum + checkoutUnitPriceFor(product) * item.qty;
    }, 0);
    const merchCreditDiscountCents = calculateMerchCreditDiscountCents({
        subtotalCents: cartSubtotalCents,
        creditBalance: MERCH_CREDIT_REDEMPTION_POINTS,
    });
    let creditReservation:
        | Awaited<ReturnType<typeof reserveMerchCreditsForCheckout>>
        | null = null;
    let merchCreditCouponId: string | null = null;

    if (details.use_merch_credits) {
        if (isArtistSelfOrder) {
            return { error: "Merch credits cannot be combined with artist pricing." };
        }
        if (!user) {
            return { error: "Sign in to redeem merch credits." };
        }

        if (cartSubtotalCents <= 0 || merchCreditDiscountCents <= 0) {
            return { error: "Cart is not eligible for merch credit redemption." };
        }

        try {
            creditReservation = await reserveMerchCreditsForCheckout({
                userId: user.id,
                discountCents: merchCreditDiscountCents,
                currency,
                idempotencyKey: `checkout:${user.id}:${checkoutAttemptId}`,
                metadata: {
                    checkout_attempt_id: checkoutAttemptId,
                    shipping_method: shippingMethod,
                    cart_product_ids: productIds,
                },
            });

            const coupon = await stripe.coupons.create({
                amount_off: creditReservation.discount_cents,
                currency,
                duration: "once",
                name: `${MERCH_CREDIT_REDEMPTION_POINTS} Merch Tent credits`,
                metadata: {
                    merch_credit_reservation_id: creditReservation.reservation_id,
                    merch_credit_points: String(creditReservation.points),
                },
            });

            merchCreditCouponId = coupon.id;
        } catch (error) {
            if (creditReservation) {
                await releaseMerchCreditReservation({
                    reservationId: creditReservation.reservation_id,
                    reason: "stripe_coupon_create_failed",
                }).catch((releaseError) => {
                    logger.error("failed to release merch credit reservation after coupon failure", {
                        reservation_id: creditReservation?.reservation_id,
                        error: releaseError instanceof Error ? releaseError.message : "Unknown release error",
                    });
                });
            }
            logger.error("checkout merch credit reservation failed", {
                user_id: user.id,
                error: error instanceof Error ? error.message : "Unknown merch credit reservation error",
            });
            return { error: "Could not reserve merch credits for this checkout." };
        }
    }

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = cartItems.map(
        (item) => {
            const product = productsById.get(item.product_id)!;
            const artistEarnings = isArtistSelfOrder
                ? applyAmplifyEarnings({
                    baseArtistCutCents: product.artist_cut_cents ?? 0,
                    retailPriceCents: product.price_cents,
                })
                : artistEarningsFor(product);
            const artistDiscountCents = isArtistSelfOrder
                ? Math.max(0, product.price_cents - unitPriceFor(product))
                : 0;
            const artistBulkDiscountCents = isArtistSelfOrder
                ? Math.max(0, unitPriceFor(product) - checkoutUnitPriceFor(product))
                : 0;

            return {
                quantity: item.qty,
                price_data: {
                    currency,
                    unit_amount: checkoutUnitPriceFor(product),
                    product_data: {
                        name: product.title,
                        metadata: {
                            product_id: product.id,
                            sku: item.sku ?? "",
                            color_label: item.color_label ?? "",
                            size: item.size ?? "",
                            purchase_type: purchaseType,
                            artist_discount_cents: String(artistDiscountCents),
                            artist_bulk_discount_cents: String(artistBulkDiscountCents),
                            artist_bulk_discount_bps: String(artistBulkDiscountRateBps),
                            base_artist_cut_cents: String(artistEarnings.baseArtistCutCents),
                            amplify_boost_cents: String(artistEarnings.amplifyBoostCents),
                            artist_plan_key: artistEarnings.artistPlanKey,
                            artist_cut_cents: String(artistEarnings.artistCutCents),
                        },
                    },
                },
            };
        }
    );

    if (shippingAmountCents > 0) {
        line_items.push({
            quantity: 1,
            price_data: {
                currency,
                unit_amount: shippingAmountCents,
                product_data: {
                    name: `Shipping (${shippingMethod})`,
                },
            },
        });
    }

    if (line_items.length > STRIPE_WEBHOOK_LINE_ITEM_FETCH_LIMIT) {
        logger.error("checkout line item count exceeds webhook fetch limit", {
            product_line_count: cartItems.length,
            total_line_count: line_items.length,
            stripe_webhook_line_item_fetch_limit: STRIPE_WEBHOOK_LINE_ITEM_FETCH_LIMIT,
        });
        return { error: "Cart has too many line items for checkout." };
    }

    const siteUrl = publicEnv.siteUrl();

    let session: Stripe.Checkout.Session;
    try {
        session = await stripe.checkout.sessions.create({
            mode: "payment",
            line_items,
            discounts: merchCreditCouponId ? [{ coupon: merchCreditCouponId }] : undefined,
            customer_email: details.email,
            success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${siteUrl}/checkout`,
            phone_number_collection: {
                enabled: true,
            },
            metadata: {
                user_id: user?.id ?? "guest",
                shippingMethod,
                shippingAmountCents: String(shippingAmountCents),
                voucher,
                purchase_type: purchaseType,
                artist_bulk_discount_bps: String(artistBulkDiscountRateBps),
                merch_credit_reservation_id: creditReservation?.reservation_id ?? "",
                merch_credit_points: creditReservation ? String(creditReservation.points) : "",
                merch_credit_discount_cents: creditReservation
                    ? String(creditReservation.discount_cents)
                    : "",
                email: details.email,
                first_name: details.first_name,
                last_name: details.last_name,
                line1: details.line1,
                line2: details.line2 ?? "",
                city: details.city,
                state: details.state,
                postal_code: details.postal_code,
                country: details.country,
                phone: details.phone,
                checkout_attempt_id: checkoutAttemptId,
                marketing_attribution: stripeAttributionMetadata(marketingAttribution),
            },
        }, {
            idempotencyKey: `checkout-session:${user?.id ?? "guest"}:${checkoutAttemptId}`,
        });

    } catch (error) {
        if (creditReservation) {
            await releaseMerchCreditReservation({
                reservationId: creditReservation.reservation_id,
                reason: "stripe_checkout_session_create_failed",
            }).catch((releaseError) => {
                logger.error("failed to release merch credit reservation after checkout failure", {
                    reservation_id: creditReservation?.reservation_id,
                    error: releaseError instanceof Error ? releaseError.message : "Unknown release error",
                });
            });
        }
        logger.error("Stripe checkout session creation failed", {
            user_id: user?.id ?? null,
            product_count: productIds.length,
            has_merch_credit_reservation: Boolean(creditReservation),
            error: error instanceof Error ? error.message : "Unknown Stripe checkout error",
        });
        return { error: "Could not start Stripe checkout." };
    }

    if (creditReservation) {
        try {
            await attachMerchCreditReservationToStripeSession({
                reservationId: creditReservation.reservation_id,
                stripeSessionId: session.id,
            });
        } catch (error) {
            await releaseMerchCreditReservation({
                reservationId: creditReservation.reservation_id,
                reason: "stripe_checkout_session_attach_failed",
            }).catch((releaseError) => {
                logger.error("failed to release merch credit reservation after session attach failure", {
                    reservation_id: creditReservation?.reservation_id,
                    stripe_session_id: session.id,
                    error: releaseError instanceof Error ? releaseError.message : "Unknown release error",
                });
            });

            await stripe.checkout.sessions.expire(session.id).catch((expireError) => {
                logger.error("failed to expire Stripe checkout session after merch credit attach failure", {
                    stripe_session_id: session.id,
                    reservation_id: creditReservation?.reservation_id,
                    error: expireError instanceof Error ? expireError.message : "Unknown Stripe session expiry error",
                });
            });

            await recordPlatformEvent(
                {
                    scope: "credits",
                    action: "merch_credit_reservation_attach_failed",
                    severity: "critical",
                    actorUserId: user?.id ?? null,
                    externalId: session.id,
                    message: "Checkout session was created but merch credit reservation attachment failed.",
                    metadata: {
                        reservation_id: creditReservation.reservation_id,
                        checkout_attempt_id: checkoutAttemptId,
                        product_count: productIds.length,
                        currency,
                        discount_cents: creditReservation.discount_cents,
                        error: error instanceof Error ? error.message : "Unknown merch credit attach error",
                    },
                },
                {
                    failureLogMessage: "checkout merch credit attach failure platform event failed",
                    failureContext: {
                        user_id: user?.id ?? null,
                        stripe_session_id: session.id,
                        reservation_id: creditReservation.reservation_id,
                    },
                    throwOnFailure: true,
                    failurePublicMessage: "Could not audit merch credit checkout failure.",
                }
            );

            return { error: "Could not start Stripe checkout." };
        }
    }

    return { url: session.url };
}
