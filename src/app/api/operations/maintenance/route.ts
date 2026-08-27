import { NextRequest } from "next/server";
import { getClientIp } from "@/lib/api/client-ip";
import { noStoreJson } from "@/lib/api/no-store";
import { hasValidOperationalSecret } from "@/lib/auth/operations-secret";
import { serverEnv } from "@/lib/env.server";
import { logger } from "@/lib/logger";
import { recordPlatformEvent } from "@/lib/platform-events";
import { checkDurableRateLimit } from "@/lib/rate-limit";
import { getServiceSupabase } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STALE_WEBHOOK_PROCESSING_MINUTES = 15;
const STALE_WEBHOOK_BATCH_LIMIT = 100;
const STALE_NOTIFICATION_PENDING_MINUTES = 15;
const STALE_NOTIFICATION_BATCH_LIMIT = 100;
const STALE_PRINTIFY_PRODUCT_SYNC_MINUTES = 30;
const STALE_PRINTIFY_PRODUCT_SYNC_BATCH_LIMIT = 100;
const STALE_PRINTIFY_ORDER_SYNC_MINUTES = 30;
const STALE_PRINTIFY_ORDER_SYNC_BATCH_LIMIT = 100;
const STALE_PRODUCT_GENERATION_MINUTES = 30;
const STALE_PRODUCT_GENERATION_BATCH_LIMIT = 100;
const MAINTENANCE_RATE_LIMIT = 20;
const MAINTENANCE_RATE_WINDOW_MS = 60 * 1000;

type MaintenanceResult = {
    name: string;
    ok: boolean;
    count: number;
    duration_ms: number;
    message?: string;
};

type MaintenanceTask = {
    name: string;
    failureMessage: string;
    run: () => Promise<MaintenanceResult>;
};

export async function POST(request: NextRequest) {
    let expectedSecret: string;

    try {
        expectedSecret = serverEnv.operationalHealthSecret();
    } catch (error) {
        logger.error("operations maintenance secret is not configured", {
            error: error instanceof Error ? error.message : "Missing operational health secret",
        });

        return noStoreJson(
            { ok: false, status: "misconfigured" },
            { status: 503 }
        );
    }

    const supabase = getServiceSupabase();
    const ip = getClientIp(request);
    const allowed = await checkDurableRateLimit(
        supabase,
        `operations_maintenance:${ip}`,
        MAINTENANCE_RATE_LIMIT,
        MAINTENANCE_RATE_WINDOW_MS,
        "check_rate_limit",
        { fallback: "deny" }
    );

    if (!allowed) {
        return noStoreJson(
            { ok: false, status: "rate_limited" },
            { status: 429 }
        );
    }

    if (!hasValidOperationalSecret(request, expectedSecret)) {
        return noStoreJson(
            { ok: false, status: "unauthorized" },
            { status: 401 }
        );
    }

    const taskRunners: MaintenanceTask[] = [
        {
            name: "expire_stale_merch_credit_reservations",
            failureMessage: "Merch credit reservation expiry failed.",
            run: () => expireStaleCreditReservations(supabase),
        },
        {
            name: "mark_stale_stripe_webhooks_failed",
            failureMessage: "Stale Stripe webhook cleanup failed.",
            run: () => markStaleWebhooksFailed(supabase),
        },
        {
            name: "mark_stale_notification_deliveries_failed",
            failureMessage: "Stale notification cleanup failed.",
            run: () => markStaleNotificationsFailed(supabase),
        },
        {
            name: "mark_stale_printify_order_syncs_failed",
            failureMessage: "Stale Printify order sync cleanup failed.",
            run: () => markStalePrintifyOrderSyncsFailed(supabase),
        },
        {
            name: "mark_stale_printify_product_syncs_failed",
            failureMessage: "Stale Printify product sync cleanup failed.",
            run: () => markStalePrintifyProductSyncsFailed(supabase),
        },
        {
            name: "mark_stale_product_generations_failed",
            failureMessage: "Stale product generation cleanup failed.",
            run: () => markStaleProductGenerationsFailed(supabase),
        },
    ];
    const tasks = await Promise.all(taskRunners.map(runMaintenanceTask));
    const tasksOk = tasks.every((task) => task.ok);
    const auditOk = await logMaintenanceRun(supabase, tasks, tasksOk);
    const ok = tasksOk && auditOk;

    return noStoreJson(
        {
            ok,
            status: ok ? "ok" : auditOk ? "failed" : "audit_failed",
            ran_at: new Date().toISOString(),
            audit_logged: auditOk,
            tasks,
        },
        {
            status: ok ? 200 : 500,
        }
    );
}

