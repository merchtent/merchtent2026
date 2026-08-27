// app/api/test-basic-postmark/route.ts
import { NextRequest } from "next/server";
import { ServerClient } from "postmark";
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
        const response = await client.sendEmailWithTemplate({
            From: from,
            To: to,
            TemplateAlias: "order-confirmation", // <-- make sure this matches your Postmark template alias
            TemplateModel: {
                order_number: "TEST-ORDER-1234",
                store_name: serverEnv.storeName(),
            },
        });

        return noStoreJson({
            ok: true,
            to,
            postmarkMessageId: response.MessageID,
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
