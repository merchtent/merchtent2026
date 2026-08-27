// app/api/products/route.ts
import "server-only";
import { publicCatalogProductQuery } from "@/lib/catalog/public-product-query";
import { mapCatalogProductCard, type CatalogProductRow } from "@/lib/catalog/product-card";
import { publicApiError, publicApiJson } from "@/lib/api/public-error";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";

export async function GET(request: Request) {

    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get("artistId");
    const artistSlug = searchParams.get("artist");

    const supabase = getPublicServerSupabase();

    let query = publicCatalogProductQuery(supabase
        .from("products")
        .select(
            `
        id,
        title,
        slug,
        price_cents,
        currency,
        is_published,
        product_images:product_images ( path, sort_order ),
        product_colors:product_colors ( hex, label, sort_order, front_image_path, back_image_path ),
        artist:artists ( id, slug, display_name )
      `
        )
    )
        .order("created_at", { ascending: false });

    // ✅ Filter by artistId (preferred)
    if (artistId) {
        query = query.eq("artist_id", artistId);
    }

    // ✅ OR filter by artist slug (requires join)
    if (artistSlug) {
        query = query.eq("artists.slug", artistSlug);
    }

    const { data, error } = await query;

    if (error) {
        return publicApiError("/api/products/artist", error);
    }

    const products = ((data ?? []) as CatalogProductRow[]).map((product) =>
        mapCatalogProductCard(product)
    );

    return publicApiJson({ products }, { status: 200 });
}
