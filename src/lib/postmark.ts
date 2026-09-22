// lib/postmark.ts
import { ServerClient } from "postmark";
import { serverEnv } from "@/lib/env.server";
import { logger } from "@/lib/logger";
import {
    renderAdminOrderEmail,
    renderCustomerOrderEmail,
} from "@/lib/email/order-emails";
import type {
    OrderEmailItem,
    OrderEmailPayload,
} from "@/lib/email/order-email-types";

export type { OrderEmailItem, OrderEmailPayload } from "@/lib/email/order-email-types";

// ---- Postmark client wiring ----

const POSTMARK_SERVER_TOKEN = serverEnv.optionalPostmarkServerToken();
const POSTMARK_FROM = serverEnv.optionalPostmarkFrom();
const POSTMARK_ADMIN_TO = serverEnv.optionalPostmarkAdminTo();

// optional convenience envs
const STORE_NAME = serverEnv.storeName();
const COMPANY_ADDRESS = serverEnv.companyAddress();
const MANAGE_ORDERS_URL = serverEnv.manageOrdersUrl();
const POSTMARK_SUPPORT_EMAIL = serverEnv.postmarkSupportEmail() || POSTMARK_FROM;
const SITE_URL = serverEnv.siteUrl();
const EMAIL_ASSET_BASE_URL = serverEnv.emailAssetBaseUrl();

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

/** Send the branded customer receipt and optional internal order alert. */
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

    if (customerEmail) {
        const email = renderCustomerOrderEmail(model, {
            siteUrl: SITE_URL,
            assetBaseUrl: EMAIL_ASSET_BASE_URL,
        });
        sends.push({
            channel: "customer",
            required: true,
            send: client.sendEmail({
                From: POSTMARK_FROM,
                To: customerEmail,
                ReplyTo: POSTMARK_SUPPORT_EMAIL ?? undefined,
                Subject: email.subject,
                HtmlBody: email.htmlBody,
                TextBody: email.textBody,
                MessageStream: "outbound",
                Tag: "order-confirmation",
            }),
        });
    }

    if (POSTMARK_ADMIN_TO) {
        const email = renderAdminOrderEmail(model, {
            siteUrl: SITE_URL,
            assetBaseUrl: EMAIL_ASSET_BASE_URL,
        });
        sends.push({
            channel: "admin",
            required: false,
            send: client.sendEmail({
                From: POSTMARK_FROM,
                To: POSTMARK_ADMIN_TO,
                ReplyTo: POSTMARK_SUPPORT_EMAIL ?? undefined,
                Subject: email.subject,
                HtmlBody: email.htmlBody,
                TextBody: email.textBody,
                MessageStream: "outbound",
                Tag: "order-admin-notify",
            }),
        });
    }

    if (!sends.length) {
        logger.warn("No valid Postmark recipients configured; skipping order emails.", {
            has_customer_email: Boolean(customerEmail),
            has_admin_to: Boolean(POSTMARK_ADMIN_TO),
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
