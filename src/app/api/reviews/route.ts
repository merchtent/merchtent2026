import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { getWritableServerSupabase } from "@/lib/supabase/server-action";
import { noStoreJson } from "@/lib/api/no-store";
import { rejectCrossOriginRequest } from "@/lib/auth/request-origin";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const productSchema = z.uuid();
const reviewSchema = z.object({ order_item_id: z.uuid(), rating: z.number().int().min(1).max(5), text: z.string().trim().min(10).max(2000) });

export async function GET(req: Request) {
    const productId = productSchema.safeParse(new URL(req.url).searchParams.get("product_id"));
    if (!productId.success) return noStoreJson({ eligible: [] });
    const supabase = getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return noStoreJson({ eligible: [] });
    const { data, error } = await supabase.rpc("eligible_product_review_items", { p_product_id: productId.data });
    if (error) return noStoreJson({ eligible: [] });
    return noStoreJson({ eligible: data ?? [] });
}

export async function POST(req: Request) {
    const rejection = rejectCrossOriginRequest(req);
    if (rejection) return rejection;
    const parsed = reviewSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return noStoreJson({ error: "Choose a rating and write at least 10 characters." }, { status: 400 });
    const supabase = getWritableServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return noStoreJson({ error: "Sign in to review a delivered order." }, { status: 401 });
    const { data, error } = await supabase.rpc("submit_verified_product_review", {
        p_order_item_id: parsed.data.order_item_id,
        p_rating: parsed.data.rating,
        p_text: parsed.data.text,
    });
    if (error) {
        logger.warn("verified review submission rejected", { user_id: user.id, error: error.message });
        return noStoreJson({ error: "This order item is not eligible or has already been reviewed." }, { status: 400 });
    }
    return noStoreJson({ ok: true, review_id: data });
}
