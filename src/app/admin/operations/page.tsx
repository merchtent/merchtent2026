import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle2, ClipboardList, Coins, Download, PackageSearch, RadioTower, ReceiptText, WalletCards } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import AdjustMerchCreditsForm from "./AdjustMerchCreditsForm";
import ExpireCreditReservationsButton from "./ExpireCreditReservationsButton";
import RetryNotificationButton from "./RetryNotificationButton";
import MarkStaleWebhooksFailedButton from "./MarkStaleWebhooksFailedButton";
import RetryPayoutButton from "./RetryPayoutButton";
import RepairProductGenerationButton from "./RepairProductGenerationButton";
import SubmitFulfillmentExceptionButton from "./SubmitFulfillmentExceptionButton";
import MarkStaleProductGenerationsFailedButton from "./MarkStaleProductGenerationsFailedButton";
import RetryPrintifyOrderSyncButton from "./RetryPrintifyOrderSyncButton";
import ReviewStripeFinancialEventButton from "./ReviewStripeFinancialEventButton";

export const revalidate = 0;

const STALE_WEBHOOK_PROCESSING_MINUTES = 15;
const STALE_NOTIFICATION_PENDING_MINUTES = 15;
const STALE_PRINTIFY_ORDER_SYNC_MINUTES = 30;
const SEVERE_PLATFORM_EVENT_WINDOW_HOURS = 24;

type OperationalException = {
    id: string;
    order_number: string | null;
    stripe_session_id: string | null;
    status: string | null;
    operational_status: string | null;
    created_at: string | null;
    item_rows: number | null;
    item_units: number | null;
    fulfillment_job_id: string | null;
    fulfillment_status: string | null;
    exception_reason: string | null;
};

type StripeWebhookEvent = {
    event_id: string;
    event_type: string;
    status: string;
    attempts: number;
    last_error: string | null;
    created_at: string;
    processing_started_at?: string | null;
};

type NotificationDelivery = {
    id: string;
    order_id: string | null;
    channel: string;
    recipient: string | null;
    status: string;
    attempts: number;
    last_error: string | null;
    created_at: string;
};

type FulfillmentException = {
    fulfillment_job_id: string;
    order_id: string;
    order_number: string | null;
    email: string | null;
    status: string;
    priority: string;
    queued_at: string | null;
    exception_reason: string;
    age_seconds: number | null;
};

type PrintifyOrderSyncException = {
    order_id: string;
    status: string;
    printify_order_id: string | null;
    error_message: string | null;
    attempted_at: string | null;
    succeeded_at: string | null;
    failed_at: string | null;
};

type PayoutException = {
    transfer_id: string | null;
    cash_out_id: string;
    artist_id: string;
    artist_name: string | null;
    total_cents: number | null;
    cash_out_status: string | null;
    transfer_status: string | null;
    failure_code: string | null;
    failure_message: string | null;
    stripe_transfer_id: string | null;
    attempted_at: string | null;
    created_at: string | null;
    exception_reason: string;
    age_seconds: number | null;
};

type StripeFinancialEvent = {
    id: string;
    stripe_event_id: string;
    stripe_event_type: string;
    severity: string;
    order_id: string | null;
    order_number: string | null;
    stripe_payment_intent_id: string | null;
    stripe_charge_id: string | null;
    amount_cents: number | null;
    amount_refunded_cents: number | null;
    currency: string | null;
    reason: string | null;
    stripe_status: string | null;
    failure_code: string | null;
    failure_message: string | null;
    review_status: string;
    received_at: string | null;
};

type ProductGenerationException = {
    product_id: string;
    artist_id: string | null;
    artist_name: string | null;
    title: string | null;
    slug: string | null;
    production_status: string | null;
    moderation_status: string | null;
    readiness_notes: string | null;
    product_design_id: string | null;
    validation_status: string | null;
    print_asset_front_path: string | null;
    primary_image_path: string | null;
    exception_reason: string;
    age_seconds: number | null;
};

type MerchCreditException = {
    reservation_id: string;
    user_id: string;
    order_id: string | null;
    order_number: string | null;
    stripe_session_id: string | null;
    points: number;
    discount_cents: number;
    currency: string;
    status: string;
    expires_at: string | null;
    created_at: string | null;
    exception_reason: string;
    age_seconds: number | null;
};

