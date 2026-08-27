"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getServiceSupabase } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import {
    sendOrderConfirmationEmail,
    sendOrderConfirmationSms,
} from "@/lib/notifications/order-confirmation";
import { requireAdminAction } from "@/lib/auth/admin";
import { sendCashOutStripeTransfer } from "@/lib/cash-outs/stripe-transfer";
import { repairProductGenerationAssets } from "@/lib/products/generation-repair";
import { attemptPrintifyFulfillmentForOrder } from "@/lib/printify/fulfillment";
import { recordPlatformEvent } from "@/lib/platform-events";
import { submitFulfillmentJobToPrintify } from "../fulfillment/actions";

const STALE_WEBHOOK_PROCESSING_MINUTES = 15;
const STALE_PRODUCT_GENERATION_MINUTES = 30;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function expireStaleMerchCreditReservations() {
    const { user } = await requireAdminAction();
    const serviceSupabase = getServiceSupabase();
    const { data, error } = await serviceSupabase.rpc("expire_merch_credit_reservations");

    if (error) {
        logger.error("Merch credit reservation expiry failed", {
            actor_user_id: user.id,
            error: error.message,
        });
        throw new Error("Could not expire stale merch credit reservations.");
    }

    const expiredCount = Number(data ?? 0);
    await recordPlatformEvent(
        {
            scope: "credits",
            action: "stale_merch_credit_reservations_expired",
            severity: "info",
            actorUserId: user.id,
            message: "Admin expired stale merch credit reservations.",
            metadata: { expired_count: expiredCount },
        },
        {
            supabase: serviceSupabase,
            failureLogMessage: "Merch credit expiry platform event failed",
            failureContext: {
                actor_user_id: user.id,
                expired_count: expiredCount,
            },
            throwOnFailure: true,
            failurePublicMessage: "Could not audit merch credit cleanup.",
        }
    );

    revalidatePath("/admin/operations");
    return { expiredCount };
}

export async function adjustMerchCredits(input: {
    userId: string;
    points: number;
    description: string;
}) {
    const { user } = await requireAdminAction();
    const serviceSupabase = getServiceSupabase();
    const targetUserId = input.userId.trim();
    const points = Number(input.points);
    const description = input.description.trim().slice(0, 500);

    if (!UUID_PATTERN.test(targetUserId)) {
        throw new Error("Enter a valid user id.");
    }

    if (!Number.isInteger(points) || points === 0 || Math.abs(points) > 10_000) {
        throw new Error("Credit adjustment must be a non-zero whole number up to 10,000 points.");
    }

    if (description.length < 8) {
        throw new Error("Credit adjustment requires a clear reason.");
    }

    const idempotencyKey = `admin-credit-adjustment:${user.id}:${targetUserId}:${randomUUID()}`;
    const { data, error } = await serviceSupabase.rpc("admin_adjust_merch_credits", {
        p_actor_user_id: user.id,
        p_user_id: targetUserId,
        p_points: points,
        p_description: description,
        p_idempotency_key: idempotencyKey,
        p_metadata: {
            source: "admin_operations",
        },
    });

    if (error) {
        logger.error("Admin merch credit adjustment failed", {
            actor_user_id: user.id,
            target_user_id: targetUserId,
            points,
            error: error.message,
        });
        throw new Error("Could not adjust merch credits.");
    }

    revalidatePath("/admin/operations");
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/orders");
    revalidatePath("/dashboard/orders");

    return {
        ok: true,
        ledgerId: String((data as { ledger_id?: unknown } | null)?.ledger_id ?? ""),
        points,
        message: `${points > 0 ? "Added" : "Removed"} ${Math.abs(points)} merch credits.`,
    };
}

export async function retryOrderNotification(deliveryId: string) {
    const { user } = await requireAdminAction();
    const serviceSupabase = getServiceSupabase();
    const { data: delivery, error } = await serviceSupabase
        .from("notification_deliveries")
        .select("id, order_id, channel")
        .eq("id", deliveryId)
        .maybeSingle();

    if (error) {
        logger.error("Notification delivery retry lookup failed", {
            actor_user_id: user.id,
            delivery_id: deliveryId,
            error: error.message,
        });
        throw new Error("Could not load notification delivery.");
    }

    if (!delivery) {
        throw new Error("Notification delivery not found.");
    }

    if (delivery.channel !== "email" && delivery.channel !== "sms") {
        throw new Error("Only order confirmation notifications can be retried from this action.");
    }

    if (!delivery.order_id) {
        throw new Error("Notification delivery is not linked to an order.");
    }

    const result =
        delivery.channel === "email"
            ? await sendOrderConfirmationEmail({
                orderId: delivery.order_id,
                actorUserId: user.id,
            })
            : await sendOrderConfirmationSms({
                orderId: delivery.order_id,
                actorUserId: user.id,
            });

    revalidatePath("/admin/operations");
    return { ...result, channel: delivery.channel };
}

