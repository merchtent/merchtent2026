// app/api/stripe/webhook/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
    sendOrderEmails,
    buildOrderEmailPayloadFromStripe,
    type OrderEmailItem,
} from "@/lib/postmark";
import { sendSms, normalisePhone } from "@/lib/sms";
import {
    finishNotificationDelivery,
    reserveNotificationDelivery,
} from "@/lib/notifications/delivery-ledger";
import { getServiceSupabase } from "@/lib/supabase/service";
import { serverEnv } from "@/lib/env.server";
import { snapshotStripeAccount } from "@/lib/stripe/connect";
import { stripe } from "@/lib/stripe/client";
import { logger } from "@/lib/logger";
import { redeemMerchCreditReservation } from "@/lib/merch-credits/checkout";
import { recordPlatformEvent, type PlatformEventSeverity } from "@/lib/platform-events";
import { NO_STORE_HEADERS, noStoreJson } from "@/lib/api/no-store";

function isUuidLike(s: string | null | undefined): s is string {
    if (!s) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        s
    );
}

let supabaseAdminClient: ReturnType<typeof getServiceSupabase> | null = null;

function getSupabaseAdmin() {
    supabaseAdminClient ??= getServiceSupabase();
    return supabaseAdminClient;
}

const STRIPE_WEBHOOK_LINE_ITEM_FETCH_LIMIT = 100;

type WebhookLedgerStatus = "processing" | "processed" | "ignored" | "failed";

type ProcessedOrder = {
    order_id: string;
    order_number: string | null;
    item_count: number;
    fulfillment_job_id: string | null;
};

type StripeFinancialAttentionPayload = {
    id?: string;
    amount?: number | null;
    amount_refunded?: number | null;
    currency?: string | null;
    payment_intent?: string | { id?: string } | null;
    charge?: string | { id?: string } | null;
    reason?: string | null;
    status?: string | null;
    failure_message?: string | null;
    last_payment_error?: {
        code?: string | null;
        message?: string | null;
    } | null;
};

const FINANCIAL_ATTENTION_WEBHOOKS = new Set([
    "charge.refunded",
    "charge.dispute.created",
    "charge.dispute.updated",
    "charge.dispute.closed",
    "payment_intent.payment_failed",
]);

function errorContext(error: unknown) {
    return {
        error: error instanceof Error ? error.message : String(error),
    };
}

function failStripeWebhookProcessing(message: string, details: Record<string, unknown>): never {
    logger.error(message, details);
    throw new Error("Stripe webhook processing failed.");
}

async function startWebhookLedger(event: Stripe.Event) {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabaseAdmin
        .from("stripe_webhook_events")
        .select("status, attempts")
        .eq("event_id", event.id)
        .maybeSingle();

    if (existingError) {
        logger.error("failed to read Stripe webhook ledger", errorContext(existingError));
        return { alreadyProcessed: false };
    }

    if (existing?.status === "processed" || existing?.status === "ignored") {
        return { alreadyProcessed: true };
    }

    const { error } = await supabaseAdmin
        .from("stripe_webhook_events")
        .upsert(
            {
                event_id: event.id,
                event_type: event.type,
                status: "processing",
                attempts: Number(existing?.attempts ?? 0) + 1,
                payload: event as unknown as Record<string, unknown>,
                last_error: null,
                processing_started_at: new Date().toISOString(),
                failed_at: null,
            },
            { onConflict: "event_id" }
        );

    if (error) {
        logger.error("failed to start Stripe webhook ledger", errorContext(error));
    }

    return { alreadyProcessed: false };
}

async function finishWebhookLedger(
    eventId: string,
    status: WebhookLedgerStatus,
    error?: unknown
) {
    const supabaseAdmin = getSupabaseAdmin();
    const now = new Date().toISOString();
    const message =
        error instanceof Error
            ? error.message
            : typeof error === "string"
                ? error
                : error
                    ? JSON.stringify(error).slice(0, 2000)
                    : null;

    const { error: updateError } = await supabaseAdmin
        .from("stripe_webhook_events")
        .update({
            status,
            last_error: message,
            processed_at: status === "processed" || status === "ignored" ? now : null,
            failed_at: status === "failed" ? now : null,
        })
        .eq("event_id", eventId);

    if (updateError) {
        logger.error("failed to finish Stripe webhook ledger", errorContext(updateError));
    }
}

