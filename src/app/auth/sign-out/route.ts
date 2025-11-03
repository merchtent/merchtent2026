import { NextResponse } from "next/server";
import { getWritableServerSupabase } from "@/lib/supabase/server-action";

export async function POST() {
    const supabase = getWritableServerSupabase();
    await supabase.auth.signOut();
    // just return OK – no redirect here
    return NextResponse.json({ ok: true });
}
