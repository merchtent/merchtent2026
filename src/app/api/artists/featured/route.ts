// app/api/artists/featured/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function publicImageUrl(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${encodeURIComponent(
        path
    )}`;
}

function publicArtistImageUrl(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artist-images/${encodeURIComponent(
        path
    )}`;
}

export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || !anon) {
        return NextResponse.json(
            { error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" },
            { status: 500 }
        );
    }

    const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data, error } = await supabase
        .from("artists_public")
        .select("id, display_name, slug, featured, hero_image_path")
        .eq("featured", true)
        .order("display_name", { ascending: true })
        .limit(12);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const artists = (data ?? []).map((a) => ({
        id: a.id,
        display_name: a.display_name,
        slug: a.slug,
        image: publicArtistImageUrl(a.hero_image_path),
    }));

    return NextResponse.json({ artists });
}
