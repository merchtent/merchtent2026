import { noStoreJson } from "@/lib/api/no-store";
import { rejectCrossOriginRequest } from "@/lib/auth/request-origin";
import { getWritableServerSupabase } from "@/lib/supabase/server-action";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const originRejection = rejectCrossOriginRequest(req);
    if (originRejection) return originRejection;

    const supabase = getWritableServerSupabase();
    await supabase.auth.signOut();
    return noStoreJson({ ok: true });
}
