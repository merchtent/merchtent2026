import { NextRequest } from "next/server";
import { z } from "zod";
import { getServiceSupabase } from "@/lib/supabase/service";
import { noStoreJson } from "@/lib/api/no-store";
import { rejectCrossOriginRequest } from "@/lib/auth/request-origin";
import { checkDurableRateLimit } from "@/lib/rate-limit";
import { getServerSupabase } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const eventNames = [
    "view_item_list", "select_item", "view_item", "add_to_cart", "begin_checkout", "purchase",
    "sign_up", "artist_lead", "artist_activation", "newsletter_signup", "search", "outbound_click",
] as const;

const schema = z.object({
    event_name: z.enum(eventNames),
    path: z.string().min(1).max(1000).startsWith("/"),
    session_id: z.string().max(100).nullish(),
    attribution: z.record(z.string(), z.unknown()).nullish(),
    properties: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(req: NextRequest) {
    try {
        const rejection = rejectCrossOriginRequest(req);
        if (rejection) return rejection;

        const parsed = schema.safeParse(await req.json());
        if (!parsed.success) return noStoreJson({ error: "Invalid event" }, { status: 400 });

        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            || req.headers.get("x-real-ip") || "unknown";
        const userClient = getServerSupabase();
        const allowed = await checkDurableRateLimit(
            userClient, `marketing_event:${ip}`, 240, 60_000, "check_public_rate_limit", { fallback: "deny" },
        );
        if (!allowed) return noStoreJson({ ok: true });

        const { data: { user } } = await userClient.auth.getUser();
        const event = parsed.data;
        const service = getServiceSupabase();
        const { error } = await service.from("marketing_events").insert({
            event_name: event.event_name,
            path: event.path,
            session_id: event.session_id ?? null,
            user_id: user?.id ?? null,
            attribution: event.attribution ?? {},
            properties: event.properties,
        });
        if (error) throw error;
        return noStoreJson({ ok: true });
    } catch (error) {
        logger.error("marketing event tracking failed", {
            error: error instanceof Error ? error.message : String(error),
        });
        return noStoreJson({ ok: false }, { status: 200 });
    }
}
