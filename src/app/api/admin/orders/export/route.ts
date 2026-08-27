export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { csvCell } from "@/lib/admin/csv";
import { NO_STORE_HEADERS, noStoreJson } from "@/lib/api/no-store";
import { recordAdminExportAuditEvent } from "@/lib/admin/export-audit";
import { requireAdmin } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";
import { getServiceSupabase } from "@/lib/supabase/service";

type ExportArtist = {
    display_name?: string | null;
};

type ExportOrderItem = {
    id: string;
    qty?: number | null;
    title?: string | null;
    artist_id?: string | null;
    artists?: ExportArtist | ExportArtist[] | null;
};

type ExportOrder = {
    id: string;
    order_number?: string | null;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    status?: string | null;
    operational_status?: string | null;
    total_cents?: number | null;
    currency?: string | null;
    shipping_method?: string | null;
    tracking_code?: string | null;
    tracking_carrier?: string | null;
    stripe_session_id?: string | null;
    stripe_payment_intent?: string | null;
    created_at?: string | null;
    order_items?: ExportOrderItem[] | null;
};

const ORDER_EXPORT_HEADERS = [
    "order_id",
    "order_number",
    "created_at",
    "status",
    "operational_status",
    "customer_name",
    "email",
    "total",
    "currency",
    "shipping_method",
    "tracking_code",
    "tracking_carrier",
    "item_count",
    "artist_names",
    "stripe_session_id",
    "stripe_payment_intent",
] as const;

export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    const serviceSupabase = getServiceSupabase();
    const { data, error } = await serviceSupabase
        .from("orders")
        .select(`
            id,
            order_number,
            email,
            first_name,
            last_name,
            status,
            operational_status,
            total_cents,
            currency,
            shipping_method,
            tracking_code,
            tracking_carrier,
            stripe_session_id,
            stripe_payment_intent,
            created_at,
            order_items (
                id,
                qty,
                title,
                artist_id,
                artists (
                    display_name
                )
            )
        `)
        .order("created_at", { ascending: false })
        .limit(10_000);

    if (error) {
        logger.error("Admin orders export failed", {
            actor_user_id: auth.user.id,
            error: error.message,
        });
        return noStoreJson({ error: "Could not export orders." }, { status: 500 });
    }

    const orders = (data ?? []) as ExportOrder[];
    try {
        await recordAdminExportAuditEvent({
            actorUserId: auth.user.id,
            exportName: "orders",
            rowCount: orders.length,
        });
    } catch (auditError) {
        logger.error("Admin orders export audit failed", {
            actor_user_id: auth.user.id,
            error: auditError instanceof Error ? auditError.message : "Unknown export audit error",
        });
        return noStoreJson({ error: "Could not audit orders export." }, { status: 500 });
    }

    const csv = [
        ORDER_EXPORT_HEADERS.join(","),
        ...orders.map(orderToCsvRow),
    ].join("\n");

    return new NextResponse(csv, {
        status: 200,
        headers: {
            ...NO_STORE_HEADERS,
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${ordersExportFilename()}"`,
            "X-Robots-Tag": "noindex, noarchive",
        },
    });
}

function ordersExportFilename() {
    return `merch-tent-orders-${new Date().toISOString().slice(0, 10)}.csv`;
}

function orderToCsvRow(order: ExportOrder) {
    const customerName = [order.first_name, order.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
    const itemCount = order.order_items?.reduce((sum, item) => sum + (item.qty ?? 0), 0) ?? 0;
    const artistNames = Array.from(
        new Set(
            order.order_items
                ?.map((item) => firstArtist(item.artists)?.display_name)
                .filter((name): name is string => Boolean(name)) ?? []
        )
    ).join("; ");

    return [
        order.id,
        order.order_number ?? "",
        order.created_at ?? "",
        order.status ?? "",
        order.operational_status ?? "",
        customerName,
        order.email ?? "",
        centsToDecimal(order.total_cents),
        order.currency ?? "AUD",
        order.shipping_method ?? "",
        order.tracking_code ?? "",
        order.tracking_carrier ?? "",
        String(itemCount),
        artistNames,
        order.stripe_session_id ?? "",
        order.stripe_payment_intent ?? "",
    ].map(csvCell).join(",");
}

function firstArtist(value: ExportArtist | ExportArtist[] | null | undefined) {
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function centsToDecimal(cents?: number | null) {
    return ((cents ?? 0) / 100).toFixed(2);
}
