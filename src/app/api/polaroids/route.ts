// app/api/polaroids/route.ts
import { publicStorageUrlOrSource } from "@/lib/storage";
import { publicApiError, publicApiJson } from "@/lib/api/public-error";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";
import { normaliseExternalUrl } from "@/lib/urls";

type PolaroidRow = {
    id: string;
    image_path: string | null;
    caption: string | null;
    instagram_url: string | null;
};

export async function GET() {
    const supabase = getPublicServerSupabase();

    const { data, error } = await supabase
        .from("backstage_polaroids")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(24);

    if (error) {
        return publicApiError("/api/polaroids", error);
    }

    const images = ((data ?? []) as PolaroidRow[]).map((p) => ({
        id: p.id,
        image: publicStorageUrlOrSource("backstage-polaroids", p.image_path),
        caption: p.caption,
        link: normaliseExternalUrl(p.instagram_url),
    }));

    return publicApiJson({ images });
}
