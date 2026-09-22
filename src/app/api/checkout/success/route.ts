import { NextRequest } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe/client";
import { getServiceSupabase } from "@/lib/supabase/service";
import { noStoreJson } from "@/lib/api/no-store";
import { rejectCrossOriginRequest } from "@/lib/auth/request-origin";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sessionSchema = z.string().startsWith("cs_").max(255);

export async function GET(req: NextRequest) {
    const rejection = rejectCrossOriginRequest(req);
    if (rejection) return rejection;

    const parsed = sessionSchema.safeParse(req.nextUrl.searchParams.get("session_id"));
    if (!parsed.success) return noStoreJson({ error: "Invalid checkout session" }, { status: 400 });

    try {
        const session = await stripe.checkout.sessions.retrieve(parsed.data, {
            expand: ["line_items.data.price.product"],
        });
        if (session.payment_status !== "paid") {
            return noStoreJson({ status: "pending" }, { status: 202 });
        }

        const service = getServiceSupabase();
        const { data: order } = await service
            .from("orders")
            .select("id, order_number, total_cents, currency, order_items(product_id,title,qty,unit_price_cents,sku,color_label,size_label)")
            .eq("stripe_session_id", session.id)
            .maybeSingle();

        if (!order) return noStoreJson({ status: "processing" }, { status: 202 });

        return noStoreJson({
            status: "paid",
            transaction_id: order.order_number ?? order.id,
            value_cents: order.total_cents ?? session.amount_total ?? 0,
            currency: order.currency ?? session.currency?.toUpperCase() ?? "AUD",
            items: order.order_items ?? [],
        });
    } catch (error) {
        logger.error("checkout success verification failed", {
            error: error instanceof Error ? error.message : String(error),
        });
        return noStoreJson({ status: "processing" }, { status: 202 });
    }
}