type MerchCreditBalanceReconciliationException = {
    user_id: string;
    points_balance: number;
    lifetime_points: number;
    redeemed_points: number;
    ledger_points_balance: number;
    ledger_lifetime_points: number;
    ledger_redeemed_points: number;
    exception_reason: string;
    updated_at: string | null;
    last_ledger_at: string | null;
};

type PlatformEvent = {
    id: string;
    scope: string;
    action: string;
    severity: string;
    message: string | null;
    order_id: string | null;
    external_id: string | null;
    created_at: string;
};

type QueryFailure = {
    label: string;
};

type QueryFailureSource = {
    label: string;
    error: { message: string } | null;
};

function fmtDate(value?: string | null) {
    if (!value) return "-";
    return new Date(value).toLocaleString("en-AU", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function fmtAge(seconds?: number | null) {
    if (!seconds || seconds < 0) return "-";
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    return `${hours}h`;
}

function fmtMoney(cents?: number | null, currency = "AUD") {
    const amount = (cents ?? 0) / 100;
    return new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency,
    }).format(amount);
}

function minutesAgo(minutes: number) {
    return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function hoursAgo(hours: number) {
    return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function StatusPill({ status }: { status?: string | null }) {
    const normalized = status ?? "unknown";
    const styles =
        normalized === "processed" || normalized === "sent" || normalized === "ready_for_fulfillment"
            ? "border-green-500/30 bg-green-500/15 text-green-300"
            : normalized === "failed" || normalized === "critical" || normalized === "error"
                ? "border-red-500/30 bg-red-500/15 text-red-300"
                : "border-yellow-500/30 bg-yellow-500/15 text-yellow-200";

    return (
        <span className={`border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${styles}`}>
            {normalized.replaceAll("_", " ")}
        </span>
    );
}

function Panel({
    title,
    icon,
    children,
}: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="border border-neutral-800 bg-neutral-950">
            <div className="flex items-center gap-2 border-b border-neutral-800 px-5 py-4">
                <span className="text-red-400">{icon}</span>
                <h2 className="font-black uppercase">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </section>
    );
}

export default async function AdminOperationsPage() {
    const supabase = getServerSupabase();
    const staleWebhookCutoff = minutesAgo(STALE_WEBHOOK_PROCESSING_MINUTES);
    const staleNotificationCutoff = minutesAgo(STALE_NOTIFICATION_PENDING_MINUTES);
    const stalePrintifyOrderSyncCutoff = minutesAgo(STALE_PRINTIFY_ORDER_SYNC_MINUTES);
    const severePlatformEventCutoff = hoursAgo(SEVERE_PLATFORM_EVENT_WINDOW_HOURS);

    const [
        exceptionsRes,
        failedWebhooksRes,
        staleProcessingWebhooksRes,
        failedNotificationsRes,
        stalePendingNotificationsRes,
        fulfillmentExceptionsRes,
        failedPrintifyOrderSyncsRes,
        stalePrintifyOrderSyncsRes,
        payoutExceptionsRes,
        stripeFinancialEventsRes,
        productGenerationExceptionsRes,
        merchCreditExceptionsRes,
        merchCreditBalanceReconciliationExceptionsRes,
        platformEventsRes,
        severePlatformEventsRes,
    ] = await Promise.all([
        supabase
            .from("orders_operational_exceptions")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(25),
        supabase
            .from("stripe_webhook_events")
            .select("event_id, event_type, status, attempts, last_error, created_at, processing_started_at")
            .eq("status", "failed")
            .order("created_at", { ascending: false })
            .limit(25),
        supabase
            .from("stripe_webhook_events")
            .select("event_id, event_type, status, attempts, last_error, created_at, processing_started_at")
            .eq("status", "processing")
            .lt("processing_started_at", staleWebhookCutoff)
            .order("processing_started_at", { ascending: true })
            .limit(25),
        supabase
            .from("notification_deliveries")
            .select("id, order_id, channel, recipient, status, attempts, last_error, created_at")
            .eq("status", "failed")
            .order("created_at", { ascending: false })
            .limit(25),
        supabase
            .from("notification_deliveries")
            .select("id, order_id, channel, recipient, status, attempts, last_error, created_at")
            .eq("status", "pending")
            .lt("created_at", staleNotificationCutoff)
            .order("created_at", { ascending: true })
            .limit(25),
        supabase
            .from("fulfillment_operational_exceptions")
            .select("fulfillment_job_id, order_id, order_number, email, status, priority, queued_at, exception_reason, age_seconds")
            .order("queued_at", { ascending: true })
            .limit(25),
        supabase
            .from("printify_order_syncs")
            .select("order_id, status, printify_order_id, error_message, attempted_at, succeeded_at, failed_at")
            .eq("status", "failed")
            .order("failed_at", { ascending: false })
            .limit(25),
        supabase
            .from("printify_order_syncs")
            .select("order_id, status, printify_order_id, error_message, attempted_at, succeeded_at, failed_at")
            .eq("status", "started")
            .lt("attempted_at", stalePrintifyOrderSyncCutoff)
            .order("attempted_at", { ascending: true })
            .limit(25),
        supabase
            .from("payout_operational_exceptions")
            .select("transfer_id, cash_out_id, artist_id, artist_name, total_cents, cash_out_status, transfer_status, failure_code, failure_message, stripe_transfer_id, attempted_at, created_at, exception_reason, age_seconds")
            .order("created_at", { ascending: true })
            .limit(25),
        supabase
            .from("stripe_financial_events")
            .select("id, stripe_event_id, stripe_event_type, severity, order_id, order_number, stripe_payment_intent_id, stripe_charge_id, amount_cents, amount_refunded_cents, currency, reason, stripe_status, failure_code, failure_message, review_status, received_at")
            .in("review_status", ["open", "investigating"])
            .order("received_at", { ascending: false })
            .limit(25),
        supabase
            .from("product_generation_operational_exceptions")
            .select("product_id, artist_id, artist_name, title, slug, production_status, moderation_status, readiness_notes, product_design_id, validation_status, print_asset_front_path, primary_image_path, exception_reason, age_seconds")
            .order("created_at", { ascending: true })
            .limit(25),
        supabase
            .from("merch_credit_operational_exceptions")
            .select("reservation_id, user_id, order_id, order_number, stripe_session_id, points, discount_cents, currency, status, expires_at, created_at, exception_reason, age_seconds")
            .order("created_at", { ascending: true })
            .limit(25),
        supabase
            .from("merch_credit_balance_reconciliation_exceptions")
            .select("user_id, points_balance, lifetime_points, redeemed_points, ledger_points_balance, ledger_lifetime_points, ledger_redeemed_points, exception_reason, updated_at, last_ledger_at")
            .order("updated_at", { ascending: true })
            .limit(25),
        supabase
            .from("platform_events")
            .select("id, scope, action, severity, message, order_id, external_id, created_at")
            .order("created_at", { ascending: false })
            .limit(50),
        supabase
            .from("platform_events")
            .select("*", { count: "exact", head: true })
            .in("severity", ["error", "critical"])
            .gte("created_at", severePlatformEventCutoff),
    ]);

    const exceptions = (exceptionsRes.data ?? []) as OperationalException[];
    const failedWebhooks = [
        ...((failedWebhooksRes.data ?? []) as StripeWebhookEvent[]),
        ...((staleProcessingWebhooksRes.data ?? []) as StripeWebhookEvent[]),
    ];
    const failedNotifications = [
        ...((failedNotificationsRes.data ?? []) as NotificationDelivery[]),
        ...((stalePendingNotificationsRes.data ?? []) as NotificationDelivery[]),
    ];
    const fulfillmentExceptions = (fulfillmentExceptionsRes.data ?? []) as FulfillmentException[];
    const printifyOrderSyncExceptions = [
        ...((failedPrintifyOrderSyncsRes.data ?? []) as PrintifyOrderSyncException[]),
        ...((stalePrintifyOrderSyncsRes.data ?? []) as PrintifyOrderSyncException[]),
    ];
    const payoutExceptions = (payoutExceptionsRes.data ?? []) as PayoutException[];
    const stripeFinancialEvents = (stripeFinancialEventsRes.data ?? []) as StripeFinancialEvent[];
    const productGenerationExceptions = (productGenerationExceptionsRes.data ?? []) as ProductGenerationException[];
    const merchCreditExceptions = (merchCreditExceptionsRes.data ?? []) as MerchCreditException[];
    const merchCreditBalanceReconciliationExceptions = (merchCreditBalanceReconciliationExceptionsRes.data ?? []) as MerchCreditBalanceReconciliationException[];
    const platformEvents = (platformEventsRes.data ?? []) as PlatformEvent[];
    const severePlatformEventCount = severePlatformEventsRes.count ?? 0;
    const queryFailureSources: QueryFailureSource[] = [
        { label: "Order exceptions", error: exceptionsRes.error },
        { label: "Webhook issues", error: failedWebhooksRes.error },
        { label: "Stale webhook issues", error: staleProcessingWebhooksRes.error },
        { label: "Notification issues", error: failedNotificationsRes.error },
        { label: "Stale notification issues", error: stalePendingNotificationsRes.error },
        { label: "Fulfillment SLA", error: fulfillmentExceptionsRes.error },
        { label: "Printify order sync failures", error: failedPrintifyOrderSyncsRes.error },
        { label: "Stale Printify order syncs", error: stalePrintifyOrderSyncsRes.error },
        { label: "Payout issues", error: payoutExceptionsRes.error },
        { label: "Stripe financial events", error: stripeFinancialEventsRes.error },
        { label: "Product generation", error: productGenerationExceptionsRes.error },
        { label: "Merch credits", error: merchCreditExceptionsRes.error },
        { label: "Merch credit balance reconciliation", error: merchCreditBalanceReconciliationExceptionsRes.error },
        { label: "Platform events", error: platformEventsRes.error },
        { label: "Severe platform events", error: severePlatformEventsRes.error },
    ];
    const queryFailures: QueryFailure[] = queryFailureSources
        .filter((failure) => failure.error)
        .map((failure) => {
            logger.error("Admin operations page query failed", {
                label: failure.label,
                error: failure.error?.message,
            });
            return { label: failure.label };
        });
    const attentionCount =
        exceptions.length +
        failedWebhooks.length +
        failedNotifications.length +
        fulfillmentExceptions.length +
        printifyOrderSyncExceptions.length +
        payoutExceptions.length +
        stripeFinancialEvents.length +
        productGenerationExceptions.length +
        merchCreditExceptions.length +
        merchCreditBalanceReconciliationExceptions.length +
        severePlatformEventCount +
        queryFailures.length;

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 p-5 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">
                        Operations
                    </p>
                    <h1 className="mt-2 text-5xl font-black uppercase leading-[0.88] md:text-7xl">Production health.</h1>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                        Failed or stale operations, webhook state, notifications, and audit events.
                    </p>
                </div>
                <div className="border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm font-black uppercase tracking-[0.08em]">
                    {attentionCount === 0 ? (
                        <CheckCircle2 className="mr-2 inline h-4 w-4 text-lime-300" />
                    ) : (
                        <AlertTriangle className="mr-2 inline h-4 w-4 text-red-400" />
                    )}
                    {attentionCount} need attention
                </div>
            </div>
            </section>

            <section className="grid border-b border-neutral-800 md:grid-cols-3 xl:grid-cols-6">
                <Metric label="Order exceptions" value={exceptions.length} />
                <Metric label="Fulfillment SLA" value={fulfillmentExceptions.length} />
                <Metric label="Printify sync" value={printifyOrderSyncExceptions.length} />
                <Metric label="Payout issues" value={payoutExceptions.length} />
                <Metric label="Financial review" value={stripeFinancialEvents.length} />
                <Metric label="Product generation" value={productGenerationExceptions.length} />
                <Metric label="Credit issues" value={merchCreditExceptions.length + merchCreditBalanceReconciliationExceptions.length} />
                <Metric label="Webhook issues" value={failedWebhooks.length} />
                <Metric label="Notification issues" value={failedNotifications.length} />
                <Metric label="Severe events" value={severePlatformEventCount} />
                <Metric label="Recent events" value={platformEvents.length} />
                <Metric label="Dashboard query errors" value={queryFailures.length} />
            </section>

            <section className="grid gap-px bg-neutral-800 p-px xl:grid-cols-2">
                {queryFailures.length > 0 ? (
                    <Panel title="Dashboard Data Issues" icon={<AlertTriangle className="h-4 w-4" />}>
                        <div className="space-y-3">
                            {queryFailures.map((failure) => (
                                <div key={failure.label} className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                                    <div className="font-semibold text-red-200">{failure.label}</div>
                                    <div className="mt-1 text-sm text-red-100/80">
                                        Could not load one or more operational data sources.
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Panel>
                ) : null}

                <Panel title="Order Exceptions" icon={<ReceiptText className="h-4 w-4" />}>
                    {exceptions.length === 0 ? (
                        <p className="text-sm text-neutral-400">No paid order exceptions detected.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-left text-neutral-400">
                                    <tr>
                                        <th className="pb-2">Order</th>
                                        <th className="pb-2">Items</th>
                                        <th className="pb-2">Fulfillment</th>
                                        <th className="pb-2">Reason</th>
                                        <th className="pb-2">Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {exceptions.map((row) => (
                                        <tr key={row.id} className="border-t border-neutral-800">
                                            <td className="py-3">
                                                <Link href={`/admin/orders/${row.id}`} className="text-red-300 underline">
                                                    {row.order_number ?? row.id}
                                                </Link>
                                            </td>
                                            <td className="py-3">{row.item_rows ?? 0} rows / {row.item_units ?? 0} units</td>
                                            <td className="py-3"><StatusPill status={row.fulfillment_status ?? "missing"} /></td>
                                            <td className="py-3 text-neutral-300">{(row.exception_reason ?? "unknown").replaceAll("_", " ")}</td>
                                            <td className="py-3 text-neutral-400">{fmtDate(row.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>

                <Panel title="Fulfillment SLA Exceptions" icon={<ClipboardList className="h-4 w-4" />}>
                    {fulfillmentExceptions.length === 0 ? (
                        <p className="text-sm text-neutral-400">No stale fulfillment jobs detected.</p>
                    ) : (
                        <div className="space-y-3">
                            {fulfillmentExceptions.map((job) => (
                                <div key={job.fulfillment_job_id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <Link href={`/admin/orders/${job.order_id}`} className="font-semibold text-red-300 underline">
                                            {job.order_number ?? job.order_id}
                                        </Link>
                                        <StatusPill status={job.status} />
                                    </div>
                                    <div className="mt-1 text-sm text-neutral-300">
                                        {job.exception_reason.replaceAll("_", " ")} · {job.priority}
                                    </div>
                                    <div className="mt-1 text-xs text-neutral-500">
                                        Age: {fmtAge(job.age_seconds)} · Queued {fmtDate(job.queued_at)}
                                    </div>
                                    {job.email ? <div className="mt-1 text-xs text-neutral-500">{job.email}</div> : null}
                                    {job.status !== "completed" && job.status !== "cancelled" ? (
                                        <SubmitFulfillmentExceptionButton jobId={job.fulfillment_job_id} />
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>

                <Panel title="Printify Order Sync Exceptions" icon={<PackageSearch className="h-4 w-4" />}>
                    {printifyOrderSyncExceptions.length === 0 ? (
                        <p className="text-sm text-neutral-400">No failed or stale Printify order syncs detected.</p>
                    ) : (
                        <div className="space-y-3">
                            {printifyOrderSyncExceptions.map((sync) => (
                                <div key={`${sync.order_id}-${sync.status}`} className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <Link href={`/admin/orders/${sync.order_id}`} className="font-semibold text-red-300 underline">
                                            {sync.order_id}
                                        </Link>
                                        <StatusPill status={sync.status} />
                                    </div>
                                    <div className="mt-1 text-xs text-neutral-500">
                                        Attempted {fmtDate(sync.succeeded_at ?? sync.failed_at ?? sync.attempted_at)}
                                    </div>
                                    {sync.printify_order_id ? (
                                        <div className="mt-1 font-mono text-[11px] text-neutral-500">
                                            {sync.printify_order_id}
                                        </div>
                                    ) : null}
                                    {sync.error_message ? (
                                        <p className="mt-2 text-xs text-red-300">
                                            {sync.error_message}
                                        </p>
                                    ) : null}
                                    <RetryPrintifyOrderSyncButton orderId={String(sync.order_id)} />
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>

                <Panel title="Payout Exceptions" icon={<WalletCards className="h-4 w-4" />}>
                    {payoutExceptions.length === 0 ? (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-neutral-400">No failed, stale, or inconsistent payout records detected.</p>
                            <Link
                                href="/api/admin/payouts/export"
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-xs font-semibold text-neutral-100 transition hover:border-red-500 hover:text-red-200"
                            >
                                <Download className="h-3.5 w-3.5" />
                                Export CSV
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-end">
                                <Link
                                    href="/api/admin/payouts/export"
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-xs font-semibold text-neutral-100 transition hover:border-red-500 hover:text-red-200"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Export CSV
                                </Link>
                            </div>
                            {payoutExceptions.map((payout) => (
                                <div key={payout.transfer_id ?? payout.cash_out_id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="font-semibold text-red-300">
                                            {payout.artist_name ?? payout.artist_id}
                                        </div>
                                        <StatusPill status={payout.transfer_status ?? payout.cash_out_status} />
                                    </div>
                                    <div className="mt-1 text-sm text-neutral-300">
                                        {payout.exception_reason.replaceAll("_", " ")} · {fmtMoney(payout.total_cents)}
                                    </div>
                                    <div className="mt-1 text-xs text-neutral-500">
                                        Age: {fmtAge(payout.age_seconds)} · Attempted {fmtDate(payout.attempted_at ?? payout.created_at)}
                                    </div>
                                    {payout.failure_message ? (
                                        <p className="mt-2 text-xs text-red-300">
                                            {payout.failure_code ? `${payout.failure_code}: ` : ""}
                                            {payout.failure_message}
                                        </p>
                                    ) : null}
                                    {payout.stripe_transfer_id ? (
                                        <div className="mt-1 font-mono text-[11px] text-neutral-500">
                                            {payout.stripe_transfer_id}
                                        </div>
                                    ) : null}
                                    <RetryPayoutButton cashOutId={payout.cash_out_id} />
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>

                <Panel title="Stripe Financial Review" icon={<ReceiptText className="h-4 w-4" />}>
                    {stripeFinancialEvents.length === 0 ? (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-neutral-400">No unresolved refund, dispute, or payment failure events.</p>
                            <Link
                                href="/api/admin/stripe-financial-events/export"
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-xs font-semibold text-neutral-100 transition hover:border-red-500 hover:text-red-200"
                            >
                                <Download className="h-3.5 w-3.5" />
                                Export CSV
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-end">
                                <Link
                                    href="/api/admin/stripe-financial-events/export"
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-xs font-semibold text-neutral-100 transition hover:border-red-500 hover:text-red-200"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Export CSV
                                </Link>
                            </div>
                            {stripeFinancialEvents.map((event) => (
                                <div key={event.id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="font-semibold text-red-300">
                                            {event.order_id ? (
                                                <Link href={`/admin/orders/${event.order_id}`} className="underline">
                                                    {event.order_number ?? event.order_id}
                                                </Link>
                                            ) : (
                                                event.stripe_event_type
                                            )}
                                        </div>
                                        <StatusPill status={event.severity} />
                                    </div>
                                    <div className="mt-1 text-sm text-neutral-300">
                                        {event.stripe_event_type.replaceAll(".", " ")} · {event.review_status.replaceAll("_", " ")}
                                    </div>
                                    <div className="mt-1 text-xs text-neutral-500">
                                        Amount {fmtMoney(event.amount_refunded_cents ?? event.amount_cents, event.currency ?? "AUD")} · Received {fmtDate(event.received_at)}
                                    </div>
                                    {event.reason || event.stripe_status ? (
                                        <div className="mt-1 text-xs text-neutral-500">
                                            {event.reason ? `Reason ${event.reason}` : ""}
                                            {event.reason && event.stripe_status ? " · " : ""}
                                            {event.stripe_status ? `Stripe status ${event.stripe_status}` : ""}
                                        </div>
                                    ) : null}
                                    {event.failure_message ? (
                                        <p className="mt-2 text-xs text-red-300">
                                            {event.failure_code ? `${event.failure_code}: ` : ""}
                                            {event.failure_message}
                                        </p>
                                    ) : null}
                                    <div className="mt-1 space-y-1 font-mono text-[11px] text-neutral-500">
                                        <div>{event.stripe_event_id}</div>
                                        {event.stripe_payment_intent_id ? <div>{event.stripe_payment_intent_id}</div> : null}
                                        {event.stripe_charge_id ? <div>{event.stripe_charge_id}</div> : null}
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {event.review_status === "open" ? (
                                            <ReviewStripeFinancialEventButton
                                                eventId={event.id}
                                                status="investigating"
                                            />
                                        ) : null}
                                        <ReviewStripeFinancialEventButton
                                            eventId={event.id}
                                            status="resolved"
                                        />
                                        <ReviewStripeFinancialEventButton
                                            eventId={event.id}
                                            status="ignored"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>

                <Panel title="Product Generation Exceptions" icon={<PackageSearch className="h-4 w-4" />}>
                    {productGenerationExceptions.length === 0 ? (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-neutral-400">No product generation issues detected.</p>
                            <MarkStaleProductGenerationsFailedButton />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-end">
                                <MarkStaleProductGenerationsFailedButton />
                            </div>
                            {productGenerationExceptions.map((product) => (
                                <div key={product.product_id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <Link href={`/admin/products/${product.product_id}`} className="font-semibold text-red-300 underline">
                                            {product.title ?? product.product_id}
                                        </Link>
                                        <StatusPill status={product.validation_status ?? product.exception_reason} />
                                    </div>
                                    <div className="mt-1 text-sm text-neutral-300">
                                        {product.exception_reason.replaceAll("_", " ")}
                                        {product.artist_name ? ` · ${product.artist_name}` : ""}
                                    </div>
                                    <div className="mt-1 text-xs text-neutral-500">
                                        Status {product.production_status ?? "unknown"} · Moderation {product.moderation_status ?? "unknown"} · Age: {fmtAge(product.age_seconds)} · Mockup {product.primary_image_path ? "present" : "missing"} · Print {product.print_asset_front_path ? "present" : "missing"}
                                    </div>
                                    {product.readiness_notes ? (
                                        <p className="mt-2 text-xs text-yellow-200">
                                            {product.readiness_notes}
                                        </p>
                                    ) : null}
                                    {product.slug ? (
                                        <div className="mt-1 font-mono text-[11px] text-neutral-500">
                                            {product.slug}
                                        </div>
                                    ) : null}
                                    {product.product_design_id ? (
                                        <RepairProductGenerationButton productId={product.product_id} />
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>

                <Panel title="Merch Credit Exceptions" icon={<Coins className="h-4 w-4" />}>
                    {merchCreditExceptions.length === 0 && merchCreditBalanceReconciliationExceptions.length === 0 ? (
                        <div className="space-y-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-neutral-400">No stale reservations or credit balance mismatches detected.</p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Link
                                        href="/api/admin/merch-credits/export"
                                        className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-sm font-semibold text-neutral-100 transition hover:border-red-400 hover:text-red-200"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        Export CSV
                                    </Link>
                                    <ExpireCreditReservationsButton />
                                </div>
                            </div>
                            <AdjustMerchCreditsForm />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex flex-wrap justify-end gap-2">
                                <Link
                                    href="/api/admin/merch-credits/export"
                                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-sm font-semibold text-neutral-100 transition hover:border-red-400 hover:text-red-200"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Export CSV
                                </Link>
                                <ExpireCreditReservationsButton />
                            </div>
                            <AdjustMerchCreditsForm />
                            {merchCreditBalanceReconciliationExceptions.map((balance) => (
                                <div key={balance.user_id} className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="font-mono text-xs text-red-200">{balance.user_id}</div>
                                        <StatusPill status={balance.exception_reason} />
                                    </div>
                                    <div className="mt-2 grid gap-2 text-sm text-neutral-200 sm:grid-cols-3">
                                        <div>Current: {balance.points_balance} / ledger {balance.ledger_points_balance}</div>
                                        <div>Lifetime: {balance.lifetime_points} / ledger {balance.ledger_lifetime_points}</div>
                                        <div>Redeemed: {balance.redeemed_points} / ledger {balance.ledger_redeemed_points}</div>
                                    </div>
                                    <div className="mt-1 text-xs text-neutral-500">
                                        Balance updated {fmtDate(balance.updated_at)} · Last ledger {fmtDate(balance.last_ledger_at)}
                                    </div>
                                </div>
                            ))}
                            {merchCreditExceptions.map((reservation) => (
                                <div key={reservation.reservation_id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="font-semibold text-red-300">
                                            {reservation.order_id ? (
                                                <Link href={`/admin/orders/${reservation.order_id}`} className="underline">
                                                    {reservation.order_number ?? reservation.order_id}
                                                </Link>
                                            ) : (
                                                reservation.stripe_session_id ?? reservation.reservation_id
                                            )}
                                        </div>
                                        <StatusPill status={reservation.exception_reason} />
                                    </div>
                                    <div className="mt-1 text-sm text-neutral-300">
                                        {reservation.points} points · {fmtMoney(reservation.discount_cents, reservation.currency)}
                                    </div>
                                    <div className="mt-1 text-xs text-neutral-500">
                                        Status {reservation.status} · Age {fmtAge(reservation.age_seconds)} · Expires {fmtDate(reservation.expires_at)}
                                    </div>
                                    <div className="mt-1 font-mono text-[11px] text-neutral-500">
                                        {reservation.reservation_id}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>

                <Panel title="Webhook Issues" icon={<RadioTower className="h-4 w-4" />}>
                    {failedWebhooks.length === 0 ? (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-neutral-400">No failed or stale webhook events.</p>
                            <MarkStaleWebhooksFailedButton />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-end">
                                <MarkStaleWebhooksFailedButton />
                            </div>
                            {failedWebhooks.map((event) => (
                                <div key={event.event_id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="font-mono text-xs">{event.event_id}</div>
                                        <StatusPill status={event.status} />
                                    </div>
                                    <div className="mt-1 text-sm text-neutral-300">{event.event_type}</div>
                                    <div className="mt-1 text-xs text-neutral-500">
                                        Attempts: {event.attempts} · {fmtDate(event.processing_started_at ?? event.created_at)}
                                    </div>
                                    {event.last_error ? <p className="mt-2 text-xs text-red-300">{event.last_error}</p> : null}
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>

                <Panel title="Notification Issues" icon={<Bell className="h-4 w-4" />}>
                    {failedNotifications.length === 0 ? (
                        <p className="text-sm text-neutral-400">No failed or stale pending notifications.</p>
                    ) : (
                        <div className="space-y-3">
                            {failedNotifications.map((delivery) => (
                                <div key={delivery.id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-semibold">{delivery.channel}</div>
                                        <StatusPill status={delivery.status} />
                                    </div>
                                    <div className="mt-1 text-xs text-neutral-500">
                                        Attempts: {delivery.attempts} · {fmtDate(delivery.created_at)}
                                    </div>
                                    {delivery.order_id ? (
                                        <Link href={`/admin/orders/${delivery.order_id}`} className="mt-1 block text-xs text-red-300 underline">
                                            View order
                                        </Link>
                                    ) : null}
                                    {delivery.last_error ? <p className="mt-2 text-xs text-red-300">{delivery.last_error}</p> : null}
                                    {(delivery.channel === "email" || delivery.channel === "sms") && delivery.order_id ? (
                                        <RetryNotificationButton deliveryId={delivery.id} />
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>

                <Panel title="Recent Platform Events" icon={<AlertTriangle className="h-4 w-4" />}>
                    {platformEvents.length === 0 ? (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-neutral-400">No platform events recorded yet.</p>
                            <Link
                                href="/api/admin/platform-events/export"
                                className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-sm font-semibold text-neutral-100 transition hover:border-red-400 hover:text-red-200"
                            >
                                <Download className="h-3.5 w-3.5" />
                                Export CSV
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-end">
                                <Link
                                    href="/api/admin/platform-events/export"
                                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-sm font-semibold text-neutral-100 transition hover:border-red-400 hover:text-red-200"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Export CSV
                                </Link>
                            </div>
                            {platformEvents.map((event) => (
                                <div key={event.id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-semibold">{event.scope} / {event.action}</div>
                                        <StatusPill status={event.severity} />
                                    </div>
                                    <p className="mt-1 text-sm text-neutral-300">{event.message ?? event.external_id ?? "Event recorded"}</p>
                                    <div className="mt-1 text-xs text-neutral-500">{fmtDate(event.created_at)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
            </section>
        </main>
    );
}

function Metric({ label, value }: { label: string; value: number }) {
    return (
        <div className="border-b border-r border-neutral-800 bg-neutral-950 p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">{label}</div>
            <div className="mt-3 text-3xl font-black text-lime-300">{value}</div>
        </div>
    );
}
