import { NextRequest } from "next/server";
import { getClientIp } from "@/lib/api/client-ip";
import { noStoreJson } from "@/lib/api/no-store";
import { hasValidOperationalSecret } from "@/lib/auth/operations-secret";
import { serverEnv } from "@/lib/env.server";
import { logger } from "@/lib/logger";
import { checkDurableRateLimit } from "@/lib/rate-limit";
import { getServiceSupabase } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OperationalCheck = {
    name: string;
    count: number;
    ok: boolean;
    message?: string;
};

type CountResult = {
    count: number | null;
    error: { message: string } | null;
};

const STALE_WEBHOOK_PROCESSING_MINUTES = 15;
const STALE_NOTIFICATION_PENDING_MINUTES = 15;
const STALE_PRINTIFY_PRODUCT_SYNC_MINUTES = 30;
const STALE_PRINTIFY_ORDER_SYNC_MINUTES = 30;
const STALE_PRODUCT_GENERATION_MINUTES = 30;
const SEVERE_PLATFORM_EVENT_WINDOW_HOURS = 24;
const OPERATIONAL_HEALTH_RATE_LIMIT = 60;
const OPERATIONAL_HEALTH_RATE_WINDOW_MS = 60 * 1000;

export async function GET(request: NextRequest) {
    let expectedSecret: string;

    try {
        expectedSecret = serverEnv.operationalHealthSecret();
    } catch (error) {
        logger.error("operational health runtime configuration failed", {
            check: "OPERATIONAL_HEALTH_SECRET",
            error: error instanceof Error ? error.message : "Missing operational health secret",
        });

        return noStoreJson(
            {
                ok: false,
                status: "misconfigured",
                message: "Operational health secret is not configured.",
            },
            {
                status: 503,
            }
        );
    }

    const supabase = getServiceSupabase();
    const ip = getClientIp(request);
    const allowed = await checkDurableRateLimit(
        supabase,
        `operations_health:${ip}`,
        OPERATIONAL_HEALTH_RATE_LIMIT,
        OPERATIONAL_HEALTH_RATE_WINDOW_MS,
        "check_rate_limit",
        { fallback: "deny" }
    );

    if (!allowed) {
        return noStoreJson(
            { ok: false, status: "rate_limited" },
            {
                status: 429,
            }
        );
    }

    if (!hasValidOperationalSecret(request, expectedSecret)) {
        return noStoreJson(
            { ok: false, status: "unauthorized" },
            {
                status: 401,
            }
        );
    }

    const staleWebhookCutoff = minutesAgo(STALE_WEBHOOK_PROCESSING_MINUTES);
    const staleNotificationCutoff = minutesAgo(STALE_NOTIFICATION_PENDING_MINUTES);
    const stalePrintifyProductSyncCutoff = minutesAgo(STALE_PRINTIFY_PRODUCT_SYNC_MINUTES);
    const stalePrintifyOrderSyncCutoff = minutesAgo(STALE_PRINTIFY_ORDER_SYNC_MINUTES);
    const staleProductGenerationCutoff = minutesAgo(STALE_PRODUCT_GENERATION_MINUTES);
    const severePlatformEventCutoff = hoursAgo(SEVERE_PLATFORM_EVENT_WINDOW_HOURS);

    const [
        orderExceptions,
        failedWebhooks,
        staleProcessingWebhooks,
        failedNotifications,
        stalePendingNotifications,
        fulfillmentExceptions,
        failedPrintifyProductSyncs,
        stalePrintifyProductSyncs,
        failedPrintifyOrderSyncs,
        stalePrintifyOrderSyncs,
        staleProductGenerations,
        payoutExceptions,
        openStripeFinancialEvents,
        productGenerationExceptions,
        merchCreditExceptions,
        merchCreditBalanceReconciliationExceptions,
        severePlatformEvents,
    ] = await Promise.all([
        supabase
            .from("orders_operational_exceptions")
            .select("*", { count: "exact", head: true }),
        supabase
            .from("stripe_webhook_events")
            .select("*", { count: "exact", head: true })
            .eq("status", "failed"),
        supabase
            .from("stripe_webhook_events")
            .select("*", { count: "exact", head: true })
            .eq("status", "processing")
            .lt("processing_started_at", staleWebhookCutoff),
        supabase
            .from("notification_deliveries")
            .select("*", { count: "exact", head: true })
            .eq("status", "failed"),
        supabase
            .from("notification_deliveries")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending")
            .lt("created_at", staleNotificationCutoff),
        supabase
            .from("fulfillment_operational_exceptions")
            .select("*", { count: "exact", head: true }),
        supabase
            .from("printify_sync_events")
            .select("*", { count: "exact", head: true })
            .eq("status", "failed"),
        supabase
            .from("product_designs")
            .select("*", { count: "exact", head: true })
            .eq("printify_status", "syncing")
            .lt("updated_at", stalePrintifyProductSyncCutoff),
        supabase
            .from("printify_order_syncs")
            .select("*", { count: "exact", head: true })
            .eq("status", "failed"),
        supabase
            .from("printify_order_syncs")
            .select("*", { count: "exact", head: true })
            .eq("status", "started")
            .lt("attempted_at", stalePrintifyOrderSyncCutoff),
        supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("production_status", "generating")
            .lt("created_at", staleProductGenerationCutoff),
        supabase
            .from("payout_operational_exceptions")
            .select("*", { count: "exact", head: true }),
        supabase
            .from("stripe_financial_events")
            .select("*", { count: "exact", head: true })
            .in("review_status", ["open", "investigating"]),
        supabase
            .from("product_generation_operational_exceptions")
            .select("*", { count: "exact", head: true }),
        supabase
            .from("merch_credit_operational_exceptions")
            .select("*", { count: "exact", head: true }),
        supabase
            .from("merch_credit_balance_reconciliation_exceptions")
            .select("*", { count: "exact", head: true }),
        supabase
            .from("platform_events")
            .select("*", { count: "exact", head: true })
            .in("severity", ["error", "critical"])
            .gte("created_at", severePlatformEventCutoff),
    ]);

    const checks = [
        toCheck("order_exceptions", orderExceptions),
        toCheck("failed_webhooks", failedWebhooks),
        toCheck("stale_processing_webhooks", staleProcessingWebhooks),
        toCheck("failed_notifications", failedNotifications),
        toCheck("stale_pending_notifications", stalePendingNotifications),
        toCheck("fulfillment_sla_exceptions", fulfillmentExceptions),
        toCheck("failed_printify_product_syncs", failedPrintifyProductSyncs),
        toCheck("stale_printify_product_syncs", stalePrintifyProductSyncs),
        toCheck("failed_printify_order_syncs", failedPrintifyOrderSyncs),
        toCheck("stale_printify_order_syncs", stalePrintifyOrderSyncs),
        toCheck("stale_product_generations", staleProductGenerations),
        toCheck("payout_exceptions", payoutExceptions),
        toCheck("open_stripe_financial_events", openStripeFinancialEvents),
        toCheck("product_generation_exceptions", productGenerationExceptions),
        toCheck("merch_credit_exceptions", merchCreditExceptions),
        toCheck("merch_credit_balance_reconciliation_exceptions", merchCreditBalanceReconciliationExceptions),
        toCheck("recent_severe_platform_events", severePlatformEvents),
    ];
    const ok = checks.every((check) => check.ok);

    return noStoreJson(
        {
            ok,
            status: ok ? "ok" : "attention_required",
            checked_at: new Date().toISOString(),
            thresholds: {
                stale_webhook_processing_minutes: STALE_WEBHOOK_PROCESSING_MINUTES,
                stale_notification_pending_minutes: STALE_NOTIFICATION_PENDING_MINUTES,
                stale_printify_product_sync_minutes: STALE_PRINTIFY_PRODUCT_SYNC_MINUTES,
                stale_printify_order_sync_minutes: STALE_PRINTIFY_ORDER_SYNC_MINUTES,
                stale_product_generation_minutes: STALE_PRODUCT_GENERATION_MINUTES,
                severe_platform_event_window_hours: SEVERE_PLATFORM_EVENT_WINDOW_HOURS,
            },
            checks,
        },
        {
            status: ok ? 200 : 503,
        }
    );
}

function minutesAgo(minutes: number) {
    return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function hoursAgo(hours: number) {
    return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function toCheck(name: string, result: CountResult): OperationalCheck {
    const count = result.count ?? 0;

    if (result.error) {
        logger.error("Operational health check query failed", {
            check: name,
            error: result.error.message,
        });
    }

    return {
        name,
        count,
        ok: !result.error && count === 0,
        message: result.error ? "Operational check query failed." : undefined,
    };
}
