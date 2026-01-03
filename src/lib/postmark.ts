// lib/postmark.ts
import { ServerClient } from "postmark";

/**
 * One order line for the email.
 * Matches your Postmark template: {{#items}} ... {{/items}}
 */
export type OrderEmailItem = {
    title: string;
    qty: number;
    unit_price: string;   // e.g. "A$30.00"
    line_total: string;   // e.g. "A$60.00"
    size: string | null;
    color_label: string | null;
    sku: string | null;
    product_id: string;
};

/**
 * Top-level payload for the email.
 * Field names MUST match exactly what the template uses.
 */
export type OrderEmailPayload = {
    order_number: string;
    order_date: string;

    subtotal: string;
    shipping_amount: string;
    discount_amount: string | null;
    total: string;

    shipping_method: string | null;

    customer_name: string | null;
    customer_email: string | null;

    shipping_address_1: string | null;
    shipping_address_2: string | null;
    shipping_city: string | null;
    shipping_state: string | null;
    shipping_postcode: string | null;
    shipping_country: string | null;

    payment_method: string | null;
    last4: string | null;

    support_email: string | null;
    store_name: string | null;
    company_address: string | null;
    manage_orders_url: string | null;

    items: OrderEmailItem[];
};

// ---- Postmark client wiring ----

const POSTMARK_SERVER_TOKEN = process.env.POSTMARK_SERVER_TOKEN || "";
const POSTMARK_FROM = process.env.POSTMARK_FROM || "";
const POSTMARK_CUSTOMER_TEMPLATE_ALIAS =
    process.env.POSTMARK_CUSTOMER_TEMPLATE_ALIAS || "order-confirmation";
const POSTMARK_ADMIN_TEMPLATE_ALIAS =
    process.env.POSTMARK_ADMIN_TEMPLATE_ALIAS || "order-admin-notify";
const POSTMARK_ADMIN_TO = process.env.POSTMARK_ADMIN_TO || "";

// optional convenience envs
const STORE_NAME = process.env.STORE_NAME || "Merch Tent";
const COMPANY_ADDRESS = process.env.COMPANY_ADDRESS || null;
const MANAGE_ORDERS_URL = process.env.MANAGE_ORDERS_URL || null;
const POSTMARK_SUPPORT_EMAIL =
    process.env.POSTMARK_SUPPORT_EMAIL || POSTMARK_FROM || null;

// single shared client (or null if not configured)
const client = POSTMARK_SERVER_TOKEN
    ? new ServerClient(POSTMARK_SERVER_TOKEN)
    : null;

if (!POSTMARK_SERVER_TOKEN) {
    console.warn("⚠️ POSTMARK_SERVER_TOKEN not set – emails will be skipped.");
}

if (!POSTMARK_FROM) {
    console.warn("⚠️ POSTMARK_FROM not set – emails will be skipped.");
}

/**
 * Build a payload from raw Stripe-ish values.
 * This is just a helper; you already use this in your webhook + test route.
 */
export function buildOrderEmailPayloadFromStripe(args: {
    order_number: string;
    createdAt: Date;
    currency: string;

    subtotal_cents: number;
    shipping_cents: number;
    discount_cents: number;

    shipping_method: string | null;
    voucher: string | null;

    customer_name: string | null;
    customer_email: string | null;

    shipping_address_1: string | null;
    shipping_address_2: string | null;
    shipping_city: string | null;
    shipping_state: string | null;
    shipping_postcode: string | null;
    shipping_country: string | null;

    payment_method: string | null;
    last4: string | null;

    stripe_session_id: string | null;
    stripe_payment_intent_id: string | null;

    notes: string | null;
    items: OrderEmailItem[];
}): OrderEmailPayload {
    const {
        order_number,
        createdAt,
        currency,
        subtotal_cents,
        shipping_cents,
        discount_cents,
        shipping_method,
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
        items,
    } = args;

    const fmt = (cents: number) =>
        (cents / 100).toLocaleString("en-AU", {
            style: "currency",
            currency,
        });

    const subtotal = fmt(subtotal_cents);
    const shipping_amount = fmt(shipping_cents);
    const discount_amount =
        discount_cents > 0 ? fmt(discount_cents) : null;
    const total = fmt(subtotal_cents + shipping_cents - discount_cents);

    // "19 Nov 2025" style
    const order_date = createdAt.toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });

    return {
        order_number,
        order_date,

        subtotal,
        shipping_amount,
        discount_amount,
        total,

        shipping_method,

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

        support_email: POSTMARK_SUPPORT_EMAIL,
        store_name: STORE_NAME,
        company_address: COMPANY_ADDRESS,
        manage_orders_url: MANAGE_ORDERS_URL,

        // 👉 IMPORTANT: pass items straight through
        items,
    };
}

/**
 * Actually send both emails (customer + admin) using the SAME TemplateModel.
 */
export async function sendOrderEmails(args: {
    customerEmail: string | null;
    payload: OrderEmailPayload;
}) {
    const { customerEmail, payload } = args;

    if (!client || !POSTMARK_FROM) {
        console.log("POSTMARK_FROM or SERVER_TOKEN not set – skipping all order emails.");
        return;
    }

    // Flatten + ensure defaults for meta fields
    const model: OrderEmailPayload = {
        ...payload,
        support_email: payload.support_email ?? POSTMARK_SUPPORT_EMAIL,
        store_name: payload.store_name ?? STORE_NAME,
        company_address: payload.company_address ?? COMPANY_ADDRESS,
        manage_orders_url: payload.manage_orders_url ?? MANAGE_ORDERS_URL,
        items: payload.items ?? [],
    };

    // 👀 debug: you can uncomment this temporarily
    // console.log("🔎 Final TemplateModel sent to Postmark:", JSON.stringify(model, null, 2));

    const sends: Promise<unknown>[] = [];

    if (customerEmail && POSTMARK_CUSTOMER_TEMPLATE_ALIAS) {
        sends.push(
            client.sendEmailWithTemplate({
                From: POSTMARK_FROM,
                To: customerEmail,
                TemplateAlias: POSTMARK_CUSTOMER_TEMPLATE_ALIAS,
                TemplateModel: model, // <<— NO extra nesting, no renaming
            })
        );
    }

    if (POSTMARK_ADMIN_TO && POSTMARK_ADMIN_TEMPLATE_ALIAS) {
        sends.push(
            client.sendEmailWithTemplate({
                From: POSTMARK_FROM,
                To: POSTMARK_ADMIN_TO,
                TemplateAlias: POSTMARK_ADMIN_TEMPLATE_ALIAS,
                TemplateModel: {
                    ...model,
                    // you can add admin-specific fields here if you like
                    admin: true,
                },
            })
        );
    }

    if (!sends.length) {
        console.log("No valid Postmark aliases or recipients configured – nothing to send.");
        return;
    }

    await Promise.all(sends);
}
