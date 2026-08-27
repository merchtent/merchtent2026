// app/api/subscribe/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";
import { noStoreJson } from "@/lib/api/no-store";
import { logger } from "@/lib/logger";
import { checkDurableRateLimit } from "@/lib/rate-limit";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";
import { rejectCrossOriginRequest } from "@/lib/auth/request-origin";

const subscribeSchema = z.object({
    email: z.string().email().max(320),
    name: z.string().max(200).nullish(),
    source: z.string().max(100).nullish(),
    utm: z.string().max(500).nullish(),
    consent: z.boolean().optional(),
});

export async function POST(req: Request) {
    try {
        const originRejection = rejectCrossOriginRequest(req);
        if (originRejection) return originRejection;

        const ip =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            "unknown";

        const supabase = getPublicServerSupabase();

        if (!(await checkDurableRateLimit(supabase, `newsletter:${ip}`, 10, 60_000, "check_public_rate_limit", { fallback: "deny" }))) {
            return noStoreJson({ ok: true });
        }

        const parsed = subscribeSchema.safeParse(await req.json().catch(() => ({})));
        if (!parsed.success) {
            return noStoreJson({ error: "Invalid subscription details" }, { status: 400 });
        }

        const { email, name, source, utm, consent } = parsed.data;
        const { error } = await supabase.rpc("public_subscribe_newsletter", {
            p_email: email,
            p_name: name ?? null,
            p_source: source ?? null,
            p_utm: utm ?? null,
            p_consent: consent ?? true,
        });

        if (error) {
            logger.error("newsletter subscription failed", {
                source: source ?? null,
                error: error.message,
            });
            return noStoreJson({ error: "Could not subscribe this email." }, { status: 400 });
        }

        return noStoreJson({ ok: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        logger.error("unexpected newsletter subscription error", { error: message });
        return noStoreJson({ error: "Could not subscribe this email." }, { status: 500 });
    }
}
