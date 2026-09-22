"use server";

import { revalidatePath } from "next/cache";
import { requireArtistAction } from "@/lib/auth/artist";
import { logger } from "@/lib/logger";

export async function archiveProductAction(productId: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
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

    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard/images");
    revalidatePath("/dashboard");
    revalidatePath("/");
    revalidatePath("/new");
    revalidatePath("/artists");
    if (data.slug) revalidatePath(`/product/${data.slug}`);
    if (data.category) revalidatePath(`/category/${data.category}`);
    const { data: artistPage } = await supabase.from("artists").select("slug").eq("id", artist.id).maybeSingle();
    if (artistPage?.slug) revalidatePath(`/artists/${artistPage.slug}`);
}
