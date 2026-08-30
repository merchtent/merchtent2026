import "server-only";

import { publicCatalogProductQuery } from "@/lib/catalog/public-product-query";
import { mapCatalogProductCard, type CatalogProductRow } from "@/lib/catalog/product-card";
import { noStoreJson } from "@/lib/api/no-store";
import { publicApiError } from "@/lib/api/public-error";
import { publicStorageUrl } from "@/lib/storage";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";

type ArtistRow = {
    id: string;
    display_name?: string | null;
    slug?: string | null;
    hero_image_path?: string | null;
};

type ProductRowWithArtist = CatalogProductRow & {
    artist_id?: string | null;
};

function cleanSearchTerm(value: string | null) {
    return (value ?? "")
        .replace(/[%,]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const q = cleanSearchTerm(url.searchParams.get("q"));

    if (q.length < 2) {
        return noStoreJson({ artists: [], products: [] }, { status: 200 });
    }

    const supabase = getPublicServerSupabase();
    const pattern = `%${q}%`;

    const { data: artistData, error: artistError } = await supabase
        .from("artists_public")
        .select("id, display_name, slug, hero_image_path")
        .ilike("display_name", pattern)
        .order("display_name", { ascending: true })
        .limit(4);

    if (artistError) {
        return publicApiError("/api/search artists", artistError, "Could not search artists.");
    }

    const artists = ((artistData ?? []) as ArtistRow[]).map((artist) => ({
        id: artist.id,
        name: artist.display_name ?? "Artist",
        slug: artist.slug ?? artist.id,
        image: publicStorageUrl("artist-images", artist.hero_image_path) ?? "/merch-placeholder.svg",
    }));

    const { data: directProducts, error: directProductError } = await publicCatalogProductQuery(
        supabase
            .from("products")
            .select(
                `
                id,
                artist_id,
                title,
                slug,
                description,
                price_cents,
                currency,
                is_published,
                product_images:product_images ( path, sort_order ),
                product_colors:product_colors ( hex, label, sort_order, front_image_path, back_image_path ),
                artist:artists ( display_name, slug )
            `
            )
    )
        .or(`title.ilike.${pattern},description.ilike.${pattern}`)
        .order("created_at", { ascending: false })
        .limit(6);

    if (directProductError) {
        return publicApiError("/api/search products", directProductError, "Could not search products.");
    }

    const artistIds = artists.map((artist) => artist.id);
    const artistProductResult = artistIds.length
        ? await publicCatalogProductQuery(
            supabase
                .from("products")
                .select(
                    `
                    id,
                    artist_id,
                    title,
                    slug,
                    price_cents,
                    currency,
                    is_published,
                    product_images:product_images ( path, sort_order ),
                    product_colors:product_colors ( hex, label, sort_order, front_image_path, back_image_path ),
                    artist:artists ( display_name, slug )
                `
                )
        )
            .in("artist_id", artistIds)
            .order("created_at", { ascending: false })
            .limit(6)
        : { data: [], error: null };

    if (artistProductResult.error) {
        return publicApiError("/api/search artist products", artistProductResult.error, "Could not search artist products.");
    }

    const productMap = new Map<string, ReturnType<typeof mapCatalogProductCard>>();

    for (const product of [
        ...((directProducts ?? []) as ProductRowWithArtist[]),
        ...((artistProductResult.data ?? []) as ProductRowWithArtist[]),
    ]) {
        productMap.set(product.id, mapCatalogProductCard(product));
    }

    return noStoreJson(
        {
            artists,
            products: Array.from(productMap.values()).slice(0, 6),
        },
        { status: 200 }
    );
}
