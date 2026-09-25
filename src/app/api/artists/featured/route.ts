// app/api/artists/featured/route.ts
import { publicStorageUrl } from "@/lib/storage";
import { publicApiError, publicApiJson } from "@/lib/api/public-error";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";
import { getAmplifyPriorityArtistIds } from "@/lib/amplify/entitlements";

export async function GET() {
    const supabase = getPublicServerSupabase();

    const { data, error } = await supabase
        .from("artists_public")
        .select("id, display_name, slug, featured, hero_image_path")
        .order("display_name", { ascending: true })
        .limit(100);

    if (error) {
        return publicApiError("/api/artists/featured", error);
    }

    const priorityArtistIds = await getAmplifyPriorityArtistIds((data ?? []).map((artist) => artist.id));
    const artists = (data ?? [])
        .filter((artist) => artist.featured || priorityArtistIds.has(artist.id))
        .sort((a, b) => {
            const priorityDifference = Number(priorityArtistIds.has(b.id)) - Number(priorityArtistIds.has(a.id));
            return priorityDifference || a.display_name.localeCompare(b.display_name);
        })
        .slice(0, 12)
        .map((a) => ({
            id: a.id,
            display_name: a.display_name,
            slug: a.slug,
            image: publicStorageUrl("artist-images", a.hero_image_path),
        }));

    return publicApiJson({ artists });
}
