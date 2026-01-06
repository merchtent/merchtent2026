import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only
    { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const {
            path,
            referrer,
            user_agent,
            user_id,
            session_id,
        } = body ?? {};

        if (!path) {
            return NextResponse.json({ error: "Missing path" }, { status: 400 });
        }

        await supabase.from("page_views").insert({
            path,
            referrer: referrer ?? null,
            user_agent: user_agent ?? null,
            user_id: user_id ?? null,
            session_id: session_id ?? null,
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("❌ page view tracking failed", err);
        return NextResponse.json({ ok: false }, { status: 200 });
        // ⬆️ always return 200 so analytics never break UX
    }
}