async function runMaintenanceTask(task: MaintenanceTask): Promise<MaintenanceResult> {
    const startedAt = performance.now();

    try {
        const result = await task.run();
        return {
            ...result,
            duration_ms: Math.round(performance.now() - startedAt),
        };
    } catch (error) {
        const durationMs = Math.round(performance.now() - startedAt);

        logger.error("scheduled maintenance task crashed", {
            task: task.name,
            duration_ms: durationMs,
            error: error instanceof Error ? error.message : "Unknown maintenance task error",
        });

        return {
            name: task.name,
            ok: false,
            count: 0,
            duration_ms: durationMs,
            message: task.failureMessage,
        };
    }
}

async function expireStaleCreditReservations(
    supabase: ReturnType<typeof getServiceSupabase>
): Promise<MaintenanceResult> {
    const { data, error } = await supabase.rpc("expire_merch_credit_reservations");

    if (error) {
        logger.error("scheduled merch credit reservation expiry failed", {
            error: error.message,
        });

        return {
            name: "expire_stale_merch_credit_reservations",
            ok: false,
            count: 0,
            duration_ms: 0,
            message: "Merch credit reservation expiry failed.",
        };
    }

    return {
        name: "expire_stale_merch_credit_reservations",
        ok: true,
        count: Number(data ?? 0),
        duration_ms: 0,
    };
}

async function logMaintenanceRun(
    supabase: ReturnType<typeof getServiceSupabase>,
    tasks: MaintenanceResult[],
    ok: boolean
): Promise<boolean> {
    try {
        await recordPlatformEvent(
            {
                scope: "maintenance",
                action: ok ? "scheduled_maintenance_completed" : "scheduled_maintenance_failed",
                severity: ok ? "info" : "error",
                message: ok
                    ? "Scheduled maintenance completed."
                    : "Scheduled maintenance completed with one or more failed tasks.",
                metadata: {
                    task_count: tasks.length,
                    total_count: tasks.reduce((sum, task) => sum + task.count, 0),
                    failed_tasks: tasks.filter((task) => !task.ok).map((task) => task.name),
                    tasks,
                },
            },
            {
                supabase,
                failureLogMessage: "scheduled maintenance platform event failed",
                failureContext: {
                    ok,
                    failed_tasks: tasks.filter((task) => !task.ok).map((task) => task.name),
                },
                throwOnFailure: true,
                failurePublicMessage: "Could not audit scheduled maintenance run.",
            }
        );

        return true;
    } catch (error) {
        logger.error("scheduled maintenance audit failed", {
            ok,
            failed_tasks: tasks.filter((task) => !task.ok).map((task) => task.name),
            error: error instanceof Error ? error.message : "Unknown maintenance audit error",
        });

        return false;
    }
}

async function markStaleWebhooksFailed(
    supabase: ReturnType<typeof getServiceSupabase>
): Promise<MaintenanceResult> {
    const { data, error } = await supabase.rpc("system_mark_stale_stripe_webhooks_failed", {
        p_stale_after_minutes: STALE_WEBHOOK_PROCESSING_MINUTES,
        p_limit: STALE_WEBHOOK_BATCH_LIMIT,
    });

    if (error) {
        logger.error("scheduled stale Stripe webhook cleanup failed", {
            stale_after_minutes: STALE_WEBHOOK_PROCESSING_MINUTES,
            batch_limit: STALE_WEBHOOK_BATCH_LIMIT,
            error: error.message,
        });

        return {
            name: "mark_stale_stripe_webhooks_failed",
            ok: false,
            count: 0,
            duration_ms: 0,
            message: "Stale Stripe webhook cleanup failed.",
        };
    }

    return {
        name: "mark_stale_stripe_webhooks_failed",
        ok: true,
        count: Number(data?.marked_count ?? 0),
        duration_ms: 0,
    };
}

