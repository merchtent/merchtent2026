import "server-only";

import { z } from "zod";
import { logger } from "@/lib/logger";
import { checkDurableRateLimit } from "@/lib/rate-limit";
import { getBearerSupabase } from "@/lib/supabase/bearer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const editSchema = z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2_000),
    price: z.coerce.number().finite().min(1).max(2_000),
    publish: z.boolean(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
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

    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) {
        return Response.json({ error: "Invalid product." }, { status: 400 });
    }
    const allowed = await checkDurableRateLimit(supabase, `mobile_product_edit:${artist.id}:${user.id}`, 60,
        60 * 60 * 1000, "check_public_rate_limit", { fallback: "deny" });
    if (!allowed) return Response.json({ error: "Too many edits. Try again later." }, { status: 429 });

    let body: unknown;
    try { body = await request.json(); }
    catch { return Response.json({ error: "Invalid product details." }, { status: 400 }); }
    const parsed = editSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: "Invalid product details." }, { status: 400 });

    const { data: product, error: productError } = await supabase.from("products")
        .select("id, artist_id, production_status, fulfillment_flow")
        .eq("id", id).eq("artist_id", artist.id).maybeSingle();
    if (productError) {
        logger.error("mobile product edit lookup failed", { product_id: id, artist_id: artist.id, error: productError.message });
        return Response.json({ error: "Could not load product." }, { status: 500 });
    }
    if (!product) return Response.json({ error: "Product not found." }, { status: 404 });
    if (product.fulfillment_flow !== "manual_fulfillment") {
        return Response.json({ error: "Use the product designer to edit this item." }, { status: 409 });
    }

    const { title, description, price, publish } = parsed.data;
    if (publish) {
        if (product.production_status === "failed" || product.production_status === "generating") {
            return Response.json({ error: "Product assets are not ready to publish." }, { status: 409 });
        }
        const { count, error: imageError } = await supabase.from("product_images")
            .select("id", { count: "exact", head: true }).eq("product_id", id);
        if (imageError || !count) {
            return Response.json({ error: "A product image is required before review." }, { status: 409 });
        }
    }

    const { error: updateError } = await supabase.from("products").update({
        title,
        description,
        price_cents: Math.round(price * 100),
        is_published: publish,
        production_status: publish ? "published" : "generated",
        moderation_status: publish ? "pending_review" : "draft",
        moderation_notes: publish ? "Awaiting operator review after mobile product edit." : null,
        moderation_reviewed_at: null,
        moderation_reviewed_by: null,
        readiness_notes: publish ? "Mobile edit submitted for review." : "Mobile edit saved as draft.",
    }).eq("id", id).eq("artist_id", artist.id);
    if (updateError) {
        logger.error("mobile product edit failed", { product_id: id, artist_id: artist.id, error: updateError.message });
        return Response.json({ error: "Could not save changes." }, { status: 500 });
    }
    return Response.json({ status: publish ? "pending_review" : "draft" });
}
