// app/api/subscribe/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = {
    email: string;
    name?: string;
    source?: string;
    utm?: string;
    consent?: boolean;
};

export async function POST(req: Request) {
    try {
        const { email, name, source, utm, consent }: Body = await req.json();

        if (!email || typeof email !== "string") {
            return NextResponse.json({ error: "Email required" }, { status: 400 });
        }

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(url, anon, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        const { error } = await supabase.rpc("subscribe_newsletter", {
            p_email: email,
            p_name: name ?? null,
            p_source: source ?? null,
            p_utm: utm ?? null,
            p_consent: consent ?? true,
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
    }
}
