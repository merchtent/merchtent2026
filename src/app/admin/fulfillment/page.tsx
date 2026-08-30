import Link from "next/link";
import { AlertTriangle, ClipboardList, Download } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import FulfillmentJobActions from "./FulfillmentJobActions";

export const revalidate = 0;

type FulfillmentJob = {
    id: string;
    order_id: string;
    status: string;
    priority: string;
    queued_at: string;
    started_at: string | null;
    completed_at: string | null;
    orders: {
        id: string;
        order_number: string | null;
        email: string | null;
        first_name: string | null;
        last_name: string | null;
        total_cents: number | null;
        created_at: string;
    } | null;
};

type RawFulfillmentJob = Omit<FulfillmentJob, "orders"> & {
    orders: FulfillmentJob["orders"] | FulfillmentJob["orders"][];
};

type PrintifyOrderSync = {
    order_id: string;
    status: string;
    printify_order_id: string | null;
    error_message: string | null;
    attempted_at: string | null;
    succeeded_at: string | null;
    failed_at: string | null;
};

function normaliseFulfillmentJob(row: RawFulfillmentJob): FulfillmentJob {
    return {
        ...row,
        orders: Array.isArray(row.orders) ? row.orders[0] ?? null : row.orders,
    };
}

function StatusPill({ status }: { status: string }) {
    const styles =
        status === "completed" || status === "succeeded"
            ? "border-green-500/30 bg-green-500/15 text-green-300"
            : status === "failed"
                ? "border-red-500/30 bg-red-500/15 text-red-300"
            : status === "in_progress" || status === "started"
                ? "border-sky-500/30 bg-sky-500/15 text-sky-200"
                : "border-yellow-500/30 bg-yellow-500/15 text-yellow-200";

    return (
        <span className={`border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${styles}`}>
            {status.replace("_", " ")}
        </span>
    );
}

function formatMoney(cents?: number | null) {
    return new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
    }).format((cents ?? 0) / 100);
}

function formatDate(value?: string | null) {
    if (!value) return "-";
    return new Date(value).toLocaleString("en-AU");
}

function truncateOperationalMessage(value?: string | null) {
    if (!value) return null;
    return value.length > 180 ? `${value.slice(0, 177)}...` : value;
}

export default async function AdminFulfillmentPage() {
    const supabase = getServerSupabase();
    const { data: jobs, error } = await supabase
        .from("fulfillment_jobs")
        .select(`
            id,
            order_id,
            status,
            priority,
            queued_at,
            started_at,
            completed_at,
            orders (
                id,
                order_number,
                email,
                first_name,
                last_name,
                total_cents,
                created_at
            )
        `)
        .order("queued_at", { ascending: true });

    const rows = ((jobs ?? []) as unknown as RawFulfillmentJob[]).map(normaliseFulfillmentJob);
    const orderIds = rows.map((job) => job.order_id);
    const { data: printifySyncRows, error: printifySyncError } = orderIds.length
        ? await supabase
            .from("printify_order_syncs")
            .select("order_id, status, printify_order_id, error_message, attempted_at, succeeded_at, failed_at")
            .in("order_id", orderIds)
        : { data: [], error: null };
    const printifySyncByOrderId = new Map(
        ((printifySyncRows ?? []) as PrintifyOrderSync[]).map((sync) => [sync.order_id, sync])
    );

    if (error) {
        logger.error("Admin fulfillment page failed to load jobs", {
            error: error.message,
        });
    }

    if (printifySyncError) {
        logger.error("Admin fulfillment page failed to load Printify sync ledger", {
            error: printifySyncError.message,
        });
    }

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 p-5 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">
                        Operations
                    </p>
                    <h1 className="mt-2 text-5xl font-black uppercase leading-[0.88] md:text-7xl">Fulfilment</h1>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                        Internal Merch Tent production queue, supplier handoff state and exception handling.
                    </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Link
                        href="/api/admin/fulfillment/export"
                        className="inline-flex items-center justify-center gap-2 border border-neutral-700 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-neutral-100 transition hover:border-lime-300 hover:text-lime-300"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Link>
                    <div className="border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm font-black uppercase tracking-[0.08em]">
                        <ClipboardList className="mr-2 inline h-4 w-4 text-red-400" />
                        {rows.filter((job) => job.status !== "completed" && job.status !== "cancelled").length} open
                    </div>
                </div>
            </div>
            </section>

            {error ? (
                <div className="m-5 flex items-center gap-2 border border-red-900 bg-red-950/20 p-6 text-red-300 md:m-8">
                    <AlertTriangle className="h-4 w-4" />
                    Could not load fulfillment jobs. Check platform logs for details.
                </div>
            ) : rows.length === 0 ? (
                <div className="m-5 border border-neutral-800 bg-neutral-950 p-6 text-neutral-300 md:m-8">
                    No fulfillment jobs yet.
                </div>
            ) : (
                <section className="p-5 md:p-8">
                <div className="overflow-x-auto border border-neutral-800 bg-neutral-950">
                    {printifySyncError ? (
                        <div className="flex items-center gap-2 border-b border-red-900 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                            <AlertTriangle className="h-4 w-4" />
                            Could not load Printify sync status. Check platform logs for details.
                        </div>
                    ) : null}
                    <table className="w-full text-sm">
                        <thead className="bg-black text-left text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                            <tr>
                                <th className="p-4">Order</th>
                                <th className="p-4">Customer</th>
                                <th className="p-4">Total</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Printify Sync</th>
                                <th className="p-4">Queued</th>
                                <th className="p-4">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((job) => {
                                const printifySync = printifySyncByOrderId.get(job.order_id);
                                const printifyAttemptedAt =
                                    printifySync?.succeeded_at ??
                                    printifySync?.failed_at ??
                                    printifySync?.attempted_at;
                                const printifyError = truncateOperationalMessage(printifySync?.error_message);

                                return (
                                    <tr key={job.id} className="border-t border-neutral-800 transition hover:bg-neutral-900">
                                        <td className="p-4">
                                            <Link
                                                href={`/admin/orders/${job.order_id}`}
                                                className="font-black text-lime-300 hover:text-white"
                                            >
                                                {job.orders?.order_number ?? job.order_id}
                                            </Link>
                                        </td>
                                        <td className="p-4">
                                            <div>
                                                {job.orders?.first_name} {job.orders?.last_name}
                                            </div>
                                            <div className="text-xs text-neutral-500">{job.orders?.email}</div>
                                        </td>
                                        <td className="p-4">{formatMoney(job.orders?.total_cents)}</td>
                                        <td className="p-4">
                                            <StatusPill status={job.status} />
                                        </td>
                                        <td className="p-4">
                                            {printifySync ? (
                                                <div className="space-y-1">
                                                    <StatusPill status={printifySync.status} />
                                                    <div className="text-xs text-neutral-500">
                                                        Last: {formatDate(printifyAttemptedAt)}
                                                    </div>
                                                    {printifySync.printify_order_id ? (
                                                        <div className="font-mono text-[11px] text-neutral-500">
                                                            {printifySync.printify_order_id}
                                                        </div>
                                                    ) : null}
                                                    {printifyError ? (
                                                        <div className="max-w-xs text-xs text-red-300">
                                                            {printifyError}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-neutral-500">Not submitted</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-neutral-400">
                                            {formatDate(job.queued_at)}
                                        </td>
                                        <td className="p-4">
                                            <FulfillmentJobActions jobId={job.id} status={job.status} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                </section>
            )}
        </main>
    );
}
