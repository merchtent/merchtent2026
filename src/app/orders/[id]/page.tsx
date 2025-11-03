// app/order/[id]/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Receipt,
    Package,
    Truck,
    AlertTriangle,
    ChevronLeft,
    Clock,
} from "lucide-react";

export const revalidate = 0;

function fmtMoney(cents: number, currency: string) {
    try {
        return new Intl.NumberFormat("en-AU", {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
        }).format((cents ?? 0) / 100);
    } catch {
        return (cents / 100).toLocaleString(undefined, { style: "currency", currency });
    }
}

function fmtDate(iso?: string | null) {
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

export default async function OrderDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params; // await like your other pages
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
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">ORDER // ACCESS</h1>
                            <span className="text-xs bg-neutral-900 text-white px-2 py-1 rounded rotate-[-2deg]">
                                SIGN IN REQUIRED
                            </span>
                        </div>
                    </div>
                </section>
                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        Please <Link href="/auth/sign-in" className="underline">sign in</Link> to view this order.
                    </div>
                </div>
            </main>
        );
    }

    // Fetch the order and its items
    // If your schema has orders.user_id, add `.eq("user_id", user.id)` for ownership.
    const { data: order, error } = await supabase
        .from("orders")
        .select(
            "id, created_at, status, currency, subtotal_cents, tracking_code, tracking_url, order_items ( product_id, title, qty, unit_price_cents )"
        )
        .eq("id", id)
        .maybeSingle();

    if (error || !order) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">ORDER // ERROR</h1>
                        </div>
                    </div>
                </section>
                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-red-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {error ? `Error loading order: ${error.message}` : "Order not found."}
                    </div>
                    <div className="mt-4">
                        <Link href="/dashboard/orders" className="inline-flex items-center underline">
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Back to orders
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    const items: any[] = Array.isArray((order as any).order_items) ? (order as any).order_items : [];
    const shortId = (order.id as string);

    const subtotal = order.subtotal_cents ?? 0;
    // If you later add tax/shipping/discount columns, compute here
    const total = subtotal;

    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* angled banner */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">Dashboard</p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">Order details</h1>
                        </div>
                        {/* <div className="hidden md:flex items-center gap-2">
                            <StatusPill status={order.status} />
                        </div> */}
                    </div>
                </div>
            </section>

            {/* header rail */}
            <section className="max-w-5xl mx-auto px-4 pt-6 mt-2">
                <div className="flex items-center justify-between text-sm text-neutral-300">
                    <Link href="/dashboard/orders" className="inline-flex items-center hover:text-white">
                        <ChevronLeft className="h-4 w-4 mr-1" /> Back to orders
                    </Link>
                    <div className="flex items-center gap-3">
                        <span className="text-neutral-400">Order ID:</span>
                        <span className="font-mono">{shortId}</span>
                    </div>
                </div>
            </section>

            {/* layout */}
            <section className="max-w-5xl mx-auto px-4 py-8 grid md:grid-cols-3 gap-6">
                {/* left: items */}
                <Card
                    className="md:col-span-2 bg-neutral-900 border-neutral-800"
                    style={{ clipPath: "polygon(0% 0,100% 0,98% 100%,0 100%)" }}
                >
                    <CardContent className="p-0">
                        {items.length === 0 ? (
                            <div className="p-6 text-neutral-400">No items recorded.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-neutral-950/50 text-neutral-400">
                                        <tr>
                                            <th className="text-left py-2 px-4 font-medium">Item</th>
                                            <th className="text-left py-2 px-2 font-medium">Qty</th>
                                            <th className="text-right py-2 px-4 font-medium">Unit</th>
                                            <th className="text-right py-2 px-4 font-medium">Line</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((it, idx) => {
                                            const unit = it.unit_price_cents ?? 0;
                                            const line = (it.qty ?? 0) * unit;
                                            return (
                                                <tr
                                                    key={`${order.id}-${idx}`}
                                                    className="border-t border-neutral-800 hover:bg-neutral-900/40 text-neutral-300"
                                                >
                                                    <td className="py-2 px-4">
                                                        {it.product_id ? (
                                                            <Link className="underline" href={`/product/${it.product_id}`}>
                                                                {it.title}
                                                            </Link>
                                                        ) : (
                                                            it.title
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-2">{it.qty}</td>
                                                    <td className="py-2 px-4 text-right">
                                                        {fmtMoney(unit, order.currency)}
                                                    </td>
                                                    <td className="py-2 px-4 text-right">
                                                        {fmtMoney(line, order.currency)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-neutral-800">
                                            <td colSpan={3} className="py-3 px-4 text-right text-neutral-400">
                                                Subtotal
                                            </td>
                                            <td className="py-3 px-4 text-right font-semibold">
                                                {fmtMoney(subtotal, order.currency)}
                                            </td>
                                        </tr>
                                        {/* Add rows here later for tax/discount/shipping */}
                                        <tr className="border-t border-neutral-800">
                                            <td colSpan={3} className="py-3 px-4 text-right text-neutral-400">
                                                Total
                                            </td>
                                            <td className="py-3 px-4 text-right font-black text-red-400">
                                                {fmtMoney(total, order.currency)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}

                        {/* bottom rail */}
                        <div className="bg-neutral-900/70 border-t border-neutral-800 px-4 py-3 text-xs flex items-center justify-between">
                            <span className="text-neutral-400 inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                Placed {fmtDate(order.created_at)}
                            </span>
                            <div className="text-neutral-300">
                                <StatusPill status={order.status} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* right: meta / actions */}
                <div className="space-y-4">
                    <Card className="bg-neutral-900 border-neutral-800" style={{ clipPath: "polygon(2% 0,100% 0,98% 100%,0 100%)" }}>
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-neutral-400">Order</p>
                                <Receipt className="h-4 w-4 text-neutral-300" />
                            </div>
                            <div className="mt-2 text-sm">
                                <div className="text-neutral-300">Created</div>
                                <div className="text-neutral-400">{fmtDate(order.created_at)}</div>
                            </div>
                            <div className="mt-4">
                                <Button asChild className="w-full">
                                    <a href={`/api/orders/${order.id}/receipt`} target="_blank" rel="noopener noreferrer">
                                        Download receipt
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-neutral-900 border-neutral-800" style={{ clipPath: "polygon(2% 0,100% 0,98% 100%,0 100%)" }}>
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-neutral-400">Fulfilment</p>
                                <Truck className="h-4 w-4 text-neutral-300" />
                            </div>
                            <div className="mt-2 text-sm space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-neutral-300">Status</span>
                                    <StatusPill status={order.status} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-neutral-300">Tracking</span>
                                    {order.tracking_url ? (
                                        <a
                                            href={order.tracking_url as any}
                                            className="underline"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {order.tracking_code ?? "Track package"}
                                        </a>
                                    ) : (
                                        <span className="text-neutral-500">—</span>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-neutral-900 border-neutral-800" style={{ clipPath: "polygon(2% 0,100% 0,98% 100%,0 100%)" }}>
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-neutral-400">Totals</p>
                                <Package className="h-4 w-4 text-neutral-300" />
                            </div>
                            <div className="mt-3 text-sm space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-neutral-400">Subtotal</span>
                                    <span className="font-medium">{fmtMoney(subtotal, order.currency)}</span>
                                </div>
                                {/* Add more totals (tax, shipping, discount) when available */}
                                <div className="flex items-center justify-between border-t border-neutral-800 pt-2">
                                    <span className="text-neutral-400">Total</span>
                                    <span className="font-black text-red-400">{fmtMoney(total, order.currency)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>
        </main>
    );
}