async function handleStripeAccountUpdated(event: Stripe.Event) {
    const supabaseAdmin = getSupabaseAdmin();
    const account = event.data.object as Stripe.Account;
    const snapshot = snapshotStripeAccount(account);

    const { data: paymentAccount, error } = await supabaseAdmin
        .from("artist_payment_accounts")
        .update(snapshot)
        .eq("stripe_account_id", account.id)
        .select("artist_id")
        .maybeSingle();

    if (error) {
        failStripeWebhookProcessing("Stripe Connect account snapshot update failed", {
            event_id: event.id,
            stripe_account_id: account.id,
            error: error.message,
        });
    }

    if (!paymentAccount) {
        failStripeWebhookProcessing("Stripe Connect account snapshot update matched no artist payment account", {
            event_id: event.id,
            stripe_account_id: account.id,
        });
    }

    await recordPlatformEvent(
        {
            scope: "payouts",
            action: "stripe_connect_account_webhook_synced",
            severity: snapshot.onboarding_status === "restricted" ? "warning" : "info",
            artistId: paymentAccount.artist_id,
            externalId: account.id,
            message: "Stripe Connect account state was synced from account.updated webhook.",
            metadata: {
                event_id: event.id,
                onboarding_status: snapshot.onboarding_status,
                charges_enabled: snapshot.charges_enabled,
                payouts_enabled: snapshot.payouts_enabled,
                details_submitted: snapshot.details_submitted,
                disabled_reason: snapshot.disabled_reason,
            },
        },
        {
            supabase: supabaseAdmin,
            failureLogMessage: "Stripe Connect account webhook platform event failed",
            failureContext: {
                event_id: event.id,
                stripe_account_id: account.id,
                artist_id: paymentAccount.artist_id,
            },
            throwOnFailure: true,
            failurePublicMessage: "Could not audit Stripe Connect account webhook sync.",
        }
    );
}

async function logPlatformEvent(input: {
    scope: string;
    action: string;
    severity?: PlatformEventSeverity;
    orderId?: string | null;
    fulfillmentJobId?: string | null;
    externalId?: string | null;
    message?: string | null;
    metadata?: Record<string, unknown>;
}) {
    await recordPlatformEvent(input, {
        supabase: getSupabaseAdmin(),
        failureLogMessage: "failed to write platform event",
    });
}

function refId(value: StripeFinancialAttentionPayload["payment_intent"]) {
    if (!value) return null;
    return typeof value === "string" ? value : value.id ?? null;
}

function financialWebhookAction(eventType: string) {
    return `stripe_${eventType.replaceAll(".", "_")}`;
}

function financialWebhookSeverity(eventType: string): "error" | "critical" {
    return eventType.startsWith("charge.dispute.") ? "critical" : "error";
}

function buildOrderSmsMessage(input: {
    customerName?: string | null;
    orderNumber: string;
}) {
    const greeting = input.customerName ? `Thanks for your order ${input.customerName}.` : "Thanks for your order.";
    return [
        "Merch Tent:",
        greeting,
        `Order ${input.orderNumber} is confirmed.`,
        "We'll send tracking once it ships.",
    ].join(" ");
}

async function findOrderForFinancialWebhook(payload: StripeFinancialAttentionPayload) {
    const paymentIntentId = refId(payload.payment_intent);
    if (!paymentIntentId) return null;

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from("orders")
        .select("id, order_number")
        .eq("stripe_payment_intent", paymentIntentId)
        .maybeSingle();

    if (error) {
        logger.error("Stripe financial webhook order lookup failed", {
            stripe_payment_intent_id: paymentIntentId,
            error: error.message,
        });
        return null;
    }

    return data as { id: string; order_number: string | null } | null;
}

