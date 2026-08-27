"use server";

import { revalidatePath } from "next/cache";
import { getServiceSupabase } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { attemptPrintifyFulfillmentForOrder } from "@/lib/printify/fulfillment";
import { recordPlatformEvent } from "@/lib/platform-events";
import { requireAdminAction } from "@/lib/auth/admin";

const ALLOWED_STATUSES = new Set(["pending", "in_progress", "completed", "failed", "cancelled"]);

async function insertFulfillmentJobEvent(
    serviceSupabase: ReturnType<typeof getServiceSupabase>,
    input: {
        fulfillmentJobId: string;
        orderId: string | number | null;
        fromStatus: string | null;
        toStatus: string;
        actorUserId: string;
        reason: string;
        metadata?: Record<string, unknown>;
    }
) {
    const { error } = await serviceSupabase.from("fulfillment_job_events").insert({
        fulfillment_job_id: input.fulfillmentJobId,
        order_id: input.orderId,
        from_status: input.fromStatus,
        to_status: input.toStatus,
        actor_user_id: input.actorUserId,
        reason: input.reason,
        metadata: input.metadata ?? {},
    });

    if (error) {
        logger.error("Admin fulfillment job event insert failed", {
            fulfillment_job_id: input.fulfillmentJobId,
            order_id: input.orderId,
            from_status: input.fromStatus,
            to_status: input.toStatus,
            actor_user_id: input.actorUserId,
            reason: input.reason,
            error: error.message,
        });
        throw new Error("Fulfillment status changed, but audit event recording failed.");
    }
}

export async function updateFulfillmentJobStatus(jobId: string, status: string) {
    if (!ALLOWED_STATUSES.has(status)) {
        throw new Error("Invalid fulfillment status.");
    }

    const { user } = await requireAdminAction();
    const serviceSupabase = getServiceSupabase();

    const { data: currentJob, error: currentJobError } = await serviceSupabase
        .from("fulfillment_jobs")
        .select("id, status, order_id")
        .eq("id", jobId)
        .maybeSingle();

    if (currentJobError) {
        logger.error("Admin fulfillment status lookup failed", {
            fulfillment_job_id: jobId,
            status,
            actor_user_id: user.id,
            error: currentJobError.message,
        });
        throw new Error("Could not load fulfillment job.");
    }

    if (!currentJob) {
        throw new Error("Fulfillment job not found.");
    }

    if (
        (currentJob.status === "completed" || currentJob.status === "cancelled") &&
        currentJob.status !== status
    ) {
        throw new Error("Fulfillment job is already closed.");
    }

    const now = new Date().toISOString();
    const patch: Record<string, string | null> = {
        status,
    };

    if (status === "pending") {
        patch.started_at = null;
        patch.completed_at = null;
        patch.failed_at = null;
        patch.cancelled_at = null;
    }
    if (status === "in_progress") {
        patch.started_at = now;
        patch.completed_at = null;
        patch.failed_at = null;
        patch.cancelled_at = null;
    }
    if (status === "completed") {
        patch.completed_at = now;
        patch.failed_at = null;
        patch.cancelled_at = null;
    }
    if (status === "failed") {
        patch.completed_at = null;
        patch.failed_at = now;
        patch.cancelled_at = null;
    }
    if (status === "cancelled") {
        patch.completed_at = null;
        patch.failed_at = null;
        patch.cancelled_at = now;
    }

    const { data: updatedJob, error } = await serviceSupabase
        .from("fulfillment_jobs")
        .update(patch)
        .eq("id", jobId)
        .select("id")
        .maybeSingle();

    if (error || !updatedJob) {
        logger.error("Admin fulfillment status update failed", {
            fulfillment_job_id: jobId,
            status,
            actor_user_id: user.id,
            error: error?.message ?? "No fulfillment job was updated",
        });
        throw new Error("Could not update fulfillment status.");
    }

    await insertFulfillmentJobEvent(serviceSupabase, {
        fulfillmentJobId: jobId,
        orderId: currentJob.order_id,
        fromStatus: currentJob.status,
        toStatus: status,
        actorUserId: user.id,
        reason: "admin_fulfillment_update",
        metadata: {},
    });

    await recordPlatformEvent(
        {
            scope: "fulfillment",
            action: "admin_fulfillment_status_updated",
            severity: "info",
            actorUserId: user.id,
            orderId: currentJob.order_id,
            fulfillmentJobId: jobId,
            message: "Admin updated fulfillment job status.",
            metadata: {
                from_status: currentJob.status,
                to_status: status,
            },
        },
        {
            supabase: serviceSupabase,
            failureLogMessage: "Admin fulfillment platform event failed",
            failureContext: {
                fulfillment_job_id: jobId,
                order_id: currentJob.order_id,
                status,
                actor_user_id: user.id,
            },
            throwOnFailure: true,
            failurePublicMessage: "Could not audit fulfillment status update.",
        }
    );

    revalidatePath("/admin/fulfillment");
}

