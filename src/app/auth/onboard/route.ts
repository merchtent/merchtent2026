import { NextResponse } from "next/server";
import { getWritableServerSupabase } from "@/lib/supabase/server-action";

export async function POST(req: Request) {
    const { display_name } = await req.json().catch(() => ({}));
    if (!display_name || typeof display_name !== "string" || display_name.trim().length < 2) {
        return new NextResponse("Invalid display name", { status: 400 });
    }
    const name = display_name.trim().slice(0, 60);

    const supabase = getWritableServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse("Not authenticated", { status: 401 });

    // Already onboarded?
    const { data: existing, error: selErr } = await supabase
        .from("artists")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
    if (selErr) return new NextResponse(selErr.message, { status: 400 });
    if (existing) return NextResponse.json({ ok: true, already: true });

    // Create new artist
    const { error: insErr } = await supabase
        .from("artists")
        .insert({ user_id: user.id, display_name: name })
        .select("id")
        .single();

    if (insErr) return new NextResponse(insErr.message, { status: 400 });
    return NextResponse.json({ ok: true });
}