export async function markStaleStripeWebhooksFailed() {
    const { user } = await requireAdminAction();
    const serviceSupabase = getServiceSupabase();

    const { data, error } = await serviceSupabase.rpc("admin_mark_stale_stripe_webhooks_failed", {
        p_actor_user_id: user.id,
        p_stale_after_minutes: STALE_WEBHOOK_PROCESSING_MINUTES,
        p_limit: 100,
    });

    if (error) {
        logger.error("Stale Stripe webhook cleanup failed", {
            actor_user_id: user.id,
            stale_after_minutes: STALE_WEBHOOK_PROCESSING_MINUTES,
            error: error.message,
        });
        throw new Error("Could not mark stale Stripe webhooks as failed.");
    }

    revalidatePath("/admin/operations");
    return { markedCount: Number(data?.marked_count ?? 0) };
}

export async function markStaleProductGenerationsFailed() {
    const { user } = await requireAdminAction();
    const serviceSupabase = getServiceSupabase();

    const { data, error } = await serviceSupabase.rpc("system_mark_stale_product_generations_failed", {
        p_stale_after_minutes: STALE_PRODUCT_GENERATION_MINUTES,
        p_limit: 100,
    });

    if (error) {
        logger.error("Stale product generation cleanup failed", {
            actor_user_id: user.id,
            stale_after_minutes: STALE_PRODUCT_GENERATION_MINUTES,
            error: error.message,
        });
        throw new Error("Could not mark stale product generations as failed.");
    }

    const markedCount = Number(data?.marked_count ?? 0);
    await recordPlatformEvent(
        {
            scope: "product_generation",
            action: "admin_stale_product_generations_checked",
            severity: "info",
            actorUserId: user.id,
            message: "Admin checked stale product generation cleanup.",
            metadata: {
                marked_count: markedCount,
                stale_after_minutes: STALE_PRODUCT_GENERATION_MINUTES,
            },
        },
        {
            supabase: serviceSupabase,
            failureLogMessage: "Stale product generation cleanup platform event failed",
            failureContext: {
                actor_user_id: user.id,
                marked_count: markedCount,
            },
            throwOnFailure: true,
            failurePublicMessage: "Could not audit stale product generation cleanup.",
        }
    );

    revalidatePath("/admin/operations");
    revalidatePath("/admin/products");
    revalidatePath("/dashboard/products");

    return { markedCount };
}

type CashOutRetryRow = {
    id: string;
    artist_id: string;
    total_cents: number | null;
    status: string | null;
};

type StripeFinancialReviewStatus = "investigating" | "resolved" | "ignored";

const STRIPE_FINANCIAL_REVIEW_STATUSES = new Set<string>([
    "investigating",
    "resolved",
    "ignored",
]);

type StripeFinancialEventRow = {
    id: string;
    stripe_event_id: string;
    stripe_event_type: string;
    review_status: string;
    order_id: string | null;
    severity: string;
};

export async function reviewStripeFinancialEvent(
    eventId: string,
    status: StripeFinancialReviewStatus,
    notes = ""
) {
    const { user } = await requireAdminAction();
    const serviceSupabase = getServiceSupabase();
    const cleanNotes = notes.trim().slice(0, 1000);

    if (!STRIPE_FINANCIAL_REVIEW_STATUSES.has(status)) {
        throw new Error("Invalid Stripe financial review status.");
    }

    const { data: event, error: eventError } = await serviceSupabase
        .from("stripe_financial_events")
        .select("id, stripe_event_id, stripe_event_type, review_status, order_id, severity")
        .eq("id", eventId)
        .maybeSingle();

    if (eventError) {
        logger.error("Stripe financial event review lookup failed", {
            actor_user_id: user.id,
            stripe_financial_event_id: eventId,
            review_status: status,
            error: eventError.message,
        });
        throw new Error("Could not load Stripe financial event.");
    }

    if (!event) {
        throw new Error("Stripe financial event not found.");
    }

    const typedEvent = event as StripeFinancialEventRow;
    const now = new Date().toISOString();
    const { error: updateError } = await serviceSupabase
        .from("stripe_financial_events")
        .update({
            review_status: status,
            resolved_at: status === "resolved" || status === "ignored" ? now : null,
            resolved_by: status === "resolved" || status === "ignored" ? user.id : null,
            resolution_notes: cleanNotes || null,
        })
        .eq("id", typedEvent.id);

    if (updateError) {
        logger.error("Stripe financial event review update failed", {
            actor_user_id: user.id,
            stripe_financial_event_id: typedEvent.id,
            stripe_event_id: typedEvent.stripe_event_id,
            review_status: status,
            error: updateError.message,
        });
        throw new Error("Could not update Stripe financial review.");
    }

    await recordPlatformEvent(
        {
            scope: "stripe_financial_review",
            action: `stripe_financial_event_${status}`,
            severity: status === "resolved" || status === "ignored" ? "info" : "warning",
            actorUserId: user.id,
            orderId: typedEvent.order_id,
            externalId: typedEvent.stripe_event_id,
            message: "Admin updated Stripe financial event review status.",
            metadata: {
                stripe_financial_event_id: typedEvent.id,
                stripe_event_type: typedEvent.stripe_event_type,
                previous_review_status: typedEvent.review_status,
                review_status: status,
                financial_event_severity: typedEvent.severity,
                resolution_notes: cleanNotes || null,
            },
        },
        {
            supabase: serviceSupabase,
            failureLogMessage: "Stripe financial event review platform event failed",
            failureContext: {
                actor_user_id: user.id,
                stripe_financial_event_id: typedEvent.id,
                stripe_event_id: typedEvent.stripe_event_id,
                review_status: status,
            },
            throwOnFailure: true,
            failurePublicMessage: "Could not audit Stripe financial review.",
        }
    );

    revalidatePath("/admin/operations");
    if (typedEvent.order_id) {
        revalidatePath(`/admin/orders/${typedEvent.order_id}`);
    }

    return {
        ok: true,
        status,
        message: `Stripe financial event marked ${status.replaceAll("_", " ")}.`,
    };
}