export async function submitFulfillmentJobToPrintify(jobId: string) {
    const { user } = await requireAdminAction();

    const serviceSupabase = getServiceSupabase();
    const { data: currentJob, error: jobError } = await serviceSupabase
        .from("fulfillment_jobs")
        .select("status, order_id")
        .eq("id", jobId)
        .maybeSingle();

    if (jobError) {
        logger.error("Admin fulfillment job lookup failed", {
            fulfillment_job_id: jobId,
            actor_user_id: user.id,
            error: jobError.message,
        });
        throw new Error("Could not load fulfillment job.");
    }

    if (!currentJob) {
        throw new Error("Fulfillment job not found.");
    }

    const now = new Date().toISOString();
    if (currentJob.status === "completed" || currentJob.status === "cancelled") {
        throw new Error("Fulfillment job is already closed.");
    }

    const startedFromStatus = currentJob.status;
    const shouldMarkStarted = currentJob.status === "pending" || currentJob.status === "failed";

    if (shouldMarkStarted) {
        const { error: statusError } = await serviceSupabase
            .from("fulfillment_jobs")
            .update({
                status: "in_progress",
                started_at: now,
                failed_at: null,
            })
            .eq("id", jobId);

        if (statusError) {
            logger.error("Admin Printify fulfillment start status update failed", {
                fulfillment_job_id: jobId,
                order_id: currentJob.order_id,
                actor_user_id: user.id,
                error: statusError.message,
            });
            throw new Error("Could not mark fulfillment job in progress.");
        }

        await insertFulfillmentJobEvent(serviceSupabase, {
            fulfillmentJobId: jobId,
            orderId: currentJob.order_id,
            fromStatus: startedFromStatus,
            toStatus: "in_progress",
            actorUserId: user.id,
            reason: "admin_printify_submit_started",
            metadata: {},
        });
    }

    try {
        await attemptPrintifyFulfillmentForOrder(currentJob.order_id);

        const completedAt = new Date().toISOString();
        const { error: completedStatusError } = await serviceSupabase
            .from("fulfillment_jobs")
            .update({
                status: "completed",
                completed_at: completedAt,
                failed_at: null,
            })
            .eq("id", jobId);

        if (completedStatusError) {
            logger.error("Admin Printify fulfillment completed status update failed", {
                fulfillment_job_id: jobId,
                order_id: currentJob.order_id,
                actor_user_id: user.id,
                error: completedStatusError.message,
            });
            throw new Error("Could not mark fulfillment job completed.");
        }

        await insertFulfillmentJobEvent(serviceSupabase, {
            fulfillmentJobId: jobId,
            orderId: currentJob.order_id,
            fromStatus: shouldMarkStarted ? "in_progress" : currentJob.status,
            toStatus: "completed",
            actorUserId: user.id,
            reason: "admin_printify_order_submitted",
            metadata: {},
        });

        await recordPlatformEvent(
            {
                scope: "fulfillment",
                action: "admin_printify_order_submitted",
                severity: "info",
                actorUserId: user.id,
                orderId: currentJob.order_id,
                fulfillmentJobId: jobId,
                message: "Admin submitted fulfillment job to Printify.",
                metadata: {},
            },
            {
                supabase: serviceSupabase,
                failureLogMessage: "Admin Printify fulfillment platform event failed",
                failureContext: {
                    fulfillment_job_id: jobId,
                    order_id: currentJob.order_id,
                    actor_user_id: user.id,
                },
                throwOnFailure: true,
                failurePublicMessage: "Could not audit Printify fulfillment submission.",
            }
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : "Printify fulfillment failed.";
        const failedAt = new Date().toISOString();
        const failedFromStatus = shouldMarkStarted ? "in_progress" : currentJob.status;

        const { error: failedStatusError } = await serviceSupabase
            .from("fulfillment_jobs")
            .update({
                status: "failed",
                failed_at: failedAt,
            })
            .eq("id", jobId);

        if (failedStatusError) {
            logger.error("Admin Printify fulfillment failed status update failed", {
                fulfillment_job_id: jobId,
                order_id: currentJob.order_id,
                actor_user_id: user.id,
                original_error: message,
                error: failedStatusError.message,
            });
        }

        await insertFulfillmentJobEvent(serviceSupabase, {
            fulfillmentJobId: jobId,
            orderId: currentJob.order_id,
            fromStatus: failedFromStatus,
            toStatus: "failed",
            actorUserId: user.id,
            reason: "admin_printify_order_failed",
            metadata: { error: message },
        });

        await recordPlatformEvent(
            {
                scope: "fulfillment",
                action: "admin_printify_order_failed",
                severity: "error",
                actorUserId: user.id,
                orderId: currentJob.order_id,
                fulfillmentJobId: jobId,
                message: "Admin Printify fulfillment submission failed.",
                metadata: { error: message },
            },
            {
                supabase: serviceSupabase,
                failureLogMessage: "Admin Printify fulfillment failure platform event failed",
                failureContext: {
                    fulfillment_job_id: jobId,
                    order_id: currentJob.order_id,
                    actor_user_id: user.id,
                },
                throwOnFailure: true,
                failurePublicMessage: "Could not audit Printify fulfillment failure.",
            }
        );

        throw new Error("Could not submit fulfillment job to Printify.");
    } finally {
        revalidatePath("/admin/fulfillment");
        revalidatePath("/admin/operations");
    }
}
