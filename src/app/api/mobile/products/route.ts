import "server-only";

import { randomUUID } from "crypto";
import { z } from "zod";
import { toSlug } from "@/lib/slug";
import { requestExceedsImageUploadLimit, safeImageUploadFilename, validateImageBytes, validateImageFile } from "@/lib/uploads";
import { checkDurableRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { getBearerSupabase } from "@/lib/supabase/bearer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inputSchema = z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2_000),
    category: z.enum(["tees", "hoodies", "hats", "tanks", "bags", "posters", "vinyl", "accessories", "other"]),
    price: z.coerce.number().finite().min(1).max(2_000),
    publish: z.boolean(),
});

export async function POST(request: Request) {
    if (requestExceedsImageUploadLimit(request)) {
        return Response.json({ error: "Image must be 8MB or smaller." }, { status: 413 });
    }
    const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return Response.json({ error: "Sign in required." }, { status: 401 });

    const supabase = getBearerSupabase(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Sign in required." }, { status: 401 });

    const [{ data: profile }, { data: artist }] = await Promise.all([
        supabase.from("profiles").select("account_type, onboarding_completed").eq("id", user.id).maybeSingle(),
        supabase.from("artists").select("id").eq("user_id", user.id).maybeSingle(),
    ]);
    if (profile?.account_type !== "artist" || !profile.onboarding_completed || !artist) {
        return Response.json({ error: "Artist account required." }, { status: 403 });
    }

    const allowed = await checkDurableRateLimit(
        supabase,
        `manual_product_create:${artist.id}:${user.id}`,
        12,
        60 * 60 * 1000,
        "check_public_rate_limit",
        { fallback: "deny" }
    );
    if (!allowed) return Response.json({ error: "Too many product attempts. Try again later." }, { status: 429 });

    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return Response.json({ error: "Invalid upload." }, { status: 400 });
    }
    const parsed = inputSchema.safeParse({
        title: form.get("title"),
        description: form.get("description") ?? "",
        category: form.get("category") ?? "tees",
        price: form.get("price"),
        publish: form.get("publish") === "true",
    });
    if (!parsed.success) return Response.json({ error: "Invalid product details." }, { status: 400 });

    const image = form.get("image");
    if (!(image instanceof File) || image.size === 0) {
        return Response.json({ error: "A product photo is required." }, { status: 400 });
    }
    let bytes: ArrayBuffer;
    let contentType: string;
    try {
        validateImageFile(image);
        bytes = await image.arrayBuffer();
        contentType = validateImageBytes(bytes, image.type);
    } catch {
        return Response.json({ error: "Please use a valid product image." }, { status: 400 });
    }

    const { title, description, category, price, publish } = parsed.data;
    const slug = `${toSlug(title) || "product"}-${randomUUID().slice(0, 8)}`;
    let productId: string | null = null;
    let imagePath: string | null = null;
    try {
        const { data: product, error: insertError } = await supabase.from("products").insert({
            artist_id: artist.id,
            title,
            description,
            category,
            price_cents: Math.round(price * 100),
            currency: "AUD",
            slug,
            is_published: false,
            fulfillment_flow: "manual_fulfillment",
            production_status: "generating",
            moderation_status: "draft",
            readiness_notes: "Mobile product upload in progress.",
        }).select("id").single();
        if (insertError || !product) throw insertError ?? new Error("Product insert failed");
        productId = product.id;

        imagePath = `${product.id}/${randomUUID()}-${safeImageUploadFilename(image.name, contentType)}`;
        const { error: uploadError } = await supabase.storage.from("product-images")
            .upload(imagePath, Buffer.from(bytes), { contentType, upsert: false });
        if (uploadError) throw uploadError;

        const { error: imageError } = await supabase.from("product_images").insert({
            product_id: product.id, path: imagePath, sort_order: 0, side: "front",
        });
        if (imageError) throw imageError;

        const { error: eventError } = await supabase.from("product_generation_events").insert({
            product_id: product.id,
            product_design_id: null,
            artist_id: artist.id,
            status: publish ? "published" : "validated",
            renderer: "manual-upload",
            renderer_version: "mobile-v1",
            message: publish ? "Mobile product submitted for review." : "Mobile product saved as draft.",
            metadata: { category, source: "android" },
        });
        if (eventError) throw eventError;

        const { error: finishError } = await supabase.from("products").update({
            is_published: publish,
            production_status: publish ? "published" : "generated",
            moderation_status: publish ? "pending_review" : "draft",
            moderation_notes: publish ? "Awaiting operator review after mobile product publish." : null,
            readiness_notes: publish
                ? "Mobile product uploaded and queued for moderation review."
                : "Mobile product saved as draft.",
        }).eq("id", product.id).eq("artist_id", artist.id);
        if (finishError) throw finishError;

        return Response.json({ product_id: product.id, status: publish ? "pending_review" : "draft" }, { status: 201 });
    } catch (error) {
        logger.error("mobile product creation failed", {
            artist_id: artist.id,
            product_id: productId,
            error: error instanceof Error ? error.message : "Unknown error",
        });
        if (productId) {
            await supabase.from("products").update({
                is_published: false,
                production_status: "failed",
                moderation_status: "draft",
                readiness_notes: "Mobile product upload failed. Review before publishing.",
            }).eq("id", productId).eq("artist_id", artist.id);
        }
        if (imagePath) await supabase.storage.from("product-images").remove([imagePath]);
        return Response.json({ error: "Could not create product. Please try again." }, { status: 500 });
    }
}
