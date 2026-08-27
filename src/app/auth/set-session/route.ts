import { z } from "zod";
import { noStoreJson } from "@/lib/api/no-store";
import { rejectCrossOriginRequest } from "@/lib/auth/request-origin";
import { logger } from "@/lib/logger";
import { getWritableServerSupabase } from "@/lib/supabase/server-action";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const setSessionSchema = z.object({
    access_token: z.string().min(1).max(8_192),
    refresh_token: z.string().min(1).max(8_192),
});

export async function POST(req: Request) {
    const originRejection = rejectCrossOriginRequest(req);
    if (originRejection) return originRejection;

    const parsed = setSessionSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
        return noStoreJson({ error: "Missing tokens" }, { status: 400 });
    }

    const supabase = getWritableServerSupabase();
    const { access_token, refresh_token } = parsed.data;
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
        logger.error("auth set session failed", {
            error: error.message,
        });
        return noStoreJson({ error: "Could not complete sign in." }, { status: 400 });
    }

    return noStoreJson({ ok: true });
}
