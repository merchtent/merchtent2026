// app/api/products/editors/route.ts
import { publicCatalogProductQuery } from "@/lib/catalog/public-product-query";
import { mapCatalogProductCard, type CatalogProductRow } from "@/lib/catalog/product-card";
import { publicApiError, publicApiJson } from "@/lib/api/public-error";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";

export async function GET() {
    const supabase = getPublicServerSupabase();

    // Pull only published + editors_choice. Also pull colors like the main /products API.
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
        editors_choice,
        created_at,
        product_images:product_images ( path, sort_order ),
        product_colors:product_colors ( hex, label, sort_order, front_image_path, back_image_path ),
        artist:artists ( display_name )
      `
        )
    )
        .eq("editors_choice", true)
        .order("created_at", { ascending: false })
        .limit(16);

    if (error) {
        return publicApiError("/api/products/editors", error);
    }

    const products = ((data ?? []) as CatalogProductRow[]).map((product) =>
        mapCatalogProductCard(product, { fallbackBadge: "Editor’s Pick" })
    );

    return publicApiJson({ products }, { status: 200 });
}
