import { NextResponse } from "next/server";
import { getWritableServerSupabase } from "@/lib/supabase/server-action";

export async function POST(req: Request) {
    const { access_token, refresh_token } = await req.json().catch(() => ({}));
    if (!access_token || !refresh_token) {
        return new NextResponse("Missing tokens", { status: 400 });
    }

    const supabase = getWritableServerSupabase();
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) return new NextResponse(error.message, { status: 400 });

    return NextResponse.json({ ok: true });
}
