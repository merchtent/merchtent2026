// app/dashboard/products/new/actions.ts
"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { toSlug } from "@/lib/slug";
import { safeImageUploadFilename, validateImageBytes, validateImageFile } from "@/lib/uploads";
import { logger } from "@/lib/logger";
import { checkDurableRateLimit } from "@/lib/rate-limit";
import { recordPlatformEvent, type PlatformEventSeverity } from "@/lib/platform-events";
import { requireArtistAction } from "@/lib/auth/artist";
import { z } from "zod";

const ALLOWED_CATEGORIES = [
    "tees",
    "hoodies",
    "hats",
    "tanks",
    "posters",
    "vinyl",
    "accessories",
    "other",
] as const;

const manualProductInputSchema = z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2_000),
    price: z.coerce.number().finite().min(1).max(2_000),
    category: z.enum(ALLOWED_CATEGORIES).catch("other"),
    publish: z.boolean(),
});

const productColorInputSchema = z.object({
    hex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).catch("#111111"),
    label: z.string().trim().max(80).optional().catch(undefined),
});

const MANUAL_PRODUCT_CREATE_LIMIT = 12;
const MANUAL_PRODUCT_CREATE_WINDOW_MS = 60 * 60 * 1000;

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Manual product creation failed.";
}

function failManualProductStep(
    message: string,
    details: Record<string, unknown>
): never {
    logger.error(message, details);
    throw new Error("Manual product creation failed.");
}

async function markManualProductCreationFailed(
    supabase: ReturnType<typeof getServerSupabase>,
    input: {
        productId: string;
        artistId: string;
        actorUserId: string | null;
        message: string;
    }
) {
    const { error: productUpdateError } = await supabase
        .from("products")
        .update({
            is_published: false,
            production_status: "failed",
            readiness_notes: "Manual product creation failed. Review product generation events before publishing.",
        })
        .eq("id", input.productId);

    if (productUpdateError) {
        logger.error("manual product failure status update failed", {
            artistId: input.artistId,
            productId: input.productId,
            error: productUpdateError.message,
        });
    }

    const { error: generationEventError } = await supabase.from("product_generation_events").insert({
        product_id: input.productId,
        product_design_id: null,
        artist_id: input.artistId,
        status: "failed",
        renderer: "manual-upload",
        renderer_version: "manual-v1",
        message: "Manual product creation failed.",
        metadata: {
            error: input.message,
        },
    });

    if (generationEventError) {
        logger.error("manual product failure event insert failed", {
            artistId: input.artistId,
            productId: input.productId,
            error: generationEventError.message,
        });
    }

    await logManualProductPlatformEvent(supabase, {
        action: "manual_product_generation_failed",
        severity: "error",
        actorUserId: input.actorUserId,
        artistId: input.artistId,
        productId: input.productId,
        message: "Manual product creation failed.",
        metadata: {
            error: input.message,
        },
    });
}

async function logManualProductPlatformEvent(
    supabase: ReturnType<typeof getServerSupabase>,
    input: {
        action: string;
        severity?: PlatformEventSeverity;
        actorUserId: string | null;
        artistId: string;
        productId: string;
        message: string;
        metadata?: Record<string, unknown>;
    }
) {
    await recordPlatformEvent(
        {
            scope: "product_generation",
            action: input.action,
            severity: input.severity ?? "info",
            actorUserId: input.actorUserId,
            artistId: input.artistId,
            productId: input.productId,
            message: input.message,
            metadata: input.metadata ?? {},
        },
        {
            supabase,
            failureLogMessage: "manual product platform event insert failed",
            failureContext: {
                artistId: input.artistId,
                productId: input.productId,
                action: input.action,
            },
            throwOnFailure: true,
            failurePublicMessage: "Could not audit manual product generation.",
        }
    );
}

