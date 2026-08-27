import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import {
    ArrowRight,
    Package,
    Receipt,
    AlertTriangle,
    Clock,
    Coins,
    Headphones,
    ShieldCheck,
    ShoppingBag,
    Truck,
} from "lucide-react";
import { logger } from "@/lib/logger";

export const revalidate = 0; // always fetch fresh orders

type OrderItem = {
    product_id: string | null;
    title: string | null;
    qty: number | null;
    unit_price_cents: number | null;
};

type OrderRow = {
    id: string;
    created_at: string | null;
    status: string | null;
    currency: string | null;
    subtotal_cents: number | null;
    order_items: OrderItem[] | null;
};

function fmtMoney(cents: number, currency: string) {
    try {
        return new Intl.NumberFormat("en-AU", {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
        }).format((cents ?? 0) / 100);
    } catch {
        return (cents / 100).toLocaleString(undefined, {
            style: "currency",
            currency,
        });
    }
}

function fmtDate(iso: string | null | undefined) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-AU", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function StatusPill({ status }: { status?: string | null }) {
    const s = (status ?? "").toLowerCase();
    const styles =
        s === "paid" || s === "fulfilled"
            ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/40"
            : s === "shipped"
                ? "bg-sky-500/15 text-sky-200 border-sky-500/40"
                : s === "pending" || s === "processing"
                    ? "bg-yellow-500/15 text-yellow-200 border-yellow-500/40"
                    : s === "cancelled" || s === "refunded"
                        ? "bg-red-500/15 text-red-200 border-red-500/40"
                        : "bg-white/10 text-white border-white/20";
    return (
        <span className={`inline-flex border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${styles}`}>
            {status ?? "Unknown"}
        </span>
    );
}

