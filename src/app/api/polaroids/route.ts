// app/api/polaroids/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function publicImage(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/polaroids/${encodeURIComponent(path)}`;
}

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
        .from("backstage_polaroids")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(24);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const images = (data ?? []).map((p: any) => ({
        id: p.id,
        image: publicImage(p.image_path),
        caption: p.caption,
        link: p.instagram_url,
    }));

    return NextResponse.json({ images });
}