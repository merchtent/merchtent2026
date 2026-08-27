import "server-only";
import { publicStorageUrl } from "@/lib/storage";
import { publicApiError, publicApiJson } from "@/lib/api/public-error";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";

type JournalArtistRow = {
    display_name?: string | null;
    hero_image_path?: string | null;
};

type JournalRow = {
    id: string;
    slug?: string | null;
    title?: string | null;
    excerpt?: string | null;
    cover_image?: string | null;
    created_at?: string | null;
    artists?: JournalArtistRow | null;
};

export async function GET() {
    const supabase = getPublicServerSupabase();

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
        return publicApiError("/api/journal", error);
    }

    const journal =
        ((data ?? []) as JournalRow[]).map((j) => ({
            id: j.id,
            slug: j.slug ?? j.id,
            title: j.title ?? "Untitled journal",
            description: j.excerpt,
            image:
                publicStorageUrl("journal-images", j.cover_image) ??
                "/merch-placeholder.svg",
            artist: j.artists?.display_name ?? "Artist",
            avatar:
                publicStorageUrl("artist-images", j.artists?.hero_image_path) ??
                "",
            createdAt: j.created_at,
            tag: "Journal", // optional: you can add a column later
        })) ?? [];

    return publicApiJson({ journal }, { status: 200 });
}
