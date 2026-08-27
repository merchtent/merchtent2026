import "server-only";
import { publicStorageUrl } from "@/lib/storage";
import { publicApiError, publicApiJson } from "@/lib/api/public-error";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";

type ArtistRow = {
    id: string;
    display_name?: string | null;
    slug?: string | null;
    hero_image_path?: string | null;
};

export async function GET() {
    const supabase = getPublicServerSupabase();

    const { data, error } = await supabase
        .from("artists_public")
        .select("id, display_name, slug, hero_image_path")
        .order("display_name", { ascending: true });

    if (error) {
        return publicApiError("/api/artists", error);
    }

    const artists =
        ((data ?? []) as ArtistRow[]).map((a) => ({
            id: a.id,
            name: a.display_name ?? "Artist",
            slug: a.slug ?? a.id,
            image:
                publicStorageUrl("artist-images", a.hero_image_path) ??
                "/merch-placeholder.svg",
        })) ?? [];

    return publicApiJson({ artists }, { status: 200 });
}
