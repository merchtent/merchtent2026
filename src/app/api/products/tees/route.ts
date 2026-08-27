// app/api/products/route.ts
import "server-only";
import { publicCatalogProductQuery } from "@/lib/catalog/public-product-query";
import { mapCatalogProductCard, type CatalogProductRow } from "@/lib/catalog/product-card";
import { publicApiError, publicApiJson } from "@/lib/api/public-error";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";

export async function GET() {
    const supabase = getPublicServerSupabase();

    const { data, error } = await publicCatalogProductQuery(supabase
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
        artist:artists ( display_name )
      `
        )
    )
        .eq("category", 'tees')
        .order("created_at", { ascending: false });

    if (error) {
        return publicApiError("/api/products/tees", error);
    }

    const products = ((data ?? []) as CatalogProductRow[]).map((product) =>
        mapCatalogProductCard(product)
    );

    return publicApiJson({ products }, { status: 200 });
}
