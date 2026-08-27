export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { csvCell } from "@/lib/admin/csv";
import { NO_STORE_HEADERS, noStoreJson } from "@/lib/api/no-store";
import { recordAdminExportAuditEvent } from "@/lib/admin/export-audit";
import { requireAdmin } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";
import { getServiceSupabase } from "@/lib/supabase/service";

type ExportProfile = {
    account_type?: string | null;
    role?: string | null;
    display_name?: string | null;
};

type ExportMerchCreditBalance = {
    user_id: string;
    points_balance?: number | null;
    lifetime_points?: number | null;
    redeemed_points?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
    profiles?: ExportProfile | ExportProfile[] | null;
};

type ExportMerchCreditReservation = {
    user_id: string;
    points?: number | null;
    discount_cents?: number | null;
};

type ExportMerchCreditReconciliationException = {
    user_id: string;
    ledger_points_balance?: number | null;
    ledger_lifetime_points?: number | null;
    ledger_redeemed_points?: number | null;
    exception_reason?: string | null;
};

const MERCH_CREDIT_EXPORT_HEADERS = [
    "user_id",
    "account_type",
    "role",
    "display_name",
    "points_balance",
    "lifetime_points",
    "redeemed_points",
    "ledger_points_balance",
    "ledger_lifetime_points",
    "ledger_redeemed_points",
    "reconciliation_status",
    "active_reserved_points",
    "active_reserved_discount_cents",
    "available_points_after_reservations",
    "redemption_units_20_points",
    "created_at",
    "updated_at",
] as const;

export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    const serviceSupabase = getServiceSupabase();
    const { data: balanceData, error: balanceError } = await serviceSupabase
        .from("merch_credit_balances")
        .select(`
            user_id,
            points_balance,
            lifetime_points,
            redeemed_points,
            created_at,
            updated_at,
            profiles (
                account_type,
                role,
                display_name
            )
        `)
        .order("updated_at", { ascending: false })
        .limit(10_000);

    if (balanceError) {
        logger.error("Admin merch credits export failed", {
            actor_user_id: auth.user.id,
            error: balanceError.message,
        });
        return noStoreJson({ error: "Could not export merch credits." }, { status: 500 });
    }

    const balances = (balanceData ?? []) as ExportMerchCreditBalance[];
    const userIds = balances.map((balance) => balance.user_id);
    const { data: reservationData, error: reservationError } = userIds.length
        ? await serviceSupabase
            .from("merch_credit_reservations")
            .select("user_id, points, discount_cents")
            .in("user_id", userIds)
            .eq("status", "reserved")
            .gt("expires_at", new Date().toISOString())
            .limit(10_000)
        : { data: [], error: null };

    if (reservationError) {
        logger.error("Admin merch credits export reservation lookup failed", {
            actor_user_id: auth.user.id,
            error: reservationError.message,
        });
        return noStoreJson({ error: "Could not export merch credit reservations." }, { status: 500 });
    }

    const { data: reconciliationData, error: reconciliationError } = userIds.length
        ? await serviceSupabase
            .from("merch_credit_balance_reconciliation_exceptions")
            .select("user_id, ledger_points_balance, ledger_lifetime_points, ledger_redeemed_points, exception_reason")
            .in("user_id", userIds)
            .limit(10_000)
        : { data: [], error: null };

    if (reconciliationError) {
        logger.error("Admin merch credits export reconciliation lookup failed", {
            actor_user_id: auth.user.id,
            error: reconciliationError.message,
        });
        return noStoreJson({ error: "Could not export merch credit reconciliation." }, { status: 500 });
    }

    const reservedByUserId = buildReservedTotals((reservationData ?? []) as ExportMerchCreditReservation[]);
    const reconciliationByUserId = new Map(
        ((reconciliationData ?? []) as ExportMerchCreditReconciliationException[]).map((exception) => [
            exception.user_id,
            exception,
        ])
    );
    try {
        await recordAdminExportAuditEvent({
            actorUserId: auth.user.id,
            exportName: "merch_credits",
            rowCount: balances.length,
            metadata: {
                active_reservation_users: reservedByUserId.size,
                reconciliation_exception_users: reconciliationByUserId.size,
            },
        });
    } catch (auditError) {
        logger.error("Admin merch credits export audit failed", {
            actor_user_id: auth.user.id,
            error: auditError instanceof Error ? auditError.message : "Unknown export audit error",
        });
        return noStoreJson({ error: "Could not audit merch credits export." }, { status: 500 });
    }

    const csv = [
        MERCH_CREDIT_EXPORT_HEADERS.join(","),
        ...balances.map((balance) => balanceToCsvRow(
            balance,
            reservedByUserId.get(balance.user_id),
            reconciliationByUserId.get(balance.user_id)
        )),
    ].join("\n");

    return new NextResponse(csv, {
        status: 200,
        headers: {
            ...NO_STORE_HEADERS,
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${merchCreditExportFilename()}"`,
            "X-Robots-Tag": "noindex, noarchive",
        },
    });
}

function merchCreditExportFilename() {
    return `merch-tent-merch-credits-${new Date().toISOString().slice(0, 10)}.csv`;
}

function balanceToCsvRow(
    balance: ExportMerchCreditBalance,
    reserved?: { active_reserved_points: number; active_reserved_discount_cents: number },
    reconciliation?: ExportMerchCreditReconciliationException
) {
    const profile = firstJoined(balance.profiles);
    const pointsBalance = balance.points_balance ?? 0;
    const activeReservedPoints = reserved?.active_reserved_points ?? 0;
    const availablePoints = Math.max(pointsBalance - activeReservedPoints, 0);

    return [
        balance.user_id,
        profile?.account_type ?? "",
        profile?.role ?? "",
        profile?.display_name ?? "",
        String(pointsBalance),
        String(balance.lifetime_points ?? 0),
        String(balance.redeemed_points ?? 0),
        String(reconciliation?.ledger_points_balance ?? pointsBalance),
        String(reconciliation?.ledger_lifetime_points ?? balance.lifetime_points ?? 0),
        String(reconciliation?.ledger_redeemed_points ?? balance.redeemed_points ?? 0),
        reconciliation?.exception_reason ?? "ok",
        String(activeReservedPoints),
        centsToDecimal(reserved?.active_reserved_discount_cents),
        String(availablePoints),
        String(Math.floor(availablePoints / 20)),
        balance.created_at ?? "",
        balance.updated_at ?? "",
    ].map(csvCell).join(",");
}

function buildReservedTotals(reservations: ExportMerchCreditReservation[]) {
    const totals = new Map<string, { active_reserved_points: number; active_reserved_discount_cents: number }>();

    for (const reservation of reservations) {
        const current = totals.get(reservation.user_id) ?? {
            active_reserved_points: 0,
            active_reserved_discount_cents: 0,
        };
        current.active_reserved_points += reservation.points ?? 0;
        current.active_reserved_discount_cents += reservation.discount_cents ?? 0;
        totals.set(reservation.user_id, current);
    }

    return totals;
}

function firstJoined<T>(value: T | T[] | null | undefined) {
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function centsToDecimal(cents?: number | null) {
    return ((cents ?? 0) / 100).toFixed(2);
}
