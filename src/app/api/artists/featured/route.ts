// app/api/artists/featured/route.ts
import { publicStorageUrl } from "@/lib/storage";
import { publicApiError, publicApiJson } from "@/lib/api/public-error";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";

export async function GET() {
    const supabase = getPublicServerSupabase();

    const { data, error } = await supabase
        .from("artists_public")
        .select("id, display_name, slug, featured, hero_image_path")
        .eq("featured", true)
        .order("display_name", { ascending: true })
        .limit(12);

    if (error) {
        return publicApiError("/api/artists/featured", error);
    }

    const artists = (data ?? []).map((a) => ({
        id: a.id,
        display_name: a.display_name,
        slug: a.slug,
        image: publicStorageUrl("artist-images", a.hero_image_path),
    }));

    return publicApiJson({ artists });
}
