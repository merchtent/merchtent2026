// lib/postmark.ts
import { ServerClient } from "postmark";
import { serverEnv } from "@/lib/env.server";
import { logger } from "@/lib/logger";

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

const POSTMARK_SERVER_TOKEN = serverEnv.optionalPostmarkServerToken();
const POSTMARK_FROM = serverEnv.optionalPostmarkFrom();
const POSTMARK_CUSTOMER_TEMPLATE_ALIAS = serverEnv.postmarkCustomerTemplateAlias();
const POSTMARK_ADMIN_TEMPLATE_ALIAS = serverEnv.postmarkAdminTemplateAlias();
const POSTMARK_ADMIN_TO = serverEnv.optionalPostmarkAdminTo();

// optional convenience envs
const STORE_NAME = serverEnv.storeName();
const COMPANY_ADDRESS = serverEnv.companyAddress();
const MANAGE_ORDERS_URL = serverEnv.manageOrdersUrl();
const POSTMARK_SUPPORT_EMAIL = serverEnv.postmarkSupportEmail() || POSTMARK_FROM;

// single shared client (or null if not configured)
const client = POSTMARK_SERVER_TOKEN
    ? new ServerClient(POSTMARK_SERVER_TOKEN)
    : null;

type OrderEmailChannel = "customer" | "admin";

type OrderEmailSendTask = {
    channel: OrderEmailChannel;
    required: boolean;
    send: Promise<unknown>;
};

if (!POSTMARK_SERVER_TOKEN) {
    logger.warn("POSTMARK_SERVER_TOKEN not set; order emails will be skipped.");
}

if (!POSTMARK_FROM) {
    logger.warn("POSTMARK_FROM not set; order emails will be skipped.");
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
        logger.warn("Postmark client not configured; skipping order emails.", {
            has_from: Boolean(POSTMARK_FROM),
            has_server_token: Boolean(POSTMARK_SERVER_TOKEN),
        });
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

    const sends: OrderEmailSendTask[] = [];

    if (customerEmail && POSTMARK_CUSTOMER_TEMPLATE_ALIAS) {
        sends.push({
            channel: "customer",
            required: true,
            send: client.sendEmailWithTemplate({
                From: POSTMARK_FROM,
                To: customerEmail,
                TemplateAlias: POSTMARK_CUSTOMER_TEMPLATE_ALIAS,
                TemplateModel: model, // <<— NO extra nesting, no renaming
            }),
        });
    } else if (customerEmail) {
        logger.error("Postmark customer template alias is not configured.", {
            has_customer_email: true,
        });
        throw new Error("Postmark customer email is not configured.");
    }

    if (POSTMARK_ADMIN_TO && POSTMARK_ADMIN_TEMPLATE_ALIAS) {
        sends.push({
            channel: "admin",
            required: false,
            send: client.sendEmailWithTemplate({
                From: POSTMARK_FROM,
                To: POSTMARK_ADMIN_TO,
                TemplateAlias: POSTMARK_ADMIN_TEMPLATE_ALIAS,
                TemplateModel: {
                    ...model,
                    // you can add admin-specific fields here if you like
                    admin: true,
                },
            }),
        });
    }

    if (!sends.length) {
        logger.warn("No valid Postmark aliases or recipients configured; skipping order emails.", {
            has_customer_email: Boolean(customerEmail),
            has_customer_template: Boolean(POSTMARK_CUSTOMER_TEMPLATE_ALIAS),
            has_admin_to: Boolean(POSTMARK_ADMIN_TO),
            has_admin_template: Boolean(POSTMARK_ADMIN_TEMPLATE_ALIAS),
        });
        return;
    }

    const results = await Promise.allSettled(sends.map((task) => task.send));
    const failures = results
        .map((result, index) => ({ result, task: sends[index] }))
        .filter(
            (entry): entry is {
                result: PromiseRejectedResult;
                task: OrderEmailSendTask;
            } => entry.result.status === "rejected"
        );

    for (const failure of failures) {
        const severity = failure.task.required ? "error" : "warn";
        logger[severity]("Postmark order email send failed.", {
            channel: failure.task.channel,
            required: failure.task.required,
            error:
                failure.result.reason instanceof Error
                    ? failure.result.reason.message
                    : String(failure.result.reason),
        });
    }

    if (failures.some((failure) => failure.task.required)) {
        throw new Error("Postmark customer order email failed.");
    }
}
