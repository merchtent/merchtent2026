"use server";

import { revalidatePath } from "next/cache";
import { syncProductToPrintify } from "@/lib/printify/product-sync";
import { logger } from "@/lib/logger";
import { requireArtistAction } from "@/lib/auth/artist";

export async function syncProductToPrintifyAction(productId: string) {
    const { user, artist } = await requireArtistAction();

    let result: Awaited<ReturnType<typeof syncProductToPrintify>>;

    try {
        result = await syncProductToPrintify({
            productId,
            artistId: artist.id,
            actorUserId: user.id,
            reason: "artist_manual_sync",
        });
    } catch (error) {
        logger.error("artist Printify sync failed", {
            product_id: productId,
            artist_id: artist.id,
            user_id: user.id,
            error: error instanceof Error ? error.message : "Unknown Printify sync error.",
        });
        throw new Error("Could not sync product to Printify.");
    }

    revalidatePath("/dashboard/products");
    revalidatePath(`/dashboard/products/${productId}/edit`);

    return {
        ok: true,
        message: result.alreadySynced
            ? "This product has already been synced to Printify."
            : "Product synced to Printify.",
    };
}
