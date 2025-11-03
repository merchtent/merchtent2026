// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // needs service role to insert
    { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
    const sig = req.headers.get("stripe-signature");

    let event: Stripe.Event;
    const rawBody = await req.text();

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

    // 1) fetch full line items so we can read our metadata back
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        expand: ["data.price.product"],
        limit: 100,
    });

    // 2) create / upsert order first
    // you can decide your own order id – I'll let PG make it
    const { data: orderRow, error: orderErr } = await supabaseAdmin
        .from("orders")
        .insert({
            user_id: session.metadata?.user_id ?? null,
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent ?? null,
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
        return NextResponse.json({ error: "failed to insert order" }, { status: 500 });
    }

    const orderId = orderRow.id;

    // 3) collect all product_ids from the line items
    //    (we stored them in product_data.metadata.product_id)
    const lineItemsData = lineItems.data ?? [];
    const productIds = Array.from(
        new Set(
            lineItemsData
                .map((li) => {
                    const pd = (li.price?.product as Stripe.Product | null) ?? null;
                    const pid = pd?.metadata?.product_id;
                    return pid || null;
                })
                .filter(Boolean) as string[]
        )
    );

    // 4) fetch products to get artist_id
    let productsById: Record<string, { artist_id: string | null }> = {};
    if (productIds.length > 0) {
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
    }

    // 5) insert order_items for each line
    const itemsToInsert = lineItemsData
        .filter((li) => li.amount_subtotal > 0) // skip zero lines if any
        .map((li) => {
            const pd = (li.price?.product as Stripe.Product | null) ?? null;
            const product_id = pd?.metadata?.product_id ?? null;
            const sku = pd?.metadata?.sku ?? null;
            const color_label = pd?.metadata?.color_label ?? null;

            const artist_id =
                product_id && productsById[product_id]
                    ? productsById[product_id].artist_id
                    : null;

            return {
                order_id: orderId,
                product_id,
                artist_id, // 👈 THIS is the bit your dashboard needs
                title: pd?.name ?? "Product",
                qty: li.quantity ?? 1,
                unit_price_cents: li.price?.unit_amount ?? 0,
                currency: session.currency?.toUpperCase() ?? "AUD",
                sku,
                color_label,
            };
        });

    if (itemsToInsert.length > 0) {
        const { error: itemsErr } = await supabaseAdmin
            .from("order_items")
            .insert(itemsToInsert);

        if (itemsErr) {
            console.error("❌ failed to insert order_items", itemsErr);
            // we still return 200 so Stripe doesn’t retry forever, or you can return 500 if you prefer
        }
    }

    return NextResponse.json({ ok: true });
}
