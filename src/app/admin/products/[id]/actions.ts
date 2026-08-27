"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";
import { recordPlatformEvent } from "@/lib/platform-events";
import { getServiceSupabase } from "@/lib/supabase/service";

type ModerationStatus = "approved" | "blocked";

type ProductModerationRow = {
    id: string;
    artist_id: string | null;
    title: string | null;
    is_published: boolean | null;
    production_status: string | null;
    moderation_status: string | null;
};

export async function moderateProduct(productId: string, status: ModerationStatus, notes = "") {
    const { user } = await requireAdminAction();
    const serviceSupabase = getServiceSupabase();
    const cleanNotes = notes.trim().slice(0, 1000);

    const { data: product, error: productError } = await serviceSupabase
        .from("products")
        .select("id, artist_id, title, is_published, production_status, moderation_status")
        .eq("id", productId)
        .maybeSingle();

    if (productError) {
        logger.error("Admin product moderation lookup failed", {
            actor_user_id: user.id,
            product_id: productId,
            moderation_status: status,
            error: productError.message,
        });
        throw new Error("Could not load product for moderation.");
    }

    if (!product) {
        throw new Error("Product not found.");
    }

    const typedProduct = product as ProductModerationRow;
    if (
        status === "approved" &&
        (typedProduct.is_published !== true || typedProduct.production_status !== "published")
    ) {
        throw new Error("Only published, production-ready products can be approved.");
    }

    const reviewedAt = new Date().toISOString();
    const updatePatch =
        status === "approved"
            ? {
                moderation_status: "approved",
                moderation_notes: cleanNotes || "Approved by admin review.",
                moderation_reviewed_at: reviewedAt,
                moderation_reviewed_by: user.id,
                readiness_notes: "Product moderation approved by admin review.",
            }
            : {
                moderation_status: "blocked",
                moderation_notes: cleanNotes || "Blocked by admin review.",
                moderation_reviewed_at: reviewedAt,
                moderation_reviewed_by: user.id,
                is_published: false,
                readiness_notes: "Product blocked by admin moderation review.",
            };

    const { error: updateError } = await serviceSupabase
        .from("products")
        .update(updatePatch)
        .eq("id", typedProduct.id);

    if (updateError) {
        logger.error("Admin product moderation update failed", {
            actor_user_id: user.id,
            product_id: typedProduct.id,
            previous_moderation_status: typedProduct.moderation_status,
            moderation_status: status,
            error: updateError.message,
        });
        throw new Error("Could not update product moderation status.");
    }

    await recordPlatformEvent(
        {
            scope: "product_moderation",
            action: status === "approved" ? "product_moderation_approved" : "product_moderation_blocked",
            severity: status === "approved" ? "info" : "warning",
            actorUserId: user.id,
            artistId: typedProduct.artist_id,
            productId: typedProduct.id,
            message: status === "approved"
                ? "Admin approved product moderation."
                : "Admin blocked product moderation and unpublished the listing.",
            metadata: {
                product_title: typedProduct.title,
                production_status: typedProduct.production_status,
                previous_moderation_status: typedProduct.moderation_status,
                was_published: typedProduct.is_published,
                moderation_notes: cleanNotes || null,
            },
        },
        {
            supabase: serviceSupabase,
            failureLogMessage: "Admin product moderation platform event failed",
            failureContext: {
                actor_user_id: user.id,
                product_id: typedProduct.id,
                moderation_status: status,
            },
            throwOnFailure: true,
            failurePublicMessage: "Could not audit product moderation update.",
        }
    );

    revalidatePath(`/admin/products/${typedProduct.id}`);
    revalidatePath("/admin/products");
    revalidatePath("/admin/operations");
    revalidatePath("/dashboard/products");

    return {
        ok: true,
        status,
        message: status === "approved" ? "Product approved." : "Product blocked and unpublished.",
    };
}
