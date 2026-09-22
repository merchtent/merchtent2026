// app/api/test-basic-postmark/route.ts
import { NextRequest } from "next/server";
import { ServerClient } from "postmark";
import {
    renderAdminOrderEmail,
    renderCustomerOrderEmail,
} from "@/lib/email/order-emails";
import { buildOrderEmailPayloadFromStripe } from "@/lib/postmark";
import { noStoreJson } from "@/lib/api/no-store";
import { rejectCrossOriginRequest } from "@/lib/auth/request-origin";
import { serverEnv } from "@/lib/env.server";
import { getErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { checkDurableRateLimit } from "@/lib/rate-limit";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    if (process.env.NODE_ENV === "production") {
        return noStoreJson({ error: "Not found" }, { status: 404 });
    }

    const originError = rejectCrossOriginRequest(req);
    if (originError) return originError;

    const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "unknown";
    const supabase = getPublicServerSupabase();
    const allowed = await checkDurableRateLimit(
        supabase,
        `postmark-test:${ip}`,
        3,
        60_000,
        "check_public_rate_limit",
        { fallback: "deny" }
    );

    if (!allowed) {
        return noStoreJson({ error: "Too many attempts." }, { status: 429 });
    }

    const secret = req.headers.get("x-postmark-test-secret");
    const expectedSecret = serverEnv.postmarkTestSecret();
    if (!expectedSecret || secret !== expectedSecret) {
        return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const serverToken = serverEnv.optionalPostmarkServerToken();
    const from = serverEnv.optionalPostmarkFrom();
    const to =
        serverEnv.postmarkTestCustomerEmail() ||
        serverEnv.optionalPostmarkAdminTo() ||
        null;

    if (!serverToken || !from || !to) {
        return noStoreJson(
            {
                error: "Missing POSTMARK_SERVER_TOKEN, POSTMARK_FROM, or recipient email.",
            },
            { status: 500 }
        );
    }

    const client = new ServerClient(serverToken);

    try {
        const payload = buildOrderEmailPayloadFromStripe({
            order_number: "TEST-ORDER-1234",
            createdAt: new Date(),
            currency: "AUD",
            subtotal_cents: 7800,
            shipping_cents: 1000,
            discount_cents: 0,
            shipping_method: "Standard shipping",
            voucher: null,
            customer_name: "Test Customer",
            customer_email: to,
            shipping_address_1: "123 Test Street",
            shipping_address_2: null,
            shipping_city: "Melbourne",
            shipping_state: "VIC",
            shipping_postcode: "3000",
            shipping_country: "Australia",
            payment_method: "Stripe",
            last4: "4242",
            stripe_session_id: null,
            stripe_payment_intent_id: null,
            notes: null,
            items: [
                {
                    title: "Local Noise Classic Tee",
                    qty: 2,
                    unit_price: "A$39.00",
                    line_total: "A$78.00",
                    size: "L",
                    color_label: "Black",
                    sku: "TEST-TEE-BLK-L",
                    product_id: "test-product",
                },
            ],
        });
        const customerEmail = renderCustomerOrderEmail(payload, {
            siteUrl: serverEnv.siteUrl(),
            assetBaseUrl: serverEnv.emailAssetBaseUrl(),
        });
        const adminEmail = renderAdminOrderEmail(payload, {
            siteUrl: serverEnv.siteUrl(),
            assetBaseUrl: serverEnv.emailAssetBaseUrl(),
        });
        const responses = await Promise.all([
            client.sendEmail({
                From: from,
                To: to,
                ReplyTo: serverEnv.postmarkSupportEmail(),
                Subject: `[SAMPLE] ${customerEmail.subject}`,
                HtmlBody: customerEmail.htmlBody,
                TextBody: customerEmail.textBody,
                MessageStream: "outbound",
                Tag: "order-confirmation-test",
            }),
            client.sendEmail({
                From: from,
                To: to,
                ReplyTo: serverEnv.postmarkSupportEmail(),
                Subject: `[SAMPLE] ${adminEmail.subject}`,
                HtmlBody: adminEmail.htmlBody,
                TextBody: adminEmail.textBody,
                MessageStream: "outbound",
                Tag: "order-admin-test",
            }),
        ]);

        return noStoreJson({
            ok: true,
            to,
            postmarkMessageIds: responses.map((response) => response.MessageID),
        });
    } catch (err: unknown) {
        logger.error("Postmark basic test failed", {
            error: getErrorMessage(err, String(err)),
        });
        return noStoreJson(
            {
                error: "Failed to send Postmark test email",
            },
            { status: 500 }
        );
    }
}
