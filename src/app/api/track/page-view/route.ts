import { NextRequest } from "next/server";
import { z } from "zod";
import { noStoreJson } from "@/lib/api/no-store";
import { getServerSupabase } from "@/lib/supabase/server";
import { checkDurableRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { rejectCrossOriginRequest } from "@/lib/auth/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pageViewSchema = z.object({
    path: z.string().min(1).max(500).startsWith("/"),
    referrer: z.string().max(1000).nullish(),
    user_agent: z.string().max(500).nullish(),
    session_id: z.string().min(1).max(100).nullish(),
});

export async function POST(req: NextRequest) {
    try {
        const originRejection = rejectCrossOriginRequest(req);
        if (originRejection) return originRejection;

        const ip =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            "unknown";

        const supabase = getServerSupabase();

        if (!(await checkDurableRateLimit(supabase, `page_view:${ip}`, 120, 60_000, "check_public_rate_limit", { fallback: "deny" }))) {
            return noStoreJson({ ok: true }, { status: 200 });
        }

        const parsed = pageViewSchema.safeParse(await req.json());

        if (!parsed.success) {
            return noStoreJson({ error: "Invalid payload" }, { status: 400 });
        }

        const { path, referrer, user_agent, session_id } = parsed.data;

        const { error } = await supabase.rpc("public_track_page_view", {
            p_path: path,
            p_referrer: referrer ?? null,
            p_user_agent: user_agent ?? null,
            p_session_id: session_id ?? null,
        });

        if (error) {
            logger.error("page view tracking insert failed", {
                path,
                error: error.message,
            });
        }

        return noStoreJson({ ok: true });
    } catch (err) {
        logger.error("page view tracking failed", {
            error: err instanceof Error ? err.message : String(err),
        });
        return noStoreJson({ ok: false }, { status: 200 });
    }
}
