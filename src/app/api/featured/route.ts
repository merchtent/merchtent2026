import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function publicImage(path?: string | null, bucket = "artist-images") {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeURIComponent(path)}`;
}

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 👉 get up to 3 featured artists (fallback to latest if none flagged)
    let { data: artists } = await supabase
        .from("artists")
        .select("id, display_name, slug, hero_image_path")
        .eq("is_featured", true)
        .limit(3);

    if (!artists || artists.length === 0) {
        const fallback = await supabase
            .from("artists")
            .select("id, display_name, slug, hero_image_path")
            .order("created_at", { ascending: false })
            .limit(3);

        artists = fallback.data ?? [];
    }

    const mapped = (artists ?? []).map((a: any) => ({
        id: a.id,
        name: a.display_name,
        slug: a.slug,
        image: publicImage(a.hero_image_path),
    }));

    return NextResponse.json({ artists: mapped });
}