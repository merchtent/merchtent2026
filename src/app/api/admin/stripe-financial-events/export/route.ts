export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { csvCell } from "@/lib/admin/csv";
import { NO_STORE_HEADERS, noStoreJson } from "@/lib/api/no-store";
import { recordAdminExportAuditEvent } from "@/lib/admin/export-audit";
import { requireAdmin } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";
import { getServiceSupabase } from "@/lib/supabase/service";

type ExportStripeFinancialEvent = {
    id: string;
    stripe_event_id?: string | null;
    stripe_event_type?: string | null;
    severity?: string | null;
    review_status?: string | null;
    order_id?: string | null;
    order_number?: string | null;
    stripe_payment_intent_id?: string | null;
    stripe_charge_id?: string | null;
    stripe_object_id?: string | null;
    amount_cents?: number | null;
    amount_refunded_cents?: number | null;
    currency?: string | null;
    reason?: string | null;
    stripe_status?: string | null;
    failure_code?: string | null;
    failure_message?: string | null;
    received_at?: string | null;
    resolved_at?: string | null;
    resolved_by?: string | null;
    resolution_notes?: string | null;
};

const STRIPE_FINANCIAL_EVENT_EXPORT_HEADERS = [
    "id",
    "stripe_event_id",
    "stripe_event_type",
    "severity",
    "review_status",
    "order_id",
    "order_number",
    "stripe_payment_intent_id",
    "stripe_charge_id",
    "stripe_object_id",
    "amount",
    "amount_refunded",
    "currency",
    "reason",
    "stripe_status",
    "failure_code",
    "failure_message",
    "received_at",
    "resolved_at",
    "resolved_by",
    "resolution_notes",
] as const;

export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    const serviceSupabase = getServiceSupabase();
    const { data, error } = await serviceSupabase
        .from("stripe_financial_events")
        .select("id, stripe_event_id, stripe_event_type, severity, review_status, order_id, order_number, stripe_payment_intent_id, stripe_charge_id, stripe_object_id, amount_cents, amount_refunded_cents, currency, reason, stripe_status, failure_code, failure_message, received_at, resolved_at, resolved_by, resolution_notes")
        .order("received_at", { ascending: false })
        .limit(10_000);

    if (error) {
        logger.error("Admin Stripe financial events export failed", {
            actor_user_id: auth.user.id,
            error: error.message,
        });
        return noStoreJson({ error: "Could not export Stripe financial events." }, { status: 500 });
    }

    const events = (data ?? []) as ExportStripeFinancialEvent[];
    try {
        await recordAdminExportAuditEvent({
            actorUserId: auth.user.id,
            exportName: "stripe_financial_events",
            rowCount: events.length,
        });
    } catch (auditError) {
        logger.error("Admin Stripe financial events export audit failed", {
            actor_user_id: auth.user.id,
            error: auditError instanceof Error ? auditError.message : "Unknown export audit error",
        });
        return noStoreJson({ error: "Could not audit Stripe financial events export." }, { status: 500 });
    }

    const csv = [
        STRIPE_FINANCIAL_EVENT_EXPORT_HEADERS.join(","),
        ...events.map(stripeFinancialEventToCsvRow),
    ].join("\n");

    return new NextResponse(csv, {
        status: 200,
        headers: {
            ...NO_STORE_HEADERS,
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${stripeFinancialEventsExportFilename()}"`,
            "X-Robots-Tag": "noindex, noarchive",
        },
    });
}

function stripeFinancialEventsExportFilename() {
    return `merch-tent-stripe-financial-events-${new Date().toISOString().slice(0, 10)}.csv`;
}

function stripeFinancialEventToCsvRow(event: ExportStripeFinancialEvent) {
    return [
        event.id,
        event.stripe_event_id ?? "",
        event.stripe_event_type ?? "",
        event.severity ?? "",
        event.review_status ?? "",
        event.order_id ?? "",
        event.order_number ?? "",
        event.stripe_payment_intent_id ?? "",
        event.stripe_charge_id ?? "",
        event.stripe_object_id ?? "",
        centsToDecimal(event.amount_cents),
        centsToDecimal(event.amount_refunded_cents),
        event.currency ?? "",
        event.reason ?? "",
        event.stripe_status ?? "",
        event.failure_code ?? "",
        event.failure_message ?? "",
        event.received_at ?? "",
        event.resolved_at ?? "",
        event.resolved_by ?? "",
        event.resolution_notes ?? "",
    ].map(csvCell).join(",");
}

function centsToDecimal(cents?: number | null) {
    return ((cents ?? 0) / 100).toFixed(2);
}
