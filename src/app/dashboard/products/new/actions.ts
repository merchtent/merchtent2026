// app/dashboard/products/new/actions.ts
"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { toSlug } from "@/lib/slug";

export async function createProductAction(formData: FormData) {
    const supabase = getServerSupabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");

    const { data: artist } = await supabase
        .from("artists")
        .select("id")
        .eq("user_id", user.id)
        .single();
    if (!artist) throw new Error("No artist profile");

    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const baseSlug = toSlug(title) || `product-${crypto.randomUUID().slice(0, 8)}`;
    const price = Number(formData.get("price") || "0");
    const publish = formData.get("publish") !== null;
    if (!title || price <= 0) throw new Error("Invalid input");

    // 1) create product
    const { data: product, error: prodErr } = await supabase
        .from("products")
        .insert({
            artist_id: artist.id,
            title,
            slug: baseSlug,
            description,
            price_cents: Math.round(price * 100),
            currency: "AUD",
            is_published: !!publish,
        })
        .select("id")
        .single();
    if (prodErr) throw new Error(prodErr.message);

    // helper for main images
    async function uploadAndInsert(
        file: File,
        side: "front" | "back",
        sort_order: number
    ) {
        const bytes = await file.arrayBuffer();
        const safeName = file.name.replace(/\s+/g, "_");
        const path = `${product?.id}/${randomUUID()}-${safeName}`;
        const { error: uploadErr } = await supabase.storage
            .from("product-images")
            .upload(path, Buffer.from(bytes), {
                contentType: file.type,
                upsert: true,
            });
        if (uploadErr) throw new Error(uploadErr.message);

        const { error: imgErr } = await supabase
            .from("product_images")
            .insert({ product_id: product?.id, path, sort_order, side });
        if (imgErr) throw new Error(imgErr.message);

        return path;
    }

    // 2) primary
    const fileFront = formData.get("image") as File | null;
    if (!fileFront) throw new Error("Primary image required");
    await uploadAndInsert(fileFront, "front", 0);

    // 3) optional back
    const fileBack = formData.get("image_back") as File | null;
    if (fileBack && fileBack.size > 0) {
        await uploadAndInsert(fileBack, "back", 1);
    }

    // 4) dynamic colours
    const colorsCount = Number(formData.get("colors_count") || "0");
    for (let i = 0; i < colorsCount; i++) {
        const hex = String(formData.get(`color_${i}_hex`) || "").trim();
        const label = String(formData.get(`color_${i}_label`) || "").trim();
        const frontFile = formData.get(`color_${i}_front`) as File | null;
        const backFile = formData.get(`color_${i}_back`) as File | null;

        if (!hex && !label && !frontFile && !backFile) continue;

        let frontPath: string | null = null;
        let backPath: string | null = null;

        if (frontFile && frontFile.size > 0) {
            const bytes = await frontFile.arrayBuffer();
            const safeName = frontFile.name.replace(/\s+/g, "_");
            frontPath = `${product.id}/colors/${i}-front-${safeName}`;
            const { error: upErr } = await supabase.storage
                .from("product-images")
                .upload(frontPath, Buffer.from(bytes), {
                    contentType: frontFile.type,
                    upsert: true,
                });
            if (upErr) throw new Error(upErr.message);
        }

        if (backFile && backFile.size > 0) {
            const bytes = await backFile.arrayBuffer();
            const safeName = backFile.name.replace(/\s+/g, "_");
            backPath = `${product.id}/colors/${i}-back-${safeName}`;
            const { error: upErr } = await supabase.storage
                .from("product-images")
                .upload(backPath, Buffer.from(bytes), {
                    contentType: backFile.type,
                    upsert: true,
                });
            if (upErr) throw new Error(upErr.message);
        }

        const { error: colorInsertErr } = await supabase.from("product_colors").insert({
            product_id: product.id,
            hex: hex || "#111111",
            label: label || null,
            sort_order: i,
            front_image_path: frontPath,
            back_image_path: backPath,
        });

        if (colorInsertErr) {
            console.warn("failed to insert product color", i, colorInsertErr.message);
        }
    }

    redirect("/dashboard/products");
}
