// app/dashboard/products/[id]/edit/actions.ts
"use server";

import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";
import { safeImageUploadFilename, validateImageBytes, validateImageFile } from "@/lib/uploads";
import { checkDurableRateLimit } from "@/lib/rate-limit";
import { requireArtistAction } from "@/lib/auth/artist";

const ALLOWED_CATEGORIES = [
    "tees",
    "hoodies",
    "tanks",
    "posters",
    "vinyl",
    "accessories",
    "other",
];

const PRODUCT_EDIT_LIMIT = 30;
const PRODUCT_EDIT_WINDOW_MS = 60 * 60 * 1000;

function failProductUpdate(
    message: string,
    details: Record<string, unknown>
): never {
    logger.error(message, details);
    throw new Error("Could not update product.");
}

export async function updateProductAction(formData: FormData) {
    const { supabase, user, artist } = await requireArtistAction();

    // ─── AUTH / OWNERSHIP ───────────────────────────────
    const productId = String(formData.get("product_id") || "").trim();
    if (!productId) throw new Error("Missing product_id");

    const { data: prod, error: productError } = await supabase
        .from("products")
        .select("id, artist_id, production_status")
        .eq("id", productId)
        .maybeSingle();
    if (productError) {
        failProductUpdate("dashboard product edit ownership lookup failed", {
            product_id: productId,
            user_id: user.id,
            error: productError.message,
        });
    }
    if (!prod || prod.artist_id !== artist.id) {
        throw new Error("You do not own this product");
    }

    const editAllowed = await checkDurableRateLimit(
        supabase,
        `product_edit:${artist.id}:${productId}`,
        PRODUCT_EDIT_LIMIT,
        PRODUCT_EDIT_WINDOW_MS,
        "check_public_rate_limit",
        { fallback: "deny" }
    );

    if (!editAllowed) {
        throw new Error("Too many product edit attempts. Try again later.");
    }

    // ─── BASIC FIELDS ───────────────────────────────────
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const price = Number(formData.get("price") || "0");
    const publish = formData.get("publish") !== null;
    const rawCategory = String(formData.get("category") || "").trim();
    const category = ALLOWED_CATEGORIES.includes(rawCategory)
        ? rawCategory
        : "other";

    if (!title || price <= 0) {
        throw new Error("Invalid product data");
    }

    // ─── HELPERS ────────────────────────────────────────
    async function uploadToStorage(file: File, pathPrefix: string) {
        validateImageFile(file);
        const bytes = await file.arrayBuffer();
        const contentType = validateImageBytes(bytes, file.type);
        const path = `${pathPrefix}-${safeImageUploadFilename(file.name, contentType)}`;
        const { error: upErr } = await supabase.storage
            .from("product-images")
            .upload(path, Buffer.from(bytes), {
                contentType,
                upsert: true,
            });
        if (upErr) {
            failProductUpdate("dashboard product image upload failed", {
                product_id: productId,
                path,
                error: upErr.message,
            });
        }
        return path;
    }

    async function assertProductReadyToPublish(productId: string) {
        if (prod?.production_status === "failed" || prod?.production_status === "generating") {
            throw new Error("Product generation must be completed before publishing.");
        }

        const { data: primaryImage, error: primaryImageError } = await supabase
            .from("product_images")
            .select("id")
            .eq("product_id", productId)
            .eq("sort_order", 0)
            .maybeSingle();

        if (primaryImageError) {
            failProductUpdate("dashboard product publish readiness lookup failed", {
                product_id: productId,
                error: primaryImageError.message,
            });
        }
        if (!primaryImage?.id) {
            throw new Error("A primary product image is required before publishing.");
        }

        const { data: design, error: designError } = await supabase
            .from("product_designs")
            .select("id, validation_status, print_asset_front_path")
            .eq("product_id", productId)
            .eq("provider", "merch_tent")
            .maybeSingle();

        if (designError) {
            failProductUpdate("dashboard product publish design readiness lookup failed", {
                product_id: productId,
                error: designError.message,
            });
        }

        if (design && (design.validation_status !== "validated" || !design.print_asset_front_path)) {
            throw new Error("Designer products must have validated print assets before publishing.");
        }
    }

    /**
     * RLS-friendly “upsert” for product_images:
     * 1. SELECT existing row by product_id + sort_order
     * 2. if found -> UPDATE by id
     * 3. else -> INSERT
     */
    async function upsertProductImageBySelect(opts: {
        product_id: string;
        path: string;
        side: "front" | "back" | null;
        sort_order: number;
    }) {
        // 1) see if row exists
        const { data: existing, error: selErr } = await supabase
            .from("product_images")
            .select("id")
            .eq("product_id", opts.product_id)
            .eq("sort_order", opts.sort_order)
            .maybeSingle();
        if (selErr) {
            failProductUpdate("dashboard product image lookup failed", {
                product_id: opts.product_id,
                sort_order: opts.sort_order,
                error: selErr.message,
            });
        }

        if (existing?.id) {
            // 2) update by id
            const { error: updErr } = await supabase
                .from("product_images")
                .update({
                    path: opts.path,
                    side: opts.side,
                })
                .eq("id", existing.id);
            if (updErr) {
                failProductUpdate("dashboard product image update failed", {
                    product_id: opts.product_id,
                    image_id: existing.id,
                    error: updErr.message,
                });
            }
        } else {
            // 3) insert
            const { error: insErr } = await supabase.from("product_images").insert({
                product_id: opts.product_id,
                path: opts.path,
                side: opts.side,
                sort_order: opts.sort_order,
            });
            if (insErr) {
                failProductUpdate("dashboard product image insert failed", {
                    product_id: opts.product_id,
                    sort_order: opts.sort_order,
                    error: insErr.message,
                });
            }
        }
    }

    // ─── FRONT IMAGE (optional) ─────────────────────────
    const fileFront = formData.get("image_front") as File | null;
    if (fileFront && fileFront.size > 0) {
        const storagePath = await uploadToStorage(fileFront, `${productId}/${randomUUID()}`);
        await upsertProductImageBySelect({
            product_id: productId,
            path: storagePath,
            side: "front",
            sort_order: 0,
        });
    }

    // ─── BACK IMAGE (optional) ──────────────────────────
    const fileBack = formData.get("image_back") as File | null;
    if (fileBack && fileBack.size > 0) {
        const storagePath = await uploadToStorage(fileBack, `${productId}/${randomUUID()}`);
        await upsertProductImageBySelect({
            product_id: productId,
            path: storagePath,
            side: "back",
            sort_order: 1,
        });
    }

    // ─── COLOURS ─────────────────────────────────────────
    const colorCount = Math.min(
        Math.max(Number(formData.get("colors_count") || "0"), 0),
        20
    );

    // delete only what user removed
    const removedIds = formData.getAll("remove_color_id") as string[];
    if (removedIds.length) {
        const { error: delErr } = await supabase
            .from("product_colors")
            .delete()
            .in("id", removedIds);
        if (delErr) {
            failProductUpdate("dashboard product color delete failed", {
                product_id: productId,
                color_ids: removedIds,
                error: delErr.message,
            });
        }
    }

    for (let i = 0; i < colorCount; i++) {
        const mode = String(formData.get(`color_${i}_mode`) || "").trim();
        const existingId = String(formData.get(`color_${i}_id`) || "").trim();

        const hex = String(formData.get(`color_${i}_hex`) || "").trim();
        const label = String(formData.get(`color_${i}_label`) || "").trim();

        // these are now RAW KEYS from the client
        const existingFront = String(
            formData.get(`color_${i}_existing_front`) || ""
        ).trim();
        const existingBack = String(
            formData.get(`color_${i}_existing_back`) || ""
        ).trim();

        const newFrontFile = formData.get(`color_${i}_front`) as File | null;
        const newBackFile = formData.get(`color_${i}_back`) as File | null;

        const anyProvided =
            hex ||
            label ||
            existingFront ||
            existingBack ||
            (newFrontFile && newFrontFile.size > 0) ||
            (newBackFile && newBackFile.size > 0);

        if (!anyProvided) continue;

        // start with whatever we had stored (raw keys)
        let frontPathToStore: string | null = existingFront || null;
        let backPathToStore: string | null = existingBack || null;

        // upload new FRONT if present
        if (newFrontFile && newFrontFile.size > 0) {
            const path = await uploadToStorage(newFrontFile, `${productId}/colors/${i}-front`);
            frontPathToStore = path;
        }

        // upload new BACK if present
        if (newBackFile && newBackFile.size > 0) {
            const path = await uploadToStorage(newBackFile, `${productId}/colors/${i}-back`);
            backPathToStore = path;
        }

        if (mode === "existing" && existingId) {
            const { error: updColorErr } = await supabase
                .from("product_colors")
                .update({
                    hex: hex || "#111111",
                    label: label || null,
                    sort_order: i,
                    front_image_path: frontPathToStore,
                    back_image_path: backPathToStore,
                })
                .eq("id", existingId)
                .eq("product_id", productId);
            if (updColorErr) {
                failProductUpdate("dashboard product color update failed", {
                    product_id: productId,
                    color_id: existingId,
                    error: updColorErr.message,
                });
            }
        } else {
            const { error: insColorErr } = await supabase.from("product_colors").insert({
                product_id: productId,
                hex: hex || "#111111",
                label: label || null,
                sort_order: i,
                front_image_path: frontPathToStore,
                back_image_path: backPathToStore,
            });
            if (insColorErr) {
                failProductUpdate("dashboard product color insert failed", {
                    product_id: productId,
                    sort_order: i,
                    error: insColorErr.message,
                });
            }
        }
    }

    if (publish) {
        await assertProductReadyToPublish(productId);
    }

    const { error: updErr } = await supabase
        .from("products")
        .update({
            title,
            description,
            price_cents: Math.round(price * 100),
            currency: "AUD",
            is_published: publish,
            category,
            production_status: publish ? "published" : prod.production_status,
            moderation_status: publish ? "pending_review" : "draft",
            moderation_notes: publish ? "Awaiting operator review after artist product edit publish." : null,
            moderation_reviewed_at: null,
            moderation_reviewed_by: null,
            readiness_notes: publish
                ? "Product edited, publish readiness verified, and queued for moderation review."
                : "Product edited and saved.",
        })
        .eq("id", productId);

    if (updErr) {
        failProductUpdate("dashboard product update failed", {
            product_id: productId,
            artist_id: artist.id,
            error: updErr.message,
        });
    }

    return { ok: true };
}
