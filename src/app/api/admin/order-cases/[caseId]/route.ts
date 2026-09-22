export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";
import { noStoreJson } from "@/lib/api/no-store";
import { requireAdmin } from "@/lib/auth/admin";
import { getErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getServiceSupabase } from "@/lib/supabase/service";

const inputSchema = z.object({
    status: z.enum(["open", "awaiting_customer", "awaiting_supplier", "approved", "in_progress", "resolved", "rejected", "cancelled"]),
    note: z.string().trim().min(3).max(2000),
    resolution: z.string().trim().max(2000).optional(),
    supplierReference: z.string().trim().max(255).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ caseId: string }> }) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    const { caseId } = await params;
    if (!z.string().uuid().safeParse(caseId).success) {
        return noStoreJson({ error: "Invalid service case." }, { status: 400 });
    }

    const parsed = inputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return noStoreJson({ error: "Choose a status and add an update note." }, { status: 400 });
    }

    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase.rpc("admin_update_order_service_case", {
            p_case_id: caseId,
            p_actor_user_id: auth.user.id,
            p_status: parsed.data.status,
            p_note: parsed.data.note,
            p_resolution: parsed.data.resolution || null,
            p_assigned_to: null,
            p_supplier_reference: parsed.data.supplierReference || null,
        });

        if (error) throw error;
        return noStoreJson({ ok: true, serviceCase: data });
    } catch (error) {
        logger.error("Admin order service case update failed", {
            service_case_id: caseId,
            actor_user_id: auth.user.id,
            status: parsed.data.status,
            error: getErrorMessage(error),
        });
        return noStoreJson({ error: "The service case could not be updated." }, { status: 500 });
    }
}
