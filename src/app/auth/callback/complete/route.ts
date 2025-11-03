import { NextResponse } from "next/server";
import { getWritableServerSupabase } from "@/lib/supabase/server-action";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    if (!code) return NextResponse.redirect(new URL("/", req.url));

    const supabase = getWritableServerSupabase();
    // This writes the sb- auth cookies for your domain
    await supabase.auth.exchangeCodeForSession(code);

    return NextResponse.redirect(new URL("/dashboard", req.url));
}
