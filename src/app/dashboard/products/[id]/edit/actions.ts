// app/dashboard/products/[id]/edit/actions.ts
"use server";

import { randomUUID } from "crypto";
import { getServerSupabase } from "@/lib/supabase/server";

function cleanFilename(name: string) {
    return name.replace(/\s+/g, "_");
}

const ALLOWED_CATEGORIES = [
    "tees",
    "hoodies",
    "tanks",
    "posters",
    "vinyl",
    "accessories",
    "other",
];

export async function updateProductAction(formData: FormData) {
    const supabase = getServerSupabase();

    // ─── AUTH / OWNERSHIP ───────────────────────────────
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");

    const productId = String(formData.get("product_id") || "").trim();
    if (!productId) throw new Error("Missing product_id");

    const { data: artist } = await supabase
        .from("artists")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
    if (!artist) throw new Error("No artist profile");

    const { data: prod } = await supabase
        .from("products")
        .select("id, artist_id")
        .eq("id", productId)
        .maybeSingle();
    if (!prod || prod.artist_id !== artist.id) {
        throw new Error("You do not own this product");
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

    {
        const { error: updErr } = await supabase
            .from("products")
            .update({
                title,
                description,
                price_cents: Math.round(price * 100),
                currency: "AUD",
                is_published: publish,
                category,
            })
            .eq("id", productId);
        if (updErr) throw new Error(updErr.message);
    }

    // ─── HELPERS ────────────────────────────────────────
    async function uploadToStorage(file: File, path: string) {
        const bytes = await file.arrayBuffer();
        const { error: upErr } = await supabase.storage
            .from("product-images")
            .upload(path, Buffer.from(bytes), {
                contentType: file.type,
                upsert: true,
            });
        if (upErr) throw new Error(upErr.message);
        return path;
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
        if (selErr) throw new Error(selErr.message);

        if (existing?.id) {
            // 2) update by id
            const { error: updErr } = await supabase
                .from("product_images")
                .update({
                    path: opts.path,
                    side: opts.side,
                })
                .eq("id", existing.id);
            if (updErr) throw new Error(updErr.message);
        } else {
            // 3) insert
            const { error: insErr } = await supabase.from("product_images").insert({
                product_id: opts.product_id,
                path: opts.path,
                side: opts.side,
                sort_order: opts.sort_order,
            });
            if (insErr) throw new Error(insErr.message);
        }
    }

    // ─── FRONT IMAGE (optional) ─────────────────────────
    const fileFront = formData.get("image_front") as File | null;
    if (fileFront && fileFront.size > 0) {
        const storagePath = `${productId}/${randomUUID()}-${cleanFilename(
            fileFront.name
        )}`;
        await uploadToStorage(fileFront, storagePath);
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
        const storagePath = `${productId}/${randomUUID()}-${cleanFilename(
            fileBack.name
        )}`;
        await uploadToStorage(fileBack, storagePath);
        await upsertProductImageBySelect({
            product_id: productId,
            path: storagePath,
            side: "back",
            sort_order: 1,
        });
    }

    // ─── COLOURS ─────────────────────────────────────────
    const colorCount = Number(formData.get("colors_count") || "0");

    // delete only what user removed
    const removedIds = formData.getAll("remove_color_id") as string[];
    if (removedIds.length) {
        const { error: delErr } = await supabase
            .from("product_colors")
            .delete()
            .in("id", removedIds);
        if (delErr) throw new Error(delErr.message);
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
            const path = `${productId}/colors/${i}-front-${cleanFilename(
                newFrontFile.name
            )}`;
            await uploadToStorage(newFrontFile, path);
            frontPathToStore = path;
        }

        // upload new BACK if present
        if (newBackFile && newBackFile.size > 0) {
            const path = `${productId}/colors/${i}-back-${cleanFilename(
                newBackFile.name
            )}`;
            await uploadToStorage(newBackFile, path);
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
            if (updColorErr) throw new Error(updColorErr.message);
        } else {
            const { error: insColorErr } = await supabase.from("product_colors").insert({
                product_id: productId,
                hex: hex || "#111111",
                label: label || null,
                sort_order: i,
                front_image_path: frontPathToStore,
                back_image_path: backPathToStore,
            });
            if (insColorErr) throw new Error(insColorErr.message);
        }
    }

    return { ok: true };
}
