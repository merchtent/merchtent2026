"use server";

import { revalidatePath } from "next/cache";
import { requireArtistAction } from "@/lib/auth/artist";
import { collectArtworkPaths, removeArtworkPath } from "@/lib/products/artwork-data";
import { getServiceSupabase } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { productRestoreCutoff } from "@/lib/products/archive-retention";

type DesignRow = {
    id: string;
    product_id: string;
    design_data: unknown;
};

type ProductState = {
    id: string;
    is_published: boolean | null;
    artist_archived_at: string | null;
};

export async function removeArtworkAction(path: string) {
    const { artist, user } = await requireArtistAction();
    const ownedPrefix = `designer-assets/${user.id}/`;
    if (!path.startsWith(ownedPrefix) || path.includes("..")) throw new Error("Invalid artwork path.");

    const service = getServiceSupabase();
    const { data: designData, error: designError } = await service
        .from("product_designs")
        .select("id, product_id, design_data")
        .eq("artist_id", artist.id);
    if (designError) throw new Error("Could not check where this artwork is used.");

    const designs = ((designData ?? []) as DesignRow[]).filter((design) =>
        collectArtworkPaths(design.design_data).includes(path)
    );
    if (designs.length === 0) throw new Error("Artwork not found in your saved products.");

    const productIds = Array.from(new Set(designs.map((design) => design.product_id)));
    const { data: productData, error: productError } = await service
        .from("products")
        .select("id, is_published, artist_archived_at")
        .eq("artist_id", artist.id)
        .in("id", productIds);
    if (productError) throw new Error("Could not check the linked products.");

    const products = (productData ?? []) as ProductState[];
    const restoreCutoff = productRestoreCutoff().getTime();
    const removable = products.length === productIds.length
        && products.every((product) => !product.is_published
            && Boolean(product.artist_archived_at)
            && new Date(String(product.artist_archived_at)).getTime() <= restoreCutoff);
    if (!removable) {
        throw new Error("Artwork stays protected until every linked product has passed its 14-day recovery window.");
    }

    const updated: DesignRow[] = [];
    try {
        for (const design of designs) {
            const { error } = await service
                .from("product_designs")
                .update({ design_data: removeArtworkPath(design.design_data, path) })
                .eq("id", design.id)
                .eq("artist_id", artist.id);
            if (error) throw error;
            updated.push(design);
        }

        const { error: storageError } = await service.storage.from("product-images").remove([path]);
        if (storageError) throw storageError;
    } catch (error) {
        await Promise.all(updated.map((design) => service
            .from("product_designs")
            .update({ design_data: design.design_data })
            .eq("id", design.id)
            .eq("artist_id", artist.id)));
        logger.error("artist artwork removal failed", {
            artistId: artist.id,
            path,
            error: error instanceof Error ? error.message : "Unknown error",
        });
        throw new Error("Could not remove this artwork. Try again.");
    }

    revalidatePath("/dashboard/images");
    revalidatePath("/dashboard/products/designer");
    return { ok: true };
}