export default async function OrdersPage() {
    const supabase = getServerSupabase();

    // Require sign-in
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return (
            <main className="min-h-screen bg-black text-white">
                <section className="border-b border-white/10 bg-[radial-gradient(circle_at_20%_10%,rgba(239,68,68,0.22),transparent_30%),linear-gradient(135deg,#050505,#111)]">
                    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-[1.1fr_0.9fr] md:px-6 md:py-20">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.35em] text-red-500">
                                Fan account
                            </p>
                            <h1 className="mt-4 max-w-3xl text-5xl font-black uppercase leading-[0.88] tracking-normal md:text-7xl">
                                Orders stay with the fan.
                            </h1>
                            <p className="mt-5 max-w-xl text-base leading-7 text-white/70">
                                Sign in to see purchases, fulfilment updates, receipts and merch credits in one place.
                            </p>
                            <Link
                                href="/auth/sign-in"
                                className="mt-8 inline-flex items-center gap-2 bg-red-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-red-500"
                            >
                                Sign in to view orders <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                        <div className="grid content-end border border-white/10 bg-black/60 p-5">
                            <div className="border border-red-500/50 p-5">
                                <p className="text-xs font-black uppercase tracking-[0.25em] text-red-400">
                                    Receipt wall
                                </p>
                                <p className="mt-3 text-2xl font-black uppercase leading-tight">
                                    Every drop, credit and delivery update lands here.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    // Fetch orders (nested items via FK)
    const { data: orders, error } = await supabase
        .from("orders")
        .select(
            "id, created_at, status, currency, subtotal_cents, order_items ( product_id, title, qty, unit_price_cents )"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    const { data: creditBalance, error: creditBalanceError } = await supabase
        .from("merch_credit_balances")
        .select("points_balance, lifetime_points")
        .eq("user_id", user.id)
        .maybeSingle();

    if (creditBalanceError) {
        logger.error("Customer orders page failed to load merch credit balance", {
            user_id: user.id,
            error: creditBalanceError.message,
        });
    }

    if (error) {
        logger.error("Customer orders page failed to load orders", {
            user_id: user.id,
            error: error.message,
        });

        return (
            <main className="min-h-screen bg-black text-white">
                <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
                    <div className="border border-red-500/40 bg-red-950/20 p-6 text-red-100">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5" />
                            <p className="text-sm font-black uppercase tracking-[0.18em]">
                                Could not load your orders right now.
                            </p>
                        </div>
                        <Link
                            href="/"
                            className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-white underline decoration-red-500 underline-offset-4"
                        >
                            Back to the shop <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </section>
            </main>
        );
    }

    const totalOrders = orders?.length ?? 0;
    const orderRows = (orders ?? []) as OrderRow[];
    const totalItems = orderRows.reduce(
        (acc, o) =>
            acc +
            (Array.isArray(o.order_items)
                ? o.order_items.reduce((itemAcc, item) => itemAcc + (item.qty ?? 0), 0)
                : 0),
        0
    );
    const totalGrossCents =
        orderRows.reduce((acc, o) => acc + (o.subtotal_cents ?? 0), 0) ?? 0;
    const activeOrders = orderRows.filter((o) =>
        ["paid", "processing", "pending"].includes((o.status ?? "").toLowerCase())
    ).length;
    const latestOrder = orderRows[0];
    const creditPoints = creditBalance?.points_balance ?? 0;

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-white/10 bg-[radial-gradient(circle_at_18%_14%,rgba(239,68,68,0.24),transparent_28%),linear-gradient(135deg,#050505,#121212_55%,#030303)]">
                <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.2fr_0.8fr] md:px-6 md:py-16">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.35em] text-red-500">
                            Fan dashboard
                        </p>
                        <h1 className="mt-4 text-5xl font-black uppercase leading-[0.86] tracking-normal md:text-7xl">
                            Your merch trail.
                        </h1>
                        <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">
                            Purchases, fulfilment status, receipts and fan credits, kept together so every drop you backed is easy to find.
                        </p>
                    </div>
                    <div className="grid border border-white/10 bg-black/55">
                        <div className="border-b border-white/10 p-5">
                            <p className="text-xs font-black uppercase tracking-[0.25em] text-red-400">
                                Latest receipt
                            </p>
                            <p className="mt-3 text-3xl font-black uppercase leading-none">
                                {latestOrder ? fmtDate(latestOrder.created_at) : "No orders yet"}
                            </p>
                        </div>
                        <div className="grid grid-cols-2">
                            <MiniMetric label="Active" value={String(activeOrders)} />
                            <MiniMetric label="Credits" value={creditBalanceError ? "—" : `${creditPoints}`} />
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-8 md:px-6">
                <div className="grid gap-px border border-white/10 bg-white/10 md:grid-cols-4">
                    <SummaryCard
                        label="Orders"
                        value={String(totalOrders)}
                        icon={<Receipt className="h-4 w-4" />}
                    />
                    <SummaryCard
                        label="Items in orders"
                        value={String(totalItems)}
                        icon={<Package className="h-4 w-4" />}
                    />
                    <SummaryCard
                        label="Total backed"
                        value={fmtMoney(totalGrossCents, orders?.[0]?.currency ?? "AUD")}
                        icon={<Truck className="h-4 w-4" />}
                        accent
                    />
                    <SummaryCard
                        label="Merch credits"
                        value={creditBalanceError ? "Unavailable" : `${creditBalance?.points_balance ?? 0} pts`}
                        icon={<Coins className="h-4 w-4" />}
                        sub={
                            creditBalanceError
                                ? "Credit balance could not be loaded right now"
                                : `${Math.min(creditBalance?.points_balance ?? 0, 20)}/20 toward a free tee`
                        }
                    />
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 pb-14 md:px-6">
                <div className="mb-5 flex flex-col justify-between gap-4 border-y border-white/10 py-5 md:flex-row md:items-end">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.35em] text-red-500">
                            Receipts from the table
                        </p>
                        <h2 className="mt-2 text-3xl font-black uppercase leading-none md:text-5xl">
                            Order history
                        </h2>
                    </div>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 self-start border border-white/25 px-4 py-3 text-sm font-black uppercase tracking-wide hover:border-red-500 hover:text-red-400"
                    >
                        Shop new drops <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                {orderRows.length === 0 ? (
                    <div className="grid border border-white/10 bg-white/[0.03] md:grid-cols-[1fr_0.8fr]">
                        <div className="p-6 md:p-8">
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
                                Nothing pinned up yet
                            </p>
                            <h3 className="mt-3 max-w-xl text-4xl font-black uppercase leading-[0.9] md:text-6xl">
                                Your first drop receipt will land here.
                            </h3>
                            <p className="mt-5 max-w-xl text-sm leading-6 text-white/65">
                                Buy from an artist, earn merch credits, and keep the fulfilment trail attached to your account.
                            </p>
                            <div className="mt-7 flex flex-wrap gap-3">
                                <Link
                                    href="/artists"
                                    className="inline-flex items-center gap-2 bg-red-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-red-500"
                                >
                                    Browse artists <ArrowRight className="h-4 w-4" />
                                </Link>
                                <Link
                                    href="/category/tees"
                                    className="inline-flex items-center gap-2 border border-white/25 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:border-red-500 hover:text-red-400"
                                >
                                    Shop tees
                                </Link>
                            </div>
                        </div>
                        <div className="grid content-end border-t border-white/10 bg-[linear-gradient(135deg,rgba(239,68,68,0.18),transparent_40%),#090909] p-6 md:border-l md:border-t-0">
                            <div className="border border-white/10 bg-black/50 p-5">
                                <ShoppingBag className="h-8 w-8 text-red-500" />
                                <p className="mt-4 text-2xl font-black uppercase leading-tight">
                                    Back the band. Keep the proof.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <ul className="space-y-5">
                        {orderRows.map((o) => {
                            const shortId = `${o.id.slice(0, 8)}...`;
                            const items: OrderItem[] = Array.isArray(o.order_items)
                                ? o.order_items
                                : [];
                            const itemQty = items.reduce((acc, item) => acc + (item.qty ?? 0), 0);
                            const headline = items[0]?.title ?? "Merch Tent order";
                            return (
                                <li
                                    key={o.id}
                                    className="overflow-hidden border border-white/10 bg-white/[0.03]"
                                >
                                    <div className="grid md:grid-cols-[1.15fr_0.45fr_0.25fr]">
                                        <div className="p-5 md:p-6">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <StatusPill status={o.status} />
                                                <span className="text-xs font-black uppercase tracking-[0.25em] text-white/45">
                                                    Order {shortId}
                                                </span>
                                            </div>
                                            <h3 className="mt-4 max-w-2xl text-2xl font-black uppercase leading-tight md:text-3xl">
                                                {headline}
                                            </h3>
                                            <p className="mt-2 text-sm text-white/55">
                                                {fmtDate(o.created_at)}
                                                {itemQty > 0 ? ` / ${itemQty} item${itemQty === 1 ? "" : "s"}` : ""}
                                            </p>
                                        </div>
                                        <div className="border-t border-white/10 p-5 md:border-l md:border-t-0 md:p-6">
                                            <p className="text-xs font-black uppercase tracking-[0.25em] text-red-400">
                                                Total
                                            </p>
                                            <p className="mt-2 text-4xl font-black text-white">
                                                {fmtMoney(o.subtotal_cents ?? 0, o.currency ?? "AUD")}
                                            </p>
                                        </div>
                                        <div className="grid border-t border-white/10 md:border-l md:border-t-0">
                                            <Link
                                                href={`/dashboard/orders/${o.id}`}
                                                className="grid place-items-center bg-red-600 p-5 text-sm font-black uppercase tracking-wide text-white hover:bg-red-500 md:p-6"
                                                aria-label={`View order ${shortId}`}
                                            >
                                                View <ArrowRight className="mt-2 h-5 w-5" />
                                            </Link>
                                        </div>
                                    </div>

                                    <div className="border-t border-white/10">
                                        {items.length > 0 ? (
                                            <div className="divide-y divide-white/10">
                                                {items.slice(0, 3).map((it, idx) => (
                                                    <div
                                                        key={`${o.id}-${idx}`}
                                                        className="grid gap-3 px-5 py-3 text-sm md:grid-cols-[1fr_auto_auto] md:items-center md:px-6"
                                                    >
                                                        <div className="font-semibold text-white/90">
                                                            {it.product_id ? (
                                                                <Link
                                                                    className="hover:text-red-400"
                                                                    href={`/product/${it.product_id}`}
                                                                >
                                                                    {it.title}
                                                                </Link>
                                                            ) : (
                                                                it.title
                                                            )}
                                                        </div>
                                                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                                                            Qty {it.qty ?? 0}
                                                        </div>
                                                        <div className="font-black text-white">
                                                            {fmtMoney(
                                                                it.unit_price_cents ?? 0,
                                                                o.currency ?? "AUD"
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {items.length > 3 ? (
                                                    <div className="px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-white/45 md:px-6">
                                                        + {items.length - 3} more item{items.length - 3 === 1 ? "" : "s"}
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : (
                                            <div className="px-5 py-4 text-sm text-white/55 md:px-6">
                                                No items recorded.
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-3 border-t border-white/10 bg-black/45 px-5 py-4 text-xs md:flex-row md:items-center md:justify-between md:px-6">
                                            <span className="inline-flex items-center gap-2 text-white/55">
                                                <Clock className="h-3.5 w-3.5 text-red-400" />
                                                Placed {fmtDate(o.created_at)}
                                            </span>
                                            <span className="inline-flex items-center gap-2 text-white/55">
                                                <ShieldCheck className="h-3.5 w-3.5 text-red-400" />
                                                Receipt and fulfilment updates stay attached to your account.
                                            </span>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                <div className="mt-8 grid gap-px border border-white/10 bg-white/10 md:grid-cols-3">
                    <SupportTile
                        icon={<Package className="h-5 w-5" />}
                        title="Made after sale"
                        body="Merch Tent avoids dead stock by tracking each order from checkout into fulfilment."
                    />
                    <SupportTile
                        icon={<Coins className="h-5 w-5" />}
                        title="Fan credits"
                        body="Eligible purchases build your credit balance for future rewards and drops."
                    />
                    <SupportTile
                        icon={<Headphones className="h-5 w-5" />}
                        title="Need help?"
                        body={
                            <>
                                Something looks wrong?{" "}
                                <Link
                                    href="/contact"
                                    className="font-black text-white underline decoration-red-500 underline-offset-4"
                                >
                                    Contact support
                                </Link>
                                .
                            </>
                        }
                    />
                </div>
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
    sub,
}: {
    label: string;
    value: string;
    icon?: React.ReactNode;
    accent?: boolean;
    sub?: string;
}) {
    return (
        <div className="bg-black p-5 md:p-6">
            <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">{label}</p>
                {icon && <div className="text-red-400">{icon}</div>}
            </div>
            <p
                className={`mt-3 text-3xl font-black uppercase leading-none ${accent ? "text-red-400" : "text-white"
                    }`}
            >
                {value}
            </p>
            {sub ? <p className="mt-2 text-xs uppercase tracking-[0.14em] text-white/40">{sub}</p> : null}
        </div>
    );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="border-r border-white/10 p-5 last:border-r-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">{label}</p>
            <p className="mt-2 text-3xl font-black uppercase leading-none text-white">
                {value}
            </p>
        </div>
    );
}

function SupportTile({
    icon,
    title,
    body,
}: {
    icon: React.ReactNode;
    title: string;
    body: React.ReactNode;
}) {
    return (
        <div className="bg-black p-5 md:p-6">
            <div className="text-red-400">{icon}</div>
            <h3 className="mt-4 text-lg font-black uppercase leading-tight">
                {title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/55">
                {body}
            </p>
        </div>
    );
}
