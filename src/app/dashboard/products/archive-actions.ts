"use server";

import { revalidatePath } from "next/cache";
import { requireArtistAction } from "@/lib/auth/artist";
import { logger } from "@/lib/logger";
import { productRestoreCutoff } from "@/lib/products/archive-retention";

const productIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function revalidateProductSurfaces(slug?: string | null, category?: string | null, artistSlug?: string | null) {
    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard/products/deleted");
    revalidatePath("/dashboard/images");
    revalidatePath("/dashboard");
    revalidatePath("/");
    revalidatePath("/new");
    revalidatePath("/artists");
    if (slug) revalidatePath(`/product/${slug}`);
    if (category) revalidatePath(`/category/${category}`);
    if (artistSlug) revalidatePath(`/artists/${artistSlug}`);
}

export async function archiveProductAction(productId: string) {
    if (!productIdPattern.test(productId)) {
        throw new Error("Invalid product ID.");
    }

    const { supabase, artist } = await requireArtistAction();
    const { data, error } = await supabase
        .from("products")
        .update({ artist_archived_at: new Date().toISOString(), is_published: false })
        .eq("id", productId)
        .eq("artist_id", artist.id)
        .is("artist_archived_at", null)
        .select("id, slug, category")
        .maybeSingle();

    if (error) {
        logger.error("artist product archive failed", { productId, artistId: artist.id, error: error.message });
        throw new Error("Could not remove this product. Try again.");
    }
    if (!data) throw new Error("Product not found or already removed.");

    const { data: artistPage } = await supabase.from("artists").select("slug").eq("id", artist.id).maybeSingle();
    revalidateProductSurfaces(data.slug, data.category, artistPage?.slug);
}

export async function restoreProductAction(productId: string) {
    if (!productIdPattern.test(productId)) throw new Error("Invalid product ID.");

    const { supabase, artist } = await requireArtistAction();
    const { data, error } = await supabase
        .from("products")
        .update({ artist_archived_at: null, is_published: false })
        .eq("id", productId)
        .eq("artist_id", artist.id)
        .eq("is_published", false)
        .not("artist_archived_at", "is", null)
        .gt("artist_archived_at", productRestoreCutoff().toISOString())
        .select("id, slug, category")
        .maybeSingle();

    if (error) {
        logger.error("artist product restore failed", { productId, artistId: artist.id, error: error.message });
        throw new Error("Could not restore this product. Try again.");
    }
    if (!data) throw new Error("The 14-day recovery window has expired, or this product is no longer available.");

    const { data: artistPage } = await supabase.from("artists").select("slug").eq("id", artist.id).maybeSingle();
    revalidateProductSurfaces(data.slug, data.category, artistPage?.slug);
}
