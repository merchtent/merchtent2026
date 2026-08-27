import { z } from "zod";
import { noStoreJson } from "@/lib/api/no-store";
import { rejectCrossOriginRequest } from "@/lib/auth/request-origin";
import { logger } from "@/lib/logger";
import { getWritableServerSupabase } from "@/lib/supabase/server-action";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const onboardSchema = z.object({
    display_name: z.string().max(80).nullish(),
    account_type: z.enum(["fan", "artist"]).default("fan"),
});

export async function POST(req: Request) {
    const originRejection = rejectCrossOriginRequest(req);
    if (originRejection) return originRejection;

    const parsed = onboardSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
        return noStoreJson({ error: "Invalid account setup details." }, { status: 400 });
    }

    const accountType = parsed.data.account_type;
    const name = (parsed.data.display_name ?? "").trim().slice(0, 60);
    if (accountType === "artist" && name.length < 2) {
        return noStoreJson({ error: "Invalid display name" }, { status: 400 });
    }

    const supabase = getWritableServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return noStoreJson({ error: "Not authenticated" }, { status: 401 });

    const { data, error } = await supabase.rpc("complete_account_onboarding", {
        p_account_type: accountType,
        p_display_name: name || user.email || null,
        p_artist_name: accountType === "artist" ? name : null,
    });

    if (error) {
        logger.error("auth onboarding failed", {
            user_id: user.id,
            account_type: accountType,
            error: error.message,
        });
        return noStoreJson({ error: "Could not complete account setup." }, { status: 400 });
    }
    return noStoreJson(data ?? { ok: true });
}
