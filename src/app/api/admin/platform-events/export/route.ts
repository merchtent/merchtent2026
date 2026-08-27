export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { csvCell } from "@/lib/admin/csv";
import { NO_STORE_HEADERS, noStoreJson } from "@/lib/api/no-store";
import { recordAdminExportAuditEvent } from "@/lib/admin/export-audit";
import { requireAdmin } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";
import { getServiceSupabase } from "@/lib/supabase/service";

type ExportPlatformEvent = {
    id: string;
    scope?: string | null;
    action?: string | null;
    severity?: string | null;
    actor_user_id?: string | null;
    order_id?: string | null;
    artist_id?: string | null;
    product_id?: string | null;
    fulfillment_job_id?: string | null;
    external_id?: string | null;
    message?: string | null;
    metadata?: Record<string, unknown> | null;
    created_at?: string | null;
};

const PLATFORM_EVENT_EXPORT_HEADERS = [
    "id",
    "scope",
    "action",
    "severity",
    "actor_user_id",
    "order_id",
    "artist_id",
    "product_id",
    "fulfillment_job_id",
    "external_id",
    "message",
    "metadata_json",
    "created_at",
] as const;

export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    const serviceSupabase = getServiceSupabase();
    const { data, error } = await serviceSupabase
        .from("platform_events")
        .select("id, scope, action, severity, actor_user_id, order_id, artist_id, product_id, fulfillment_job_id, external_id, message, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(10_000);

    if (error) {
        logger.error("Admin platform events export failed", {
            actor_user_id: auth.user.id,
            error: error.message,
        });
        return noStoreJson({ error: "Could not export platform events." }, { status: 500 });
    }

    const events = (data ?? []) as ExportPlatformEvent[];
    try {
        await recordAdminExportAuditEvent({
            actorUserId: auth.user.id,
            exportName: "platform_events",
            rowCount: events.length,
        });
    } catch (auditError) {
        logger.error("Admin platform events export audit failed", {
            actor_user_id: auth.user.id,
            error: auditError instanceof Error ? auditError.message : "Unknown export audit error",
        });
        return noStoreJson({ error: "Could not audit platform events export." }, { status: 500 });
    }

    const csv = [
        PLATFORM_EVENT_EXPORT_HEADERS.join(","),
        ...events.map(platformEventToCsvRow),
    ].join("\n");

    return new NextResponse(csv, {
        status: 200,
        headers: {
            ...NO_STORE_HEADERS,
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${platformEventsExportFilename()}"`,
            "X-Robots-Tag": "noindex, noarchive",
        },
    });
}

function platformEventsExportFilename() {
    return `merch-tent-platform-events-${new Date().toISOString().slice(0, 10)}.csv`;
}

function platformEventToCsvRow(event: ExportPlatformEvent) {
    return [
        event.id,
        event.scope ?? "",
        event.action ?? "",
        event.severity ?? "",
        event.actor_user_id ?? "",
        event.order_id ?? "",
        event.artist_id ?? "",
        event.product_id ?? "",
        event.fulfillment_job_id ?? "",
        event.external_id ?? "",
        event.message ?? "",
        safeMetadataJson(event.metadata),
        event.created_at ?? "",
    ].map(csvCell).join(",");
}

function safeMetadataJson(metadata?: Record<string, unknown> | null) {
    if (!metadata) return "{}";
    return JSON.stringify(metadata);
}
