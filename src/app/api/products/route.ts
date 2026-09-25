// app/api/products/route.ts
import "server-only";
import { publicCatalogProductQuery } from "@/lib/catalog/public-product-query";
import { mapCatalogProductCard, type CatalogProductRow } from "@/lib/catalog/product-card";
import { publicApiError, publicApiJson } from "@/lib/api/public-error";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";
import { getAmplifyPriorityArtistIds } from "@/lib/amplify/entitlements";

export async function GET() {
    const supabase = getPublicServerSupabase();

    const { data, error } = await publicCatalogProductQuery(supabase
        .from("products")
        .select(
            `
        id,
        artist_id,
        title,
        slug,
        category,
        price_cents,
        currency,
        is_published,
        product_images:product_images ( path, sort_order ),
        product_colors:product_colors ( hex, label, sort_order, front_image_path, back_image_path ),
        artist:artists ( display_name )
      `
        )
    )
        .order("created_at", { ascending: false });

    if (error) {
        return publicApiError("/api/products", error);
    }

    const rows = (data ?? []) as CatalogProductRow[];
    const priorityArtistIds = await getAmplifyPriorityArtistIds(rows.map((product) => product.artist_id).filter((id): id is string => Boolean(id)));
    const products = rows
        .map((product, index) => ({ product, index }))
        .sort((a, b) => {
            const priorityDifference = Number(priorityArtistIds.has(b.product.artist_id ?? "")) - Number(priorityArtistIds.has(a.product.artist_id ?? ""));
            return priorityDifference || a.index - b.index;
        })
        .map(({ product }) => mapCatalogProductCard(product, {
            amplifyPriority: priorityArtistIds.has(product.artist_id ?? ""),
        }));

    return publicApiJson({ products }, { status: 200 });
}