export async function createProductAction(formData: FormData) {
    const { supabase, user, artist } = await requireArtistAction();
    const artistId = artist.id;

    const createAllowed = await checkDurableRateLimit(
        supabase,
        `manual_product_create:${artistId}:${user.id}`,
        MANUAL_PRODUCT_CREATE_LIMIT,
        MANUAL_PRODUCT_CREATE_WINDOW_MS,
        "check_public_rate_limit",
        { fallback: "deny" }
    );

    if (!createAllowed) {
        throw new Error("Too many manual product creation attempts. Try again later.");
    }

    const parsedInput = manualProductInputSchema.safeParse({
        title: formData.get("title"),
        description: formData.get("description") ?? "",
        price: formData.get("price"),
        category: formData.get("category") ?? "tees",
        publish: formData.get("publish") !== null,
    });
    if (!parsedInput.success) {
        throw new Error("Invalid product details");
    }

    const { title, description, price, category, publish } = parsedInput.data;
    const baseSlug = toSlug(title) || `product-${randomUUID().slice(0, 8)}`;
    const slug = `${baseSlug}-${randomUUID().slice(0, 8)}`;

    const fileFront = formData.get("image") as File | null;
    if (!fileFront || fileFront.size <= 0) throw new Error("Primary image required");
    let productId: string | null = null;

    async function uploadAndInsert(
        file: File,
        side: "front" | "back",
        sort_order: number
    ) {
        if (!productId) {
            throw new Error("Product creation failed");
        }

        validateImageFile(file);
        const bytes = await file.arrayBuffer();
        const contentType = validateImageBytes(bytes, file.type);
        const safeName = safeImageUploadFilename(file.name, contentType);
        const path = `${productId}/${randomUUID()}-${safeName}`;
        const { error: uploadErr } = await supabase.storage
            .from("product-images")
            .upload(path, Buffer.from(bytes), {
                contentType,
                upsert: true,
            });
        if (uploadErr) {
            failManualProductStep("manual product image upload failed", {
                artistId,
                productId,
                side,
                path,
                error: uploadErr.message,
            });
        }

        const { error: imgErr } = await supabase
            .from("product_images")
            .insert({ product_id: productId, path, sort_order, side });
        if (imgErr) {
            failManualProductStep("manual product image insert failed", {
                artistId,
                productId,
                side,
                path,
                error: imgErr.message,
            });
        }

        return path;
    }

    try {
        const { data: product, error: prodErr } = await supabase
            .from("products")
            .insert({
                artist_id: artistId,
                title,
                category: category,
                slug,
                description,
                price_cents: Math.round(price * 100),
                currency: "AUD",
                is_published: false,
                fulfillment_flow: "manual_fulfillment",
                production_status: "generating",
                moderation_status: "draft",
                readiness_notes: "Manual product upload in progress.",
            })
            .select("id")
            .single();

        if (prodErr) {
            failManualProductStep("manual product insert failed", {
                artistId,
                error: prodErr.message,
            });
        }
        if (!product?.id) throw new Error("Product creation failed");
        productId = product.id;
        const createdProductId = product.id;

        await uploadAndInsert(fileFront, "front", 0);

        const fileBack = formData.get("image_back") as File | null;
        if (fileBack && fileBack.size > 0) {
            await uploadAndInsert(fileBack, "back", 1);
        }

        const colorsCount = Math.min(
            Math.max(Number(formData.get("colors_count") || "0"), 0),
            20
        );
        for (let i = 0; i < colorsCount; i++) {
            const parsedColor = productColorInputSchema.parse({
                hex: formData.get(`color_${i}_hex`) || "#111111",
                label: formData.get(`color_${i}_label`) || undefined,
            });
            const frontFile = formData.get(`color_${i}_front`) as File | null;
            const backFile = formData.get(`color_${i}_back`) as File | null;

            if (!parsedColor.label && !frontFile && !backFile) continue;

            let frontPath: string | null = null;
            let backPath: string | null = null;

            if (frontFile && frontFile.size > 0) {
                validateImageFile(frontFile);
                const bytes = await frontFile.arrayBuffer();
                const contentType = validateImageBytes(bytes, frontFile.type);
                const safeName = safeImageUploadFilename(frontFile.name, contentType);
                frontPath = `${productId}/colors/${i}-front-${safeName}`;
                const { error: upErr } = await supabase.storage
                    .from("product-images")
                    .upload(frontPath, Buffer.from(bytes), {
                        contentType,
                        upsert: true,
                    });
                if (upErr) {
                    failManualProductStep("manual product color front image upload failed", {
                        artistId,
                        productId,
                        sortOrder: i,
                        path: frontPath,
                        error: upErr.message,
                    });
                }
            }

            if (backFile && backFile.size > 0) {
                validateImageFile(backFile);
                const bytes = await backFile.arrayBuffer();
                const contentType = validateImageBytes(bytes, backFile.type);
                const safeName = safeImageUploadFilename(backFile.name, contentType);
                backPath = `${productId}/colors/${i}-back-${safeName}`;
                const { error: upErr } = await supabase.storage
                    .from("product-images")
                    .upload(backPath, Buffer.from(bytes), {
                        contentType,
                        upsert: true,
                    });
                if (upErr) {
                    failManualProductStep("manual product color back image upload failed", {
                        artistId,
                        productId,
                        sortOrder: i,
                        path: backPath,
                        error: upErr.message,
                    });
                }
            }

            const { error: colorInsertErr } = await supabase.from("product_colors").insert({
                product_id: productId,
                hex: parsedColor.hex,
                label: parsedColor.label || null,
                sort_order: i,
                front_image_path: frontPath,
                back_image_path: backPath,
            });

            if (colorInsertErr) {
                failManualProductStep("manual product color insert failed", {
                    artistId,
                    productId,
                    sortOrder: i,
                    error: colorInsertErr.message,
                });
            }
        }

        const { error: generationEventError } = await supabase.from("product_generation_events").insert({
            product_id: productId,
            product_design_id: null,
            artist_id: artistId,
            status: publish ? "published" : "validated",
            renderer: "manual-upload",
            renderer_version: "manual-v1",
            message: publish
                ? "Manual product assets uploaded and published."
                : "Manual product assets uploaded and saved as draft.",
            metadata: {
                category,
                has_back_image: Boolean(formData.get("image_back")),
            },
        });

        if (generationEventError) {
            failManualProductStep("manual product generation event insert failed", {
                artistId,
                productId,
                error: generationEventError.message,
            });
        }

        const { error: publishError } = await supabase
            .from("products")
            .update({
                is_published: publish,
                production_status: publish ? "published" : "generated",
                moderation_status: publish ? "pending_review" : "draft",
                moderation_notes: publish ? "Awaiting operator review after artist manual product publish." : null,
                moderation_reviewed_at: null,
                moderation_reviewed_by: null,
                readiness_notes: publish
                    ? "Manual product assets uploaded, published, and queued for moderation review."
                    : "Manual product assets uploaded and saved as draft.",
            })
            .eq("id", productId);

        if (publishError) {
            failManualProductStep("manual product publish status update failed", {
                artistId,
                productId,
                publish,
                error: publishError.message,
            });
        }

        await logManualProductPlatformEvent(supabase, {
            action: publish ? "manual_product_published" : "manual_product_saved",
            actorUserId: user.id,
            artistId,
            productId: createdProductId,
            message: publish
                ? "Manual product assets uploaded and published."
                : "Manual product assets uploaded and saved as draft.",
            metadata: {
                category,
                has_back_image: Boolean(formData.get("image_back")),
            },
        });
    } catch (error) {
        const message = errorMessage(error);

        logger.error("manual product creation failed", {
            artistId,
            productId,
            error: message,
        });

        if (productId) {
            await markManualProductCreationFailed(supabase, {
                productId,
                artistId,
                actorUserId: user.id,
                message,
            });

            throw new Error("Product creation failed. The product was saved as unpublished for review.");
        }

        throw new Error("Product creation failed. Please try again.");
    }

    redirect("/dashboard/products");
}
