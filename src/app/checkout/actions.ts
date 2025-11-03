// app/checkout/actions.ts
"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function placeOrderAndGoToStripe(formData: FormData) {
    const supabase = getServerSupabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Not signed in" };
    }

    // 👇 this comes from the client (CheckoutFormClient + CartProvider)
    const rawCart = formData.get("cart_json") as string | null;
    const cartItems: Array<{
        product_id: string;
        title: string;
        price_cents: number;
        currency: string;
        image_path?: string | null;
        sku?: string | null;
        color_label?: string | null;
        size?: string | null;
        qty: number;
    }> = rawCart ? JSON.parse(rawCart) : [];

    if (!cartItems.length) {
        return { error: "Your cart is empty" };
    }

    // shipping + voucher
    const shippingMethod = String(formData.get("shipping_method") || "standard");
    const voucher = String(formData.get("voucher") || "").trim();

    let shippingAmountCents = 1000;
    if (shippingMethod === "express") shippingAmountCents = 2000;

    const currency = cartItems[0]?.currency || "AUD";

    // 👉 build REAL Stripe line items from the local cart
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = cartItems.map(
        (item) => ({
            quantity: item.qty ?? 1,
            price_data: {
                currency,
                unit_amount: item.price_cents,
                product_data: {
                    name: item.title,
                    // 👇 THIS is fine – small, per-line, < 500 chars
                    metadata: {
                        product_id: item.product_id,
                        sku: item.sku ?? "",
                        color_label: item.color_label ?? "",
                        size: item.size ?? "",
                    },
                },
            },
        })
    );

    // add shipping as a line item
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

    // ❗️IMPORTANT: DO NOT PUT cart_json in Stripe metadata
    // Stripe limit is 500 chars *per value* and cart JSON will blow it up.

    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items,
        customer_email: String(formData.get("email") || ""),
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout`,
        metadata: {
            user_id: user.id,
            shippingMethod,
            voucher,
            // the rest we slice to be safe
            first_name: String(formData.get("first_name") || "").slice(0, 500),
            last_name: String(formData.get("last_name") || "").slice(0, 500),
            line1: String(formData.get("line1") || "").slice(0, 500),
            line2: String(formData.get("line2") || "").slice(0, 500),
            city: String(formData.get("city") || "").slice(0, 500),
            state: String(formData.get("state") || "").slice(0, 500),
            postal_code: String(formData.get("postal_code") || "").slice(0, 500),
            country: String(formData.get("country") || "").slice(0, 500),
            phone: String(formData.get("phone") || "").slice(0, 500),
        },
    });

    return { url: session.url };
}
