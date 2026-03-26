import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import "server-only";

function publicArtistImage(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artist-images/${encodeURIComponent(path)}`;
}

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: { persistSession: false, autoRefreshToken: false },
        }
    );

    const { data, error } = await supabase
        .from("artists_public")
        .select("id, display_name, slug, hero_image_path")
        .order("display_name", { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const artists =
        (data ?? []).map((a: any) => ({
            id: a.id,
            name: a.display_name ?? "Artist",
            slug: a.slug ?? a.id,
            image:
                publicArtistImage(a.hero_image_path) ??
                "https://picsum.photos/seed/artist/600/400",
        })) ?? [];

    return NextResponse.json({ artists }, { status: 200 });
}