import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import "server-only";

function publicImageUrl(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/journal-images/${encodeURIComponent(path)}`;
}

function publicAvatarUrl(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artist-images/${encodeURIComponent(path)}`;
}

export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
        return NextResponse.json(
            { error: "Missing Supabase env vars" },
            { status: 500 }
        );
    }

    const supabase = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
        .from("journal")
        .select(`
            id,
            slug,
            title,
            excerpt,
            cover_image,
            created_at,
            artists (
                display_name,
                hero_image_path
            )
        `)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(10);

    if (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }

    const journal =
        (data ?? []).map((j: any) => ({
            id: j.id,
            slug: j.slug,
            title: j.title,
            description: j.excerpt,
            image:
                // publicImageUrl(j.cover_image) ??
                "https://picsum.photos/seed/journal/800/600",
            artist: j.artists?.display_name ?? "Artist",
            avatar:
                publicAvatarUrl(j.artists?.hero_image_path) ??
                "",
            createdAt: j.created_at,
            tag: "Journal", // optional: you can add a column later
        })) ?? [];

    return NextResponse.json({ journal }, { status: 200 });
}