export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";
import { noStoreJson } from "@/lib/api/no-store";
import { requireAdmin } from "@/lib/auth/admin";
import { getErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { stripe } from "@/lib/stripe/client";
import { getServiceSupabase } from "@/lib/supabase/service";

const inputSchema = z.object({
    action: z.enum(["cancel", "refund"]),
    reason: z.string().trim().min(5).max(500),
});

const terminalStatuses = new Set(["cancelled", "refunded"]);
const cancellableStatuses = new Set(["pending", "processing", "paid"]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
        return noStoreJson({ error: "Invalid order." }, { status: 400 });
    }

    const parsed = inputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return noStoreJson({ error: "Choose an action and provide a reason." }, { status: 400 });
    }

    const serviceSupabase = getServiceSupabase();
    const { data: order, error: orderError } = await serviceSupabase
        .from("orders")
        .select("id, status, stripe_payment_intent, total_cents, currency")
        .eq("id", id)
        .maybeSingle();

    if (orderError) {
        logger.error("Admin terminal order lookup failed", { order_id: id, error: orderError.message });
        return noStoreJson({ error: "Could not load the order." }, { status: 500 });
    }
    if (!order) return noStoreJson({ error: "Order not found." }, { status: 404 });
    if (terminalStatuses.has(order.status)) {
        return noStoreJson({ error: "This order is already cancelled or refunded." }, { status: 409 });
    }
    if (parsed.data.action === "cancel" && !cancellableStatuses.has(order.status)) {
        return noStoreJson(
            { error: "Production has started. Use a refund instead of cancelling this order." },
            { status: 409 }
        );
    }

    const needsRefund = parsed.data.action === "refund" || Boolean(order.stripe_payment_intent);
    if (needsRefund && !order.stripe_payment_intent) {
        return noStoreJson({ error: "This order has no Stripe payment to refund." }, { status: 409 });
    }

    let stripeRefundId: string | null = null;
    try {
        if (needsRefund) {
            const refund = await stripe.refunds.create({
                payment_intent: order.stripe_payment_intent,
                reason: "requested_by_customer",
                metadata: {
                    order_id: order.id,
                    admin_user_id: auth.user.id,
                    operator_reason: parsed.data.reason.slice(0, 500),
                },
            }, {
                idempotencyKey: `admin-order-full-refund:${order.id}`,
            });
            stripeRefundId = refund.id;
        }

        const targetStatus = needsRefund ? "refunded" : "cancelled";
        const { error: transitionError } = await serviceSupabase.rpc(
            "admin_complete_order_terminal_action",
            {
                p_order_id: order.id,
                p_actor_user_id: auth.user.id,
                p_status: targetStatus,
                p_reason: parsed.data.reason,
                p_stripe_refund_id: stripeRefundId,
            }
        );

        if (transitionError) throw transitionError;

        const caseType = targetStatus === "refunded" ? "refund" : "cancellation";
        const { data: serviceCase, error: serviceCaseError } = await serviceSupabase.rpc(
            "admin_create_order_service_case",
            {
                p_order_id: order.id,
                p_actor_user_id: auth.user.id,
                p_case_type: caseType,
                p_summary: parsed.data.reason,
                p_priority: "normal",
                p_customer_request: parsed.data.reason,
                p_order_item_ids: [],
                p_refund_amount_cents: needsRefund ? order.total_cents : null,
                p_stripe_refund_id: stripeRefundId,
            }
        );

        if (serviceCaseError || !serviceCase?.id) {
            throw serviceCaseError ?? new Error("Terminal action case was not created.");
        }

        const { error: caseResolutionError } = await serviceSupabase.rpc(
            "admin_update_order_service_case",
            {
                p_case_id: serviceCase.id,
                p_actor_user_id: auth.user.id,
                p_status: "resolved",
                p_note: targetStatus === "refunded" ? "Full Stripe refund completed." : "Order cancellation completed.",
                p_resolution: parsed.data.reason,
                p_assigned_to: auth.user.id,
                p_supplier_reference: null,
            }
        );

        if (caseResolutionError) throw caseResolutionError;

        return noStoreJson({
            ok: true,
            status: targetStatus,
            stripeRefundId,
            serviceCaseNumber: serviceCase.case_number,
            refundedAmountCents: needsRefund ? order.total_cents : 0,
            currency: order.currency,
        });
    } catch (error) {
        logger.error("Admin terminal order action failed", {
            order_id: order.id,
            admin_user_id: auth.user.id,
            action: parsed.data.action,
            stripe_refund_id: stripeRefundId,
            error: getErrorMessage(error),
        });
        return noStoreJson(
            { error: stripeRefundId ? "Payment was refunded, but the order update needs operator review." : "The order action could not be completed." },
            { status: 500 }
        );
    }
}
