"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";
import { recordPlatformEvent } from "@/lib/platform-events";
import { getServiceSupabase } from "@/lib/supabase/service";

export async function setAdminProductArchivedAction(productId: string, archive: boolean) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
        throw new Error("Invalid product ID.");
    }

    const { user } = await requireAdminAction();
    const supabase = getServiceSupabase();
    const { data: product, error: loadError } = await supabase
        .from("products")
        .select("id, artist_id, title, slug, category, artist_archived_at, is_published, moderation_status, production_status")
        .eq("id", productId)
        .maybeSingle();
    if (loadError || !product) throw new Error("Product not found.");
    if (Boolean(product.artist_archived_at) === archive) return;

    const restoreToReview = !archive && product.moderation_status === "approved" && product.production_status === "published";
    const patch = archive
        ? { artist_archived_at: new Date().toISOString(), is_published: false }
        : {
            artist_archived_at: null,
            is_published: restoreToReview,
            moderation_status: restoreToReview ? "pending_review" : "draft",
            moderation_reviewed_at: null,
            moderation_reviewed_by: null,
        };
    const { error: updateError } = await supabase.from("products").update(patch).eq("id", productId);
    if (updateError) {
        logger.error("admin product archive update failed", { productId, archive, error: updateError.message });
        throw new Error(archive ? "Could not remove this product." : "Could not restore this product.");
    }

    await recordPlatformEvent({
        scope: "product_moderation",
        action: archive ? "product_admin_archived" : "product_admin_restored",
        actorUserId: user.id,
        artistId: product.artist_id,
        productId,
        message: archive ? "Admin removed product from artist and shop views." : "Admin restored product to artist view.",
        metadata: {
            product_title: product.title,
            was_published: product.is_published,
            previous_moderation_status: product.moderation_status,
            restored_to_review: restoreToReview,
        },
    }, {
        supabase,
        failureLogMessage: "admin product archive audit failed",
        failureContext: { productId, archive, actorUserId: user.id },
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard/images");
    revalidatePath("/dashboard");
    revalidatePath("/");
    revalidatePath("/new");
    revalidatePath("/artists");
    if (product.slug) revalidatePath(`/product/${product.slug}`);
    if (product.category) revalidatePath(`/category/${product.category}`);
    if (product.artist_id) {
        const { data: artist } = await supabase.from("artists").select("slug").eq("id", product.artist_id).maybeSingle();
        if (artist?.slug) revalidatePath(`/artists/${artist.slug}`);
    }
}