export async function retryPayoutTransfer(cashOutId: string) {
    await requireAdminAction();
    const serviceSupabase = getServiceSupabase();

    const { data: cashOut, error: cashOutError } = await serviceSupabase
        .from("cash_outs")
        .select("id, artist_id, total_cents, status")
        .eq("id", cashOutId)
        .maybeSingle();

    if (cashOutError) {
        logger.error("Payout retry cash out lookup failed", {
            cash_out_id: cashOutId,
            error: cashOutError.message,
        });
        throw new Error("Could not load cash out.");
    }

    if (!cashOut) {
        throw new Error("Cash out not found.");
    }

    const typedCashOut = cashOut as CashOutRetryRow;
    if (typedCashOut.status === "paid") {
        return { ok: true, message: "This cash out has already been paid." };
    }

    if ((typedCashOut.total_cents ?? 0) <= 0) {
        throw new Error("Cash out amount is invalid.");
    }

    const { data: transfer, error: transferError } = await serviceSupabase
        .from("artist_transfers")
        .select("status")
        .eq("cash_out_id", typedCashOut.id)
        .maybeSingle();

    if (transferError) {
        logger.error("Payout retry transfer ledger lookup failed", {
            cash_out_id: typedCashOut.id,
            artist_id: typedCashOut.artist_id,
            error: transferError.message,
        });
        throw new Error("Could not load payout transfer ledger.");
    }

    if (transfer?.status === "succeeded") {
        return { ok: true, message: "This transfer has already succeeded." };
    }

    const { data: paymentAccount, error: paymentAccountError } = await serviceSupabase
        .from("artist_payment_accounts")
        .select("stripe_account_id, payouts_enabled, details_submitted")
        .eq("artist_id", typedCashOut.artist_id)
        .maybeSingle();

    if (paymentAccountError) {
        logger.error("Payout retry payment account lookup failed", {
            cash_out_id: typedCashOut.id,
            artist_id: typedCashOut.artist_id,
            error: paymentAccountError.message,
        });
        throw new Error("Could not load Stripe payout account.");
    }

    if (!paymentAccount) {
        throw new Error("Stripe payout account not found.");
    }

    if (!paymentAccount.payouts_enabled || !paymentAccount.details_submitted) {
        throw new Error("Stripe payouts must be connected before retrying this cash out.");
    }

    await sendCashOutStripeTransfer({
        cashOutId: typedCashOut.id,
        artistId: typedCashOut.artist_id,
        amountCents: typedCashOut.total_cents ?? 0,
        destinationAccountId: paymentAccount.stripe_account_id,
    });

    revalidatePath("/admin/operations");
    revalidatePath("/admin/fulfillment");
    revalidatePath("/admin");

    return { ok: true, message: "Payout transfer retried." };
}

export async function submitFulfillmentException(jobId: string) {
    await submitFulfillmentJobToPrintify(jobId);

    revalidatePath("/admin/operations");
    revalidatePath("/admin/fulfillment");

    return { ok: true, message: "Fulfillment job submitted to Printify." };
}

export async function retryPrintifyOrderSync(orderId: string) {
    const { user } = await requireAdminAction();

    try {
        await attemptPrintifyFulfillmentForOrder(orderId);
    } catch (error) {
        logger.error("Printify order sync retry failed", {
            actor_user_id: user.id,
            order_id: orderId,
            error: error instanceof Error ? error.message : "Unknown Printify order sync retry error",
        });
        throw new Error("Could not retry Printify order sync.");
    }

    revalidatePath("/admin/operations");
    revalidatePath("/admin/fulfillment");
    revalidatePath(`/admin/orders/${orderId}`);

    return { ok: true, message: "Printify order sync retry checked." };
}

export async function repairProductGeneration(productId: string) {
    const { user } = await requireAdminAction();
    const result = await repairProductGenerationAssets({
        productId,
        actorUserId: user.id,
    });

    revalidatePath("/admin/operations");
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/products");
    revalidatePath("/dashboard/products");

    return result;
}
