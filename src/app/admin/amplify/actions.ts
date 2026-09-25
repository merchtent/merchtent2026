"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";
import { recordPlatformEvent } from "@/lib/platform-events";

const updateSchema = z.object({
    requestId: z.uuid(),
    status: z.enum(["submitted", "scheduled", "published", "declined", "canceled"]),
    publishedUrl: z.url().max(1000).nullable(),
});

export async function updateAmplifyPromotionRequest(formData: FormData) {
    const { supabase, user } = await requireAdminAction();
    const parsed = updateSchema.safeParse({
        requestId: String(formData.get("request_id") ?? ""),
        status: String(formData.get("status") ?? ""),
        publishedUrl: String(formData.get("published_url") ?? "").trim() || null,
    });
    if (!parsed.success) throw new Error("Promotion update is invalid.");
    if (parsed.data.status === "published" && !parsed.data.publishedUrl) {
        throw new Error("Published promotions require a public URL.");
    }

    const { data, error } = await supabase
        .from("artist_promotion_requests")
        .update({
            status: parsed.data.status,
            published_url: parsed.data.publishedUrl,
            updated_at: new Date().toISOString(),
        })
        .eq("id", parsed.data.requestId)
        .select("artist_id")
        .single();
    if (error) {
        logger.error("Admin Amplify promotion update failed", {
            request_id: parsed.data.requestId,
            error: error.message,
        });
        throw new Error("Could not update this promotion request.");
    }

    await recordPlatformEvent({
        scope: "amplify",
        action: "amplify_promotion_request_updated",
        actorUserId: user.id,
        artistId: data.artist_id,
        externalId: parsed.data.requestId,
        message: "Admin updated an Amplify promotion request.",
        metadata: { status: parsed.data.status, published_url: parsed.data.publishedUrl },
    }, { supabase, failureLogMessage: "Amplify promotion update audit failed" });

    revalidatePath("/admin/amplify");
}
