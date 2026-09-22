export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";
import { noStoreJson } from "@/lib/api/no-store";
import { requireAdmin } from "@/lib/auth/admin";
import { getErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getServiceSupabase } from "@/lib/supabase/service";

const inputSchema = z.object({
    caseType: z.enum(["return", "reprint", "refund", "cancellation"]),
    priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
    summary: z.string().trim().min(5).max(500),
    customerRequest: z.string().trim().max(2000).optional(),
    orderItemIds: z.array(z.string().uuid()).max(50).default([]),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
        return noStoreJson({ error: "Invalid order." }, { status: 400 });
    }

    const parsed = inputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return noStoreJson({ error: "Choose a case type and add a clear summary." }, { status: 400 });
    }

    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase.rpc("admin_create_order_service_case", {
            p_order_id: id,
            p_actor_user_id: auth.user.id,
            p_case_type: parsed.data.caseType,
            p_summary: parsed.data.summary,
            p_priority: parsed.data.priority,
            p_customer_request: parsed.data.customerRequest || null,
            p_order_item_ids: parsed.data.orderItemIds,
            p_refund_amount_cents: null,
            p_stripe_refund_id: null,
        });

        if (error) throw error;
        return noStoreJson({ ok: true, serviceCase: data }, { status: 201 });
    } catch (error) {
        logger.error("Admin order service case creation failed", {
            order_id: id,
            actor_user_id: auth.user.id,
            case_type: parsed.data.caseType,
            error: getErrorMessage(error),
        });
        return noStoreJson({ error: "The service case could not be created." }, { status: 500 });
    }
}