async function recordStripeFinancialEvent(input: {
    event: Stripe.Event;
    payload: StripeFinancialAttentionPayload;
    order: { id: string; order_number: string | null } | null;
    paymentIntentId: string | null;
    chargeId: string | null;
}) {
    const { event, payload, order, paymentIntentId, chargeId } = input;
    const supabaseAdmin = getSupabaseAdmin();
    const severity = financialWebhookSeverity(event.type);
    const { error } = await supabaseAdmin
        .from("stripe_financial_events")
        .upsert(
            {
                stripe_event_id: event.id,
                stripe_event_type: event.type,
                severity,
                order_id: order?.id ?? null,
                order_number: order?.order_number ?? null,
                stripe_payment_intent_id: paymentIntentId,
                stripe_charge_id: chargeId,
                stripe_object_id: payload.id ?? null,
                amount_cents: payload.amount ?? null,
                amount_refunded_cents: payload.amount_refunded ?? null,
                currency: payload.currency?.toUpperCase() ?? null,
                reason: payload.reason ?? null,
                stripe_status: payload.status ?? null,
                failure_code: payload.last_payment_error?.code ?? null,
                failure_message: payload.failure_message ?? payload.last_payment_error?.message ?? null,
                review_status: "open",
                payload: event.data.object as unknown as Record<string, unknown>,
            },
            { onConflict: "stripe_event_id" }
        );

    if (error) {
        failStripeWebhookProcessing("Stripe financial event ledger write failed", {
            event_id: event.id,
            event_type: event.type,
            order_id: order?.id ?? null,
            error: error.message,
        });
    }
}

async function handleFinancialAttentionWebhook(event: Stripe.Event) {
    if (!FINANCIAL_ATTENTION_WEBHOOKS.has(event.type)) {
        return false;
    }

    const payload = event.data.object as StripeFinancialAttentionPayload;
    const order = await findOrderForFinancialWebhook(payload);
    const paymentIntentId = refId(payload.payment_intent);
    const chargeId = refId(payload.charge) ?? (event.type.startsWith("charge.") ? payload.id ?? null : null);

    await recordStripeFinancialEvent({
        event,
        payload,
        order,
        paymentIntentId,
        chargeId,
    });

    await logPlatformEvent({
        scope: "stripe",
        action: financialWebhookAction(event.type),
        severity: financialWebhookSeverity(event.type),
        orderId: order?.id ?? null,
        externalId: payload.id ?? event.id,
        message: `Stripe ${event.type} webhook requires operator review.`,
        metadata: {
            event_id: event.id,
            event_type: event.type,
            order_number: order?.order_number ?? null,
            stripe_payment_intent_id: paymentIntentId,
            stripe_charge_id: chargeId,
            amount: payload.amount ?? null,
            amount_refunded: payload.amount_refunded ?? null,
            currency: payload.currency?.toUpperCase() ?? null,
            reason: payload.reason ?? null,
            status: payload.status ?? null,
            failure_code: payload.last_payment_error?.code ?? null,
            failure_message: payload.failure_message ?? payload.last_payment_error?.message ?? null,
        },
    });

    return true;
}

