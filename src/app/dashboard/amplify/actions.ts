"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireLaunchedAmplifyConfig } from "@/lib/amplify/config";
import { requireArtistAction } from "@/lib/auth/artist";
import { logger } from "@/lib/logger";

const promotionSchema = z.object({
    productId: z.uuid().nullable(),
    channel: z.enum(["instagram", "tiktok", "facebook", "email", "other"]),
    requestedFor: z.iso.date().nullable(),
    brief: z.string().trim().max(2000),
});

export type AmplifyPromotionState = { error?: string; ok?: boolean };

export async function requestAmplifyPromotion(formData: FormData): Promise<AmplifyPromotionState> {
    requireLaunchedAmplifyConfig();
    const { supabase, artist } = await requireArtistAction();
    const parsed = promotionSchema.safeParse({
        productId: String(formData.get("product_id") ?? "").trim() || null,
        channel: String(formData.get("channel") ?? ""),
        requestedFor: String(formData.get("requested_for") ?? "").trim() || null,
        brief: String(formData.get("brief") ?? ""),
    });
    if (!parsed.success) return { error: "Check the promotion request details." };

    const { error } = await supabase.rpc("create_amplify_promotion_request", {
        p_artist_id: artist.id,
        p_product_id: parsed.data.productId,
        p_channel: parsed.data.channel,
        p_requested_for: parsed.data.requestedFor,
        p_brief: parsed.data.brief,
    });
    if (error) {
        logger.error("Amplify promotion request failed", { artist_id: artist.id, error: error.message });
        return { error: "Could not submit this promotion request." };
    }

    revalidatePath("/dashboard/amplify");
    return { ok: true };
}
