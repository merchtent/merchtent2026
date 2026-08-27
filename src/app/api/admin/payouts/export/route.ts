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

type ExportCashOut = {
    id: string;
    artist_id: string;
    total_cents?: number | null;
    status?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    artists?: ExportArtist | ExportArtist[] | null;
};

type ExportArtistTransfer = {
    cash_out_id: string;
    status?: string | null;
    amount_cents?: number | null;
    currency?: string | null;
    stripe_transfer_id?: string | null;
    destination_account_id?: string | null;
    failure_code?: string | null;
    failure_message?: string | null;
    attempted_at?: string | null;
    succeeded_at?: string | null;
    failed_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
};

const PAYOUT_EXPORT_HEADERS = [
    "cash_out_id",
    "artist_id",
    "artist_name",
    "cash_out_status",
    "cash_out_total",
    "cash_out_created_at",
    "cash_out_updated_at",
    "transfer_status",
    "transfer_amount",
    "currency",
    "stripe_transfer_id",
    "destination_account_id",
    "attempted_at",
    "succeeded_at",
    "failed_at",
    "failure_code",
    "failure_message",
] as const;

export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    const serviceSupabase = getServiceSupabase();
    const { data: cashOutData, error: cashOutError } = await serviceSupabase
        .from("cash_outs")
        .select(`
            id,
            artist_id,
            total_cents,
            status,
            created_at,
            updated_at,
            artists (
                display_name
            )
        `)
        .order("created_at", { ascending: false })
        .limit(10_000);

    if (cashOutError) {
        logger.error("Admin payouts export failed", {
            actor_user_id: auth.user.id,
            error: cashOutError.message,
        });
        return noStoreJson({ error: "Could not export payouts." }, { status: 500 });
    }

    const cashOuts = (cashOutData ?? []) as ExportCashOut[];
    const cashOutIds = cashOuts.map((cashOut) => cashOut.id);
    const { data: transferData, error: transferError } = cashOutIds.length
        ? await serviceSupabase
            .from("artist_transfers")
            .select("cash_out_id, status, amount_cents, currency, stripe_transfer_id, destination_account_id, failure_code, failure_message, attempted_at, succeeded_at, failed_at, created_at, updated_at")
            .in("cash_out_id", cashOutIds)
        : { data: [], error: null };

    if (transferError) {
        logger.error("Admin payouts export transfer lookup failed", {
            actor_user_id: auth.user.id,
            error: transferError.message,
        });
        return noStoreJson({ error: "Could not export payout transfer status." }, { status: 500 });
    }

    const transferByCashOutId = new Map(
        ((transferData ?? []) as ExportArtistTransfer[]).map((transfer) => [
            transfer.cash_out_id,
            transfer,
        ])
    );
    try {
        await recordAdminExportAuditEvent({
            actorUserId: auth.user.id,
            exportName: "payouts",
            rowCount: cashOuts.length,
            metadata: {
                transfer_rows: transferByCashOutId.size,
            },
        });
    } catch (auditError) {
        logger.error("Admin payouts export audit failed", {
            actor_user_id: auth.user.id,
            error: auditError instanceof Error ? auditError.message : "Unknown export audit error",
        });
        return noStoreJson({ error: "Could not audit payouts export." }, { status: 500 });
    }

    const csv = [
        PAYOUT_EXPORT_HEADERS.join(","),
        ...cashOuts.map((cashOut) => cashOutToCsvRow(cashOut, transferByCashOutId.get(cashOut.id))),
    ].join("\n");

    return new NextResponse(csv, {
        status: 200,
        headers: {
            ...NO_STORE_HEADERS,
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${payoutExportFilename()}"`,
            "X-Robots-Tag": "noindex, noarchive",
        },
    });
}

function payoutExportFilename() {
    return `merch-tent-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
}

function cashOutToCsvRow(cashOut: ExportCashOut, transfer?: ExportArtistTransfer) {
    const artist = firstJoined(cashOut.artists);

    return [
        cashOut.id,
        cashOut.artist_id,
        artist?.display_name ?? "",
        cashOut.status ?? "",
        centsToDecimal(cashOut.total_cents),
        cashOut.created_at ?? "",
        cashOut.updated_at ?? "",
        transfer?.status ?? "",
        centsToDecimal(transfer?.amount_cents),
        transfer?.currency ?? "AUD",
        transfer?.stripe_transfer_id ?? "",
        transfer?.destination_account_id ?? "",
        transfer?.attempted_at ?? "",
        transfer?.succeeded_at ?? "",
        transfer?.failed_at ?? "",
        transfer?.failure_code ?? "",
        transfer?.failure_message ?? "",
    ].map(csvCell).join(",");
}

function firstJoined<T>(value: T | T[] | null | undefined) {
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function centsToDecimal(cents?: number | null) {
    return ((cents ?? 0) / 100).toFixed(2);
}
