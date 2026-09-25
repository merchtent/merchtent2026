"use server";

import { z } from "zod";

import { requireArtistAction } from "@/lib/auth/artist";
import { logger } from "@/lib/logger";

const progressSchema = z.object({
    productId: z.string().uuid(),
    completedSteps: z.array(z.number().int().min(0).max(6)).max(7)
        .transform((steps) => Array.from(new Set(steps)).sort((a, b) => a - b)),
});

export async function saveLaunchKitProgress(input: unknown) {
    const parsed = progressSchema.safeParse(input);
    if (!parsed.success) throw new Error("That posting progress is not valid.");

    const { supabase, artist } = await requireArtistAction();
    const { data: product, error: productError } = await supabase
        .from("products")
        .select("id")
        .eq("id", parsed.data.productId)
        .eq("artist_id", artist.id)
        .maybeSingle();

    if (productError || !product) {
        logger.warn("artist launch kit product ownership check failed", {
            artist_id: artist.id,
            product_id: parsed.data.productId,
            error: productError?.message,
        });
        throw new Error("That drop could not be updated.");
    }

    const { error } = await supabase.from("launch_kit_progress").upsert({
        product_id: parsed.data.productId,
        artist_id: artist.id,
        completed_steps: parsed.data.completedSteps,
        updated_at: new Date().toISOString(),
    }, { onConflict: "product_id" });

    if (error) {
        logger.error("artist launch kit progress failed to save", {
            artist_id: artist.id,
            product_id: parsed.data.productId,
            error: error.message,
        });
        throw new Error("Posting progress could not be saved.");
    }

    return { completedSteps: parsed.data.completedSteps };
}
