// app/dashboard/cash-outs/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import RetryTransferButton from "./RetryTransferButton";
import {
    AlertTriangle,
    Wallet,
    Clock,
    CheckCircle2,
    ArrowRight,
} from "lucide-react";
import { requireArtistPage } from "@/lib/auth/artist";
import { logger } from "@/lib/logger";

export const revalidate = 0;

type CashOut = {
    id: string;
    total_cents: number | null;
    status: string | null;
    created_at: string;
    updated_at: string | null;
};

type ArtistTransfer = {
    cash_out_id: string;
    status: string | null;
    failure_code: string | null;
    failure_message: string | null;
    stripe_transfer_id: string | null;
    attempted_at: string | null;
    succeeded_at: string | null;
    failed_at: string | null;
    created_at: string | null;
    updated_at: string | null;
};

function formatCurrency(amount: number, currency = "AUD") {
    try {
        return new Intl.NumberFormat("en-AU", {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `$${amount.toFixed(2)}`;
    }
}

function artistSafeTransferFailureMessage(transfer?: ArtistTransfer | null) {
    if (!transfer || transfer.status !== "failed") return null;

    const failureCode = (transfer.failure_code ?? "").toLowerCase();
    if (
        failureCode.includes("account") ||
        failureCode.includes("capability") ||
        failureCode.includes("payout") ||
        failureCode.includes("recipient")
    ) {
        return "Stripe needs updated payout details before this cash out can be paid.";
    }

    return "This cash out transfer failed. Please retry or contact support if it keeps failing.";
}

function formatDateTime(value?: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleString("en-AU", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function transferActivityLabel(transfer?: ArtistTransfer | null) {
    if (!transfer) return "Not sent yet";
    if (transfer.succeeded_at) return `Paid ${formatDateTime(transfer.succeeded_at)}`;
    if (transfer.failed_at) return `Failed ${formatDateTime(transfer.failed_at)}`;
    if (transfer.attempted_at) return `Attempted ${formatDateTime(transfer.attempted_at)}`;
    return transfer.updated_at ? `Updated ${formatDateTime(transfer.updated_at)}` : "Not sent yet";
}

function StatusPill({ status }: { status?: string | null }) {
    const s = (status ?? "").toLowerCase();
    const styles =
        s === "paid"
            ? "bg-green-500/15 text-green-300 border-green-500/30"
            : s === "pending"
                ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
                : s.includes("failed")
                    ? "bg-red-500/15 text-red-300 border-red-500/30"
                : "bg-neutral-500/10 text-neutral-300 border-neutral-700";
    return (
        <span className={`px-2 py-0.5 text-[11px] rounded-full border ${styles}`}>
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : "—"}
        </span>
    );
}

export default async function CashOutsPage() {
    const { supabase, artist } = await requireArtistPage();

    // Cash out records
    const { data: cashOuts, error } = await supabase
        .from("cash_outs")
        .select("id, total_cents, status, created_at, updated_at")
        .eq("artist_id", artist.id)
        .order("created_at", { ascending: false });

    if (error) {
        logger.error("Cash-outs page failed to load cash outs", {
            artist_id: artist.id,
            error: error.message,
        });

        return (
            <main className="min-h-screen bg-black text-white">
                <section className="border-b border-neutral-800 p-5 md:p-8">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-400">Artist dashboard</p>
                    <h1 className="mt-3 text-3xl font-black uppercase leading-tight md:text-5xl">Payouts error.</h1>
                </section>
                <div className="p-5 md:p-8">
                    <div className="flex items-center gap-2 border border-neutral-800 bg-neutral-950 p-6 text-red-400">
                        <AlertTriangle className="h-4 w-4" />
                        Could not load payouts right now.
                    </div>
                </div>
            </main>
        );
    }

    const cashOutRows = (cashOuts ?? []) as CashOut[];
    const { data: transfers, error: transfersError } = cashOutRows.length
        ? await supabase
            .from("artist_transfers")
            .select("cash_out_id, status, failure_code, failure_message, stripe_transfer_id, attempted_at, succeeded_at, failed_at, created_at, updated_at")
            .eq("artist_id", artist.id)
        : { data: [], error: null };

    if (transfersError) {
        logger.error("Cash-outs page failed to load transfer status", {
            artist_id: artist.id,
            error: transfersError.message,
        });

        return (
            <main className="min-h-screen bg-black text-white">
                <section className="border-b border-neutral-800 p-5 md:p-8">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-400">Artist dashboard</p>
                    <h1 className="mt-3 text-3xl font-black uppercase leading-tight md:text-5xl">Payouts error.</h1>
                </section>
                <div className="p-5 md:p-8">
                    <div className="flex items-center gap-2 border border-neutral-800 bg-neutral-950 p-6 text-red-400">
                        <AlertTriangle className="h-4 w-4" />
                        Could not load payout transfer status right now.
                    </div>
                </div>
            </main>
        );
    }

    const transferByCashOutId = new Map(
        ((transfers ?? []) as ArtistTransfer[]).map((transfer) => [
            transfer.cash_out_id,
            transfer,
        ])
    );

    const totalPaidCents =
        cashOutRows.filter((c) => c.status === "paid").reduce((sum, c) => sum + (c.total_cents ?? 0), 0);

    const totalPendingCents =
        cashOutRows
            .filter((c) => c.status === "pending")
            .reduce((sum, c) => sum + (c.total_cents ?? 0), 0);

    const totalPaid = totalPaidCents / 100;
    const totalPending = totalPendingCents / 100;

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 bg-black">
                <div className="grid lg:grid-cols-[1fr_auto]">
                    <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-400">Payout ledger</p>
                        <h1 className="mt-3 text-3xl font-black uppercase leading-tight md:text-5xl">
                            {artist.display_name} payouts.
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                            Cash-out requests, transfer attempts, paid records, and retry paths.
                        </p>
                    </div>
                    <div className="flex items-end p-5 md:p-8">
                        <Link
                            href="/dashboard/cash-out"
                            className="inline-flex items-center gap-2 bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-500"
                        >
                            Request cash out <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800">
                <div className="grid md:grid-cols-2">
                    <SummaryCard
                        label="Total Paid"
                        value={formatCurrency(totalPaid)}
                        icon={<CheckCircle2 className="h-4 w-4" />}
                    />
                    <SummaryCard
                        label="Pending Payouts"
                        value={formatCurrency(totalPending)}
                        icon={<Clock className="h-4 w-4" />}
                        accent
                    />
                </div>
            </section>

            <section className="p-5 md:p-8">
                {!cashOutRows.length ? (
                    <div className="border border-neutral-800 bg-neutral-950 p-6">
                        <p className="text-neutral-300">No cash outs yet.</p>
                        <div className="mt-4">
                            <Button asChild variant="secondary">
                                <Link href="/dashboard/cash-out">Go to Cash Out</Link>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-hidden border border-neutral-800">
                        <div className="border-b border-neutral-800 bg-neutral-950 px-4 py-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-400">Payout history</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-black text-left text-neutral-400">
                                    <tr>
                                        <th className="py-2 px-4 font-medium">Date</th>
                                        <th className="py-2 px-4 font-medium">Amount</th>
                                        <th className="py-2 px-4 font-medium">Status</th>
                                        <th className="py-2 px-4 font-medium">Transfer</th>
                                        <th className="py-2 px-4 font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cashOutRows.map((c) => {
                                        const transfer = transferByCashOutId.get(c.id);
                                        const safeFailureMessage = artistSafeTransferFailureMessage(transfer);
                                        const canRetry =
                                            c.status === "transfer_failed" ||
                                            transfer?.status === "failed";

                                        return (
                                            <tr key={c.id} className="border-t border-neutral-800 bg-neutral-950 hover:bg-neutral-900">
                                                <td className="py-2 px-4">
                                                    {new Date(c.created_at).toLocaleDateString("en-AU", {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </td>
                                                <td className="py-2 px-4">
                                                    {formatCurrency((c.total_cents ?? 0) / 100)}
                                                </td>
                                                <td className="py-2 px-4">
                                                    <StatusPill status={c.status} />
                                                </td>
                                                <td className="py-2 px-4">
                                                    <div className="space-y-1">
                                                        <StatusPill status={transfer?.status ?? "not sent"} />
                                                        <p className="text-xs text-neutral-500">
                                                            {transferActivityLabel(transfer)}
                                                        </p>
                                                        {transfer?.stripe_transfer_id ? (
                                                            <p className="font-mono text-[11px] text-neutral-500">
                                                                {transfer.stripe_transfer_id}
                                                            </p>
                                                        ) : null}
                                                        {safeFailureMessage ? (
                                                            <p className="max-w-72 text-xs text-red-300">
                                                                {safeFailureMessage}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </td>
                                                <td className="py-2 px-4">
                                                    {canRetry ? <RetryTransferButton cashOutId={c.id} /> : null}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {/* bottom rail */}
                        <div className="border-t border-neutral-800 bg-black px-4 py-3 text-xs text-neutral-400 flex items-center gap-2">
                            <Wallet className="h-3.5 w-3.5" />
                            Payouts are processed to your saved bank details.
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}

/* ---------- UI Bits ---------- */
function SummaryCard({
    label,
    value,
    icon,
    accent,
}: {
    label: string;
    value: string;
    icon?: React.ReactNode;
    accent?: boolean;
}) {
    return (
        <div className="border-b border-r border-neutral-800 bg-neutral-950 p-5 md:p-6">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">{label}</p>
                {icon && <div className="text-red-400">{icon}</div>}
            </div>
            <p className={`mt-5 text-2xl font-black md:text-4xl ${accent ? "text-red-400" : "text-white"}`}>
                {value}
            </p>
        </div>
    );
}
