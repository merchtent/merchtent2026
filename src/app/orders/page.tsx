// app/dashboard/orders/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Package,
    Receipt,
    Truck,
    AlertTriangle,
    Clock,
    ChevronRight,
} from "lucide-react";

export const revalidate = 0; // always fetch fresh orders

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
            ? "bg-green-500/15 text-green-300 border-green-500/30"
            : s === "shipped"
                ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                : s === "pending" || s === "processing"
                    ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
                    : s === "cancelled" || s === "refunded"
                        ? "bg-red-500/15 text-red-300 border-red-500/30"
                        : "bg-neutral-500/10 text-neutral-300 border-neutral-700";
    return (
        <span className={`px-2 py-0.5 text-[11px] rounded-full border ${styles}`}>
            {status ?? "—"}
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
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                {/* angled banner */}
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                ORDERS // ACCESS
                            </h1>
                            <span className="text-xs bg-neutral-900 text-white px-2 py-1 rounded rotate-[-2deg]">
                                SIGN IN REQUIRED
                            </span>
                        </div>
                    </div>
                </section>

                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        <p className="text-neutral-300">
                            Please{" "}
                            <Link href="/auth/sign-in" className="underline">
                                sign in
                            </Link>{" "}
                            to view your orders.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    // Fetch orders (nested items via FK)
    const { data: orders, error } = await supabase
        .from("orders")
        .select(
            "id, created_at, status, currency, subtotal_cents, order_items ( product_id, title, qty, unit_price_cents )"
        )
        .order("created_at", { ascending: false });

    if (error) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                ORDERS // ERROR
                            </h1>
                        </div>
                    </div>
                </section>
                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-red-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Error loading orders: {error.message}
                    </div>
                </div>
            </main>
        );
    }

    const totalOrders = orders?.length ?? 0;
    const totalItems =
        orders?.reduce((acc, o: any) => acc + ((o.order_items?.length ?? 0) as number), 0) ??
        0;
    const totalGrossCents =
        orders?.reduce((acc, o: any) => acc + (o.subtotal_cents ?? 0), 0) ?? 0;

    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* angled banner */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">
                                Dashboard
                            </p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                My Orders
                            </h1>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-white">
                                LIVE
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* summary cards */}
            <section className="max-w-5xl mx-auto px-4 py-8">
                <div className="grid md:grid-cols-3 gap-4">
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
                        label="Gross subtotal"
                        value={fmtMoney(totalGrossCents, orders?.[0]?.currency ?? "AUD")}
                        icon={<Truck className="h-4 w-4" />}
                        accent
                    />
                </div>
            </section>

            {/* list / empty state */}
            <section className="max-w-5xl mx-auto px-4 pb-12">
                {!orders || orders.length === 0 ? (
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        <p className="text-neutral-300">
                            You don’t have any orders yet.{" "}
                            <Link href="/artists" className="underline">
                                Browse artists
                            </Link>
                            .
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {orders.map((o: any) => {
                            const shortId = (o.id as string).slice(0, 8) + "…";
                            const items: any[] = Array.isArray(o.order_items)
                                ? o.order_items
                                : [];
                            return (
                                <li
                                    key={o.id}
                                    className="rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden"
                                    style={{
                                        clipPath: "polygon(1% 0,100% 0,99% 100%,0 100%)",
                                    }}
                                >
                                    <div className="px-4 py-4 md:px-5 md:py-5 flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="text-sm text-neutral-400">
                                                {fmtDate(o.created_at)}
                                            </div>
                                            <div className="text-xs text-neutral-500">
                                                Order ID: <span className="font-mono">{shortId}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-semibold">
                                                {fmtMoney(o.subtotal_cents, o.currency)}
                                            </div>
                                            <div className="mt-1">
                                                <StatusPill status={o.status} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* items table */}
                                    {items.length > 0 ? (
                                        <div className="border-t border-neutral-800">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-neutral-950/50 text-neutral-400">
                                                        <tr>
                                                            <th className="text-left py-2 px-4 font-medium">
                                                                Item
                                                            </th>
                                                            <th className="text-left py-2 px-2 font-medium">
                                                                Qty
                                                            </th>
                                                            <th className="text-right py-2 px-4 font-medium">
                                                                Price
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {items.map((it, idx) => (
                                                            <tr
                                                                key={`${o.id}-${idx}`}
                                                                className="border-t border-neutral-800 hover:bg-neutral-900/40"
                                                            >
                                                                <td className="py-2 px-4">
                                                                    {it.product_id ? (
                                                                        <Link
                                                                            className="underline"
                                                                            href={`/product/${it.product_id}`}
                                                                        >
                                                                            {it.title}
                                                                        </Link>
                                                                    ) : (
                                                                        it.title
                                                                    )}
                                                                </td>
                                                                <td className="py-2 px-2">{it.qty}</td>
                                                                <td className="py-2 px-4 text-right">
                                                                    {fmtMoney(
                                                                        it.unit_price_cents,
                                                                        o.currency as string
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {/* bottom rail */}
                                            <div className="bg-neutral-900/70 border-t border-neutral-800 px-4 py-3 text-xs flex items-center justify-between">
                                                <span className="text-neutral-400 inline-flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    Placed {fmtDate(o.created_at)}
                                                </span>
                                                <Link
                                                    href={`/orders/${o.id}`}
                                                    className="inline-flex items-center text-neutral-200 hover:text-white"
                                                >
                                                    View details <ChevronRight className="h-4 w-4 ml-1" />
                                                </Link>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="border-t border-neutral-800 px-4 py-4 text-sm text-neutral-400">
                                            No items recorded.
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
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
        <Card
            className="bg-neutral-900 border-neutral-800"
            style={{ clipPath: "polygon(2% 0,100% 0,98% 100%,0 100%)" }}
        >
            <CardContent className="p-5 md:p-6">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-neutral-400">{label}</p>
                    {icon && <div className="text-neutral-300">{icon}</div>}
                </div>
                <p
                    className={`mt-2 text-2xl font-black ${accent ? "text-red-400" : "text-neutral-100"
                        }`}
                >
                    {value}
                </p>
            </CardContent>
        </Card>
    );
}
