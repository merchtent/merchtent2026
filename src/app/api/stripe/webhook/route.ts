// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
    sendOrderEmails,
    buildOrderEmailPayloadFromStripe,
    type OrderEmailItem,
} from "@/lib/postmark";

function isUuidLike(s: string | null | undefined): s is string {
    if (!s) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        s
    );
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // needs service role to insert
    { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
    const sig = req.headers.get("stripe-signature");
    const rawBody = await req.text();

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            rawBody,
            sig!,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err: any) {
        console.error("❌ Webhook signature failed:", err.message);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // we only care about completed checkout
    if (event.type !== "checkout.session.completed") {
        return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    console.log("⚡ checkout.session.completed", {
        sessionId: session.id,
        amount_total: session.amount_total,
    });

    // default: if DB insert fails, we fall back to the Stripe session ID
    let orderId: string | number | null = null;

    try {
        // 1) fetch full line items so we can read our metadata back
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
            expand: ["data.price.product"],
            limit: 100,
        });

        const lineItemsData = lineItems.data ?? [];

        // 2) create / upsert order first
        const stripePaymentIntentId =
            typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id ?? null;

        const rawUserId =
            (session.metadata?.user_id as string | undefined) ?? null;

        const safeUserId = isUuidLike(rawUserId) ? rawUserId : null;

        try {
            const { data: orderRow, error: orderErr } = await supabaseAdmin
                .from("orders")
                .insert({
                    user_id: safeUserId,
                    email: session.metadata?.email ?? null,
                    stripe_session_id: session.id,
                    stripe_payment_intent: stripePaymentIntentId,
                    subtotal_cents: Number(session.amount_subtotal ?? 0),
                    total_cents: Number(session.amount_total ?? 0),
                    currency: session.currency?.toUpperCase() ?? "AUD",
                    shipping_method: session.metadata?.shippingMethod ?? null,
                    voucher_code: session.metadata?.voucher ?? null,
                    // store address-ish stuff
                    first_name: session.metadata?.first_name ?? null,
                    last_name: session.metadata?.last_name ?? null,
                    line1: session.metadata?.line1 ?? null,
                    line2: session.metadata?.line2 ?? null,
                    city: session.metadata?.city ?? null,
                    state: session.metadata?.state ?? null,
                    postal_code: session.metadata?.postal_code ?? null,
                    country: session.metadata?.country ?? null,
                    phone: session.metadata?.phone ?? null,
                })
                .select("id")
                .single();

            if (orderErr) {
                console.error("❌ failed to insert order", orderErr);
            } else {
                orderId = orderRow.id;
            }
        } catch (dbErr) {
            console.error("❌ Exception inserting order row", dbErr);
        }

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
                    console.warn("⚠️ failed to fetch products for order_items", prodErr);
                } else {
                    productsById = Object.fromEntries(
                        (prodRows ?? []).map((p) => [p.id, { artist_id: p.artist_id }])
                    );
                }
            } catch (prodEx) {
                console.error("❌ Exception fetching products", prodEx);
            }
        }

        // 5) insert order_items for each line – only if we actually have an orderId
        if (orderId != null) {
            const itemsToInsert = lineItemsData
                .filter((li) => li.amount_subtotal > 0) // skip zero lines if any
                .map((li) => {
                    const pd = li.price?.product as Stripe.Product | string | null;
                    const productMeta =
                        pd && typeof pd !== "string" ? pd.metadata : undefined;
                    const product_id = productMeta?.product_id ?? null;
                    const sku = productMeta?.sku ?? null;
                    const color_label = productMeta?.color_label ?? null;

                    const artist_id =
                        product_id && productsById[product_id]
                            ? productsById[product_id].artist_id
                            : null;

                    return {
                        order_id: orderId,
                        product_id,
                        artist_id,
                        title:
                            pd && typeof pd !== "string" && pd.name ? pd.name : "Product",
                        qty: li.quantity ?? 1,
                        unit_price_cents: li.price?.unit_amount ?? 0,
                        currency: session.currency?.toUpperCase() ?? "AUD",
                        sku,
                        color_label,
                    };
                });

            if (itemsToInsert.length > 0) {
                try {
                    const { error: itemsErr } = await supabaseAdmin
                        .from("order_items")
                        .insert(itemsToInsert);

                    if (itemsErr) {
                        console.error("❌ failed to insert order_items", itemsErr);
                    }
                } catch (itemsEx) {
                    console.error("❌ Exception inserting order_items", itemsEx);
                }
            }
        } else {
            console.warn(
                "⚠️ Skipping order_items insert because orderId is null (order insert failed)"
            );
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

            const discount_cents = 0;

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
            const order_number = String(orderId ?? session.id);

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

            await sendOrderEmails({
                customerEmail: customer_email,
                payload,
            });
        } catch (emailErr) {
            console.error("⚠️ Failed to send Postmark emails", emailErr);
            // don't throw – we still want 200 to Stripe
        }
    } catch (err) {
        // If *anything* above escaped, we log it but still acknowledge the webhook
        console.error("❌ Unhandled error in Stripe webhook", err);
    }

    // ✅ Always acknowledge the webhook (after signature + type check)
    return NextResponse.json({ ok: true });
}
