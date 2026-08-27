import { publicStorageUrl, type PublicStorageBucket } from "@/lib/storage";
import { publicApiError, publicApiJson } from "@/lib/api/public-error";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";

const DEFAULT_BUCKET = "artist-images" satisfies PublicStorageBucket;

type FeaturedArtistRow = {
    id: string;
    display_name?: string | null;
    slug?: string | null;
    hero_image_path?: string | null;
};

export async function GET() {
    const supabase = getPublicServerSupabase();

    // 👉 get up to 3 featured artists (fallback to latest if none flagged)
    const { data: featuredArtists, error: featuredError } = await supabase
        .from("artists")
        .select("id, display_name, slug, hero_image_path")
        .not("hero_image_path", "is", null)
        .eq("featured", true)
        .limit(3);

    if (featuredError) {
        return publicApiError("/api/featured", featuredError);
    }

    let artists = featuredArtists;
    if (!artists || artists.length === 0) {
        const fallback = await supabase
            .from("artists")
            .select("id, display_name, slug, hero_image_path")
            .not("hero_image_path", "is", null)
            .order("created_at", { ascending: false })
            .limit(3);

        if (fallback.error) {
            return publicApiError("/api/featured", fallback.error);
        }

        artists = fallback.data ?? [];
    }

    const mapped = ((artists ?? []) as FeaturedArtistRow[]).map((a) => ({
        id: a.id,
        name: a.display_name ?? "Artist",
        slug: a.slug ?? a.id,
        image: publicStorageUrl(DEFAULT_BUCKET, a.hero_image_path),
    }));

    return publicApiJson({ artists: mapped });
}
