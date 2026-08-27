export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { csvCell } from "@/lib/admin/csv";
import { NO_STORE_HEADERS, noStoreJson } from "@/lib/api/no-store";
import { recordAdminExportAuditEvent } from "@/lib/admin/export-audit";
import { requireAdmin } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";
import { getServiceSupabase } from "@/lib/supabase/service";

type ExportFulfillmentOrder = {
    order_number?: string | null;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    total_cents?: number | null;
    status?: string | null;
    tracking_code?: string | null;
    tracking_carrier?: string | null;
    created_at?: string | null;
};

type ExportFulfillmentJob = {
    id: string;
    order_id: string;
    status?: string | null;
    priority?: string | null;
    queued_at?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    failed_at?: string | null;
    orders?: ExportFulfillmentOrder | ExportFulfillmentOrder[] | null;
};

type ExportPrintifySync = {
    order_id: string;
    status?: string | null;
    printify_order_id?: string | null;
    attempted_at?: string | null;
    succeeded_at?: string | null;
    failed_at?: string | null;
    error_message?: string | null;
};

const FULFILLMENT_EXPORT_HEADERS = [
    "fulfillment_job_id",
    "order_id",
    "order_number",
    "customer_name",
    "email",
    "order_status",
    "fulfillment_status",
    "priority",
    "total",
    "tracking_code",
    "tracking_carrier",
    "queued_at",
    "started_at",
    "completed_at",
    "failed_at",
    "printify_status",
    "printify_order_id",
    "printify_attempted_at",
    "printify_succeeded_at",
    "printify_failed_at",
    "printify_error",
] as const;

export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    const serviceSupabase = getServiceSupabase();
    const { data: jobsData, error: jobsError } = await serviceSupabase
        .from("fulfillment_jobs")
        .select(`
            id,
            order_id,
            status,
            priority,
            queued_at,
            started_at,
            completed_at,
            failed_at,
            orders (
                order_number,
                email,
                first_name,
                last_name,
                total_cents,
                status,
                tracking_code,
                tracking_carrier,
                created_at
            )
        `)
        .order("queued_at", { ascending: false })
        .limit(10_000);

    if (jobsError) {
        logger.error("Admin fulfillment export failed", {
            actor_user_id: auth.user.id,
            error: jobsError.message,
        });
        return noStoreJson({ error: "Could not export fulfillment jobs." }, { status: 500 });
    }

    const jobs = (jobsData ?? []) as ExportFulfillmentJob[];
    const orderIds = jobs.map((job) => job.order_id);
    const { data: syncData, error: syncError } = orderIds.length
        ? await serviceSupabase
            .from("printify_order_syncs")
            .select("order_id, status, printify_order_id, attempted_at, succeeded_at, failed_at, error_message")
            .in("order_id", orderIds)
        : { data: [], error: null };

    if (syncError) {
        logger.error("Admin fulfillment export Printify sync lookup failed", {
            actor_user_id: auth.user.id,
            error: syncError.message,
        });
        return noStoreJson({ error: "Could not export fulfillment sync status." }, { status: 500 });
    }

    const syncByOrderId = new Map(
        ((syncData ?? []) as ExportPrintifySync[]).map((sync) => [sync.order_id, sync])
    );
    try {
        await recordAdminExportAuditEvent({
            actorUserId: auth.user.id,
            exportName: "fulfillment",
            rowCount: jobs.length,
            metadata: {
                printify_sync_rows: syncByOrderId.size,
            },
        });
    } catch (auditError) {
        logger.error("Admin fulfillment export audit failed", {
            actor_user_id: auth.user.id,
            error: auditError instanceof Error ? auditError.message : "Unknown export audit error",
        });
        return noStoreJson({ error: "Could not audit fulfillment export." }, { status: 500 });
    }

    const csv = [
        FULFILLMENT_EXPORT_HEADERS.join(","),
        ...jobs.map((job) => fulfillmentJobToCsvRow(job, syncByOrderId.get(job.order_id))),
    ].join("\n");

    return new NextResponse(csv, {
        status: 200,
        headers: {
            ...NO_STORE_HEADERS,
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${fulfillmentExportFilename()}"`,
            "X-Robots-Tag": "noindex, noarchive",
        },
    });
}

function fulfillmentExportFilename() {
    return `merch-tent-fulfillment-${new Date().toISOString().slice(0, 10)}.csv`;
}

function fulfillmentJobToCsvRow(job: ExportFulfillmentJob, sync?: ExportPrintifySync) {
    const order = firstJoined(job.orders);
    const customerName = [order?.first_name, order?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();

    return [
        job.id,
        job.order_id,
        order?.order_number ?? "",
        customerName,
        order?.email ?? "",
        order?.status ?? "",
        job.status ?? "",
        job.priority ?? "",
        centsToDecimal(order?.total_cents),
        order?.tracking_code ?? "",
        order?.tracking_carrier ?? "",
        job.queued_at ?? "",
        job.started_at ?? "",
        job.completed_at ?? "",
        job.failed_at ?? "",
        sync?.status ?? "",
        sync?.printify_order_id ?? "",
        sync?.attempted_at ?? "",
        sync?.succeeded_at ?? "",
        sync?.failed_at ?? "",
        sync?.error_message ?? "",
    ].map(csvCell).join(",");
}

function firstJoined<T>(value: T | T[] | null | undefined) {
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function centsToDecimal(cents?: number | null) {
    return ((cents ?? 0) / 100).toFixed(2);
}