export async function POST(req: NextRequest) {
    const supabaseAdmin = getSupabaseAdmin();
    const sig = req.headers.get("stripe-signature");
    const rawBody = await req.text();

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            rawBody,
            sig!,
            serverEnv.stripeWebhookSecret()
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Invalid webhook signature";
        logger.warn("Stripe webhook signature validation failed", { error: message });
        return new NextResponse(`Webhook Error: ${message}`, {
            status: 400,
            headers: NO_STORE_HEADERS,
        });
    }

    const ledger = await startWebhookLedger(event);
    if (ledger.alreadyProcessed) {
        return noStoreJson({ ok: true, duplicate: true });
    }

    if (event.type === "account.updated") {
        try {
            await handleStripeAccountUpdated(event);
            await finishWebhookLedger(event.id, "processed");
            return noStoreJson({ ok: true });
        } catch (err) {
            logger.error("Unhandled error in Stripe Connect webhook", {
                event_id: event.id,
                event_type: event.type,
                ...errorContext(err),
            });
            await finishWebhookLedger(event.id, "failed", err);
            return noStoreJson({ ok: false }, { status: 500 });
        }
    }

    if (await handleFinancialAttentionWebhook(event)) {
        await finishWebhookLedger(event.id, "processed");
        return noStoreJson({ ok: true, attention: true });
    }

    // other webhook types are not currently part of a business workflow
    if (event.type !== "checkout.session.completed") {
        await finishWebhookLedger(event.id, "ignored");
        return noStoreJson({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    await logPlatformEvent({
        scope: "stripe",
        action: "checkout_session_received",
        severity: "info",
        externalId: session.id,
        message: "Stripe checkout.session.completed webhook received.",
        metadata: {
            event_id: event.id,
            amount_total: session.amount_total,
            currency: session.currency,
            customer_email_present: Boolean(session.customer_details?.email),
        },
    });

    let orderId: string | null = null;
    let orderNumber: string | null = null;
    let fulfillmentJobId: string | null = null;

    try {
        // 1) fetch full line items so we can read our metadata back
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
            expand: ["data.price.product"],
            limit: STRIPE_WEBHOOK_LINE_ITEM_FETCH_LIMIT,
        });

        const lineItemsData = lineItems.data ?? [];
        if (lineItems.has_more) {
            failStripeWebhookProcessing("Stripe checkout session has more line items than the webhook fetch limit", {
                event_id: event.id,
                stripe_session_id: session.id,
                fetched_line_item_count: lineItemsData.length,
                stripe_webhook_line_item_fetch_limit: STRIPE_WEBHOOK_LINE_ITEM_FETCH_LIMIT,
            });
        }

        // 2) normalize session data for the idempotent database processor
        const stripePaymentIntentId =
            typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id ?? null;

        const rawUserId =
            (session.metadata?.user_id as string | undefined) ?? null;

        const safeUserId = isUuidLike(rawUserId) ? rawUserId : null;

        // 3) collect all product_ids from the line items
        const productIds = Array.from(
            new Set(
                lineItemsData
                    .map((li) => {
                        const pd = li.price?.product as Stripe.Product | string | null;
                        if (!pd || typeof pd === "string") return null;
                        const pid = pd.metadata?.product_id;
                        return pid || null;
                    })
                    .filter(Boolean) as string[]
            )
        );

        // 4) fetch products to get artist_id
        let productsById: Record<string, { artist_id: string | null }> = {};
        if (productIds.length > 0) {
            try {
                const { data: prodRows, error: prodErr } = await supabaseAdmin
                    .from("products")
                    .select("id, artist_id")
                    .in("id", productIds);

                if (prodErr) {
                    failStripeWebhookProcessing("Stripe webhook product lookup failed", {
                        event_id: event.id,
                        stripe_session_id: session.id,
                        product_count: productIds.length,
                        error: prodErr.message,
                    });
                } else {
                    productsById = Object.fromEntries(
                        (prodRows ?? []).map((p) => [p.id, { artist_id: p.artist_id }])
                    );
                }
            } catch (prodEx) {
                failStripeWebhookProcessing("Stripe webhook product lookup exception", {
                    event_id: event.id,
                    stripe_session_id: session.id,
                    product_count: productIds.length,
                    ...errorContext(prodEx),
                });
            }
        }

        const itemsToProcess = lineItemsData
            .filter((li) => li.amount_subtotal > 0)
            .map((li) => {
                const pd = li.price?.product as Stripe.Product | string | null;
                const productMeta =
                    pd && typeof pd !== "string" ? pd.metadata : undefined;
                const product_id = productMeta?.product_id ?? null;
                if (!product_id) return null;

                return {
                    stripe_line_item_id: li.id,
                    product_id,
                    artist_id: productsById[product_id]?.artist_id ?? null,
                    title:
                        pd && typeof pd !== "string" && pd.name
                            ? pd.name
                            : li.description || "Product",
                    qty: li.quantity ?? 1,
                    unit_price_cents: li.price?.unit_amount ?? 0,
                    currency: session.currency?.toUpperCase() ?? "AUD",
                    sku: productMeta?.sku ?? null,
                    color_label: productMeta?.color_label ?? null,
                    size_label: productMeta?.size ?? null,
                    metadata: {
                        stripe_price_id: li.price?.id ?? null,
                        amount_subtotal: li.amount_subtotal ?? null,
                        amount_total: li.amount_total ?? null,
                    },
                };
            })
            .filter(Boolean);

        if (itemsToProcess.length === 0) {
            throw new Error(`Stripe session ${session.id} did not contain product line items`);
        }

        const { data: processedOrder, error: processError } = await supabaseAdmin
            .rpc("process_stripe_checkout_order", {
                p_session: {
                    user_id: safeUserId,
                    email: session.metadata?.email ?? session.customer_details?.email ?? null,
                    stripe_session_id: session.id,
                    stripe_payment_intent: stripePaymentIntentId,
                    subtotal_cents: Number(session.amount_subtotal ?? 0),
                    total_cents: Number(session.amount_total ?? 0),
                    currency: session.currency?.toUpperCase() ?? "AUD",
                    shipping_method: session.metadata?.shippingMethod ?? null,
                    voucher_code: session.metadata?.voucher ?? null,
                    first_name: session.metadata?.first_name ?? null,
                    last_name: session.metadata?.last_name ?? null,
                    line1: session.metadata?.line1 ?? null,
                    line2: session.metadata?.line2 ?? null,
                    city: session.metadata?.city ?? null,
                    state: session.metadata?.state ?? null,
                    postal_code: session.metadata?.postal_code ?? null,
                    country: session.metadata?.country ?? null,
                    phone: session.metadata?.phone ?? null,
                },
                p_items: itemsToProcess,
            })
            .single();

        if (processError) {
            failStripeWebhookProcessing("Stripe checkout order RPC failed", {
                event_id: event.id,
                stripe_session_id: session.id,
                item_count: itemsToProcess.length,
                error: processError.message,
            });
        }

        const typedProcessedOrder = processedOrder as ProcessedOrder;
        orderId = typedProcessedOrder.order_id;
        orderNumber = typedProcessedOrder.order_number ?? orderId;
        fulfillmentJobId = typedProcessedOrder.fulfillment_job_id;

        const creditReservationId = session.metadata?.merch_credit_reservation_id || null;
        if (creditReservationId) {
            try {
                await redeemMerchCreditReservation({
                    reservationId: creditReservationId,
                    orderId,
                });
                await logPlatformEvent({
                    scope: "credits",
                    action: "merch_credit_reservation_redeemed",
                    severity: "info",
                    orderId,
                    fulfillmentJobId,
                    externalId: session.id,
                    message: "Merch credit reservation redeemed after successful checkout.",
                    metadata: {
                        reservation_id: creditReservationId,
                        points: session.metadata?.merch_credit_points ?? null,
                        discount_cents: session.metadata?.merch_credit_discount_cents ?? null,
                    },
                });
            } catch (creditErr) {
                logger.error("Failed to redeem merch credit reservation", {
                    order_id: orderId,
                    fulfillment_job_id: fulfillmentJobId,
                    stripe_session_id: session.id,
                    merch_credit_reservation_id: creditReservationId,
                    ...errorContext(creditErr),
                });
                await logPlatformEvent({
                    scope: "credits",
                    action: "merch_credit_reservation_redemption_failed",
                    severity: "critical",
                    orderId,
                    fulfillmentJobId,
                    externalId: session.id,
                    message: "Paid checkout used a merch credit discount but reservation redemption failed.",
                    metadata: {
                        reservation_id: creditReservationId,
                        error: creditErr instanceof Error ? creditErr.message : String(creditErr),
                    },
                });
            }
        }

        // 6) 🔔 EMAILS VIA POSTMARK (customer + admin)
        try {
            const currency = session.currency?.toUpperCase() ?? "AUD";
            const createdAt = new Date(
                (session.created ?? event.created ?? 0) * 1000
            );

            const shippingMethod =
                (session.metadata?.shippingMethod as string | undefined) ?? null;
            const voucher =
                (session.metadata?.voucher as string | undefined) ?? null;

            let shipping_cents = 0;
            if (shippingMethod === "standard") shipping_cents = 1050;
            if (shippingMethod === "express") shipping_cents = 1700;

            const subtotal_incl_shipping = Number(session.amount_subtotal ?? 0);
            const subtotal_cents = Math.max(
                subtotal_incl_shipping - shipping_cents,
                0
            );

            const discount_cents = Number(session.total_details?.amount_discount ?? 0);

            const emailItems: OrderEmailItem[] = lineItemsData
                .map((li) => {
                    const qty = li.quantity ?? 1;
                    const lineSubtotalCents = li.amount_subtotal ?? 0;
                    const unitCents =
                        qty > 0 ? Math.round(lineSubtotalCents / qty) : lineSubtotalCents;

                    const product = li.price?.product as
                        | Stripe.Product
                        | string
                        | null;

                    const productName =
                        product && typeof product !== "string" && product.name
                            ? product.name
                            : li.description || "Item";

                    const productMeta =
                        product && typeof product !== "string"
                            ? product.metadata
                            : undefined;

                    const product_id = productMeta?.product_id || undefined;
                    if (!product_id) return null; // skip shipping / non-product lines

                    const rawColorLabel = productMeta?.color_label;
                    const rawSku = productMeta?.sku;

                    let size: string | null = null;
                    if (rawSku) {
                        const parts = rawSku.split("-");
                        if (parts.length >= 3 && parts[1]) {
                            size = parts[1];
                        }
                    }

                    const fmt = (cents: number) =>
                        (cents / 100).toLocaleString("en-AU", {
                            style: "currency",
                            currency,
                        });

                    return {
                        title: productName,
                        qty,
                        unit_price: fmt(unitCents),
                        line_total: fmt(lineSubtotalCents),
                        size,
                        color_label: rawColorLabel ?? null,
                        sku: rawSku ?? null,
                        product_id,
                    } satisfies OrderEmailItem;
                })
                .filter(Boolean) as OrderEmailItem[];

            const first_name = session.metadata?.first_name ?? "";
            const last_name = session.metadata?.last_name ?? "";
            const customer_name =
                (first_name || last_name
                    ? `${first_name} ${last_name}`.trim()
                    : null) ?? null;

            const customer_email =
                (session.customer_details?.email ??
                    (session.customer_email as string | undefined) ??
                    null) ?? null;

            const shipping_address_1 = session.metadata?.line1 ?? null;
            const shipping_address_2 = session.metadata?.line2 ?? null;
            const shipping_city = session.metadata?.city ?? null;
            const shipping_state = session.metadata?.state ?? null;
            const shipping_postcode = session.metadata?.postal_code ?? null;
            const shipping_country = session.metadata?.country ?? null;

            const payment_method = "Stripe";
            const last4 = null;

            const stripe_session_id = session.id;
            const stripe_payment_intent_id = stripePaymentIntentId;

            // Use orderId if we have it, otherwise fall back to session.id
            //const order_number = String(orderId ?? session.id);

            const order_number = orderNumber ?? session.id;

            const payload = buildOrderEmailPayloadFromStripe({
                order_number,
                createdAt,
                currency,
                subtotal_cents,
                shipping_cents,
                discount_cents,
                shipping_method: shippingMethod,
                voucher,

                customer_name,
                customer_email,

                shipping_address_1,
                shipping_address_2,
                shipping_city,
                shipping_state,
                shipping_postcode,
                shipping_country,

                payment_method,
                last4,
                stripe_session_id,
                stripe_payment_intent_id,

                notes: null,
                items: emailItems,
            });

            if (!orderId) throw new Error("order id missing before email notification");

            const emailKey = `order:${orderId}:email:confirmation`;
            const shouldSendEmail = await reserveNotificationDelivery({
                orderId,
                channel: "email",
                recipient: customer_email,
                idempotencyKey: emailKey,
                provider: "postmark",
            });

            if (shouldSendEmail) {
                await sendOrderEmails({
                    customerEmail: customer_email,
                    payload,
                });
                await finishNotificationDelivery(emailKey, "sent");
            }
        } catch (emailErr) {
            logger.error("Failed to send Postmark order emails", {
                order_id: orderId,
                fulfillment_job_id: fulfillmentJobId,
                stripe_session_id: session.id,
                ...errorContext(emailErr),
            });
            if (orderId) {
                await finishNotificationDelivery(`order:${orderId}:email:confirmation`, "failed", emailErr);
                await logPlatformEvent({
                    scope: "notifications",
                    action: "order_email_failed",
                    severity: "warning",
                    orderId,
                    fulfillmentJobId,
                    externalId: session.id,
                    message: "Order email failed after checkout processing.",
                    metadata: { error: emailErr instanceof Error ? emailErr.message : String(emailErr) },
                });
            }
        }

        // 7) Send SMS confirmation
        try {

            const phone = normalisePhone(session.metadata?.phone);

            if (phone) {

                const order_number = orderNumber ?? session.id;

                const first_name = session.metadata?.first_name ?? "";
                const last_name = session.metadata?.last_name ?? "";

                const customer_name =
                    (first_name || last_name
                        ? `${first_name} ${last_name}`.trim()
                        : null) ?? null;

                const smsMessage = buildOrderSmsMessage({
                    customerName: customer_name,
                    orderNumber: order_number,
                });

                if (!orderId) throw new Error("order id missing before SMS notification");

                const smsKey = `order:${orderId}:sms:confirmation`;
                const shouldSendSms = await reserveNotificationDelivery({
                    orderId,
                    channel: "sms",
                    recipient: phone,
                    idempotencyKey: smsKey,
                    provider: "mobilemessage",
                });

                if (shouldSendSms) {
                    await sendSms(phone, smsMessage);
                    await finishNotificationDelivery(smsKey, "sent");
                }
            }

        } catch (smsErr) {
            logger.error("Failed to send order SMS", {
                order_id: orderId,
                fulfillment_job_id: fulfillmentJobId,
                stripe_session_id: session.id,
                ...errorContext(smsErr),
            });
            if (orderId) {
                await finishNotificationDelivery(`order:${orderId}:sms:confirmation`, "failed", smsErr);
                await logPlatformEvent({
                    scope: "notifications",
                    action: "order_sms_failed",
                    severity: "warning",
                    orderId,
                    fulfillmentJobId,
                    externalId: session.id,
                    message: "Order SMS failed after checkout processing.",
                    metadata: { error: smsErr instanceof Error ? smsErr.message : String(smsErr) },
                });
            }
        }

    } catch (err) {
        logger.error("Unhandled error in Stripe checkout webhook", {
            order_id: orderId,
            fulfillment_job_id: fulfillmentJobId,
            stripe_session_id: session.id,
            event_id: event.id,
            ...errorContext(err),
        });
        await logPlatformEvent({
            scope: "stripe",
            action: "checkout_session_failed",
            severity: "critical",
            orderId,
            fulfillmentJobId,
            externalId: session.id,
            message: "Stripe checkout webhook failed before all critical invariants were completed.",
            metadata: { error: err instanceof Error ? err.message : String(err) },
        });
        await finishWebhookLedger(event.id, "failed", err);
        return noStoreJson({ ok: false }, { status: 500 });
    }

    await finishWebhookLedger(event.id, "processed");
    return noStoreJson({ ok: true });
}
