import "server-only";
import { publicCatalogProductQuery } from "@/lib/catalog/public-product-query";
import { mapCatalogProductCard, type CatalogProductRow } from "@/lib/catalog/product-card";
import { publicApiError, publicApiJson } from "@/lib/api/public-error";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") ?? "tees"; // fallback

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
        category,
        product_images:product_images ( path, sort_order )
      `
        )
    )
        .eq("category", category)
        .order("created_at", { ascending: false });

    if (error) {
        return publicApiError("/api/products/category", error);
    }

    const products = ((data ?? []) as CatalogProductRow[]).map((product) =>
        mapCatalogProductCard(product, { fallbackBadge: "Live" })
    );

    return publicApiJson({ products }, { status: 200 });
}