async function markStaleNotificationsFailed(
    supabase: ReturnType<typeof getServiceSupabase>
): Promise<MaintenanceResult> {
    const { data, error } = await supabase.rpc("system_mark_stale_notification_deliveries_failed", {
        p_stale_after_minutes: STALE_NOTIFICATION_PENDING_MINUTES,
        p_limit: STALE_NOTIFICATION_BATCH_LIMIT,
    });

    if (error) {
        logger.error("scheduled stale notification cleanup failed", {
            stale_after_minutes: STALE_NOTIFICATION_PENDING_MINUTES,
            batch_limit: STALE_NOTIFICATION_BATCH_LIMIT,
            error: error.message,
        });

        return {
            name: "mark_stale_notification_deliveries_failed",
            ok: false,
            count: 0,
            duration_ms: 0,
            message: "Stale notification cleanup failed.",
        };
    }

    return {
        name: "mark_stale_notification_deliveries_failed",
        ok: true,
        count: Number(data?.marked_count ?? 0),
        duration_ms: 0,
    };
}

async function markStalePrintifyOrderSyncsFailed(
    supabase: ReturnType<typeof getServiceSupabase>
): Promise<MaintenanceResult> {
    const { data, error } = await supabase.rpc("system_mark_stale_printify_order_syncs_failed", {
        p_stale_after_minutes: STALE_PRINTIFY_ORDER_SYNC_MINUTES,
        p_limit: STALE_PRINTIFY_ORDER_SYNC_BATCH_LIMIT,
    });

    if (error) {
        logger.error("scheduled stale Printify order sync cleanup failed", {
            stale_after_minutes: STALE_PRINTIFY_ORDER_SYNC_MINUTES,
            batch_limit: STALE_PRINTIFY_ORDER_SYNC_BATCH_LIMIT,
            error: error.message,
        });

        return {
            name: "mark_stale_printify_order_syncs_failed",
            ok: false,
            count: 0,
            duration_ms: 0,
            message: "Stale Printify order sync cleanup failed.",
        };
    }

    return {
        name: "mark_stale_printify_order_syncs_failed",
        ok: true,
        count: Number(data?.marked_count ?? 0),
        duration_ms: 0,
    };
}

async function markStalePrintifyProductSyncsFailed(
    supabase: ReturnType<typeof getServiceSupabase>
): Promise<MaintenanceResult> {
    const { data, error } = await supabase.rpc("system_mark_stale_printify_product_syncs_failed", {
        p_stale_after_minutes: STALE_PRINTIFY_PRODUCT_SYNC_MINUTES,
        p_limit: STALE_PRINTIFY_PRODUCT_SYNC_BATCH_LIMIT,
    });

    if (error) {
        logger.error("scheduled stale Printify product sync cleanup failed", {
            stale_after_minutes: STALE_PRINTIFY_PRODUCT_SYNC_MINUTES,
            batch_limit: STALE_PRINTIFY_PRODUCT_SYNC_BATCH_LIMIT,
            error: error.message,
        });

        return {
            name: "mark_stale_printify_product_syncs_failed",
            ok: false,
            count: 0,
            duration_ms: 0,
            message: "Stale Printify product sync cleanup failed.",
        };
    }

    return {
        name: "mark_stale_printify_product_syncs_failed",
        ok: true,
        count: Number(data?.marked_count ?? 0),
        duration_ms: 0,
    };
}

async function markStaleProductGenerationsFailed(
    supabase: ReturnType<typeof getServiceSupabase>
): Promise<MaintenanceResult> {
    const { data, error } = await supabase.rpc("system_mark_stale_product_generations_failed", {
        p_stale_after_minutes: STALE_PRODUCT_GENERATION_MINUTES,
        p_limit: STALE_PRODUCT_GENERATION_BATCH_LIMIT,
    });

    if (error) {
        logger.error("scheduled stale product generation cleanup failed", {
            stale_after_minutes: STALE_PRODUCT_GENERATION_MINUTES,
            batch_limit: STALE_PRODUCT_GENERATION_BATCH_LIMIT,
            error: error.message,
        });

        return {
            name: "mark_stale_product_generations_failed",
            ok: false,
            count: 0,
            duration_ms: 0,
            message: "Stale product generation cleanup failed.",
        };
    }

    return {
        name: "mark_stale_product_generations_failed",
        ok: true,
        count: Number(data?.marked_count ?? 0),
        duration_ms: 0,
    };
}
