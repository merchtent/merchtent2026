// app/dashboard/sales/page.tsx
import Link from "next/link";
import SalesFilter from "@/components/SalesFilter";
import { BadgePercent, DollarSign, Package, ShoppingCart, AlertTriangle } from "lucide-react";
import { requireArtistPage } from "@/lib/auth/artist";
import { logger } from "@/lib/logger";

export const revalidate = 0;

type RangeOption = "all" | "30d" | "7d";

type SalesProduct = {
    artist_cut_cents?: number | null;
};

type SalesOrder = {
    created_at?: string | null;
};

type SalesRow = {
    id: string;
    product_id?: string | null;
    qty?: number | null;
    title?: string | null;
    products?: SalesProduct | SalesProduct[] | null;
    orders?: SalesOrder | SalesOrder[] | null;
};

function firstJoined<T>(value: T | T[] | null | undefined): T | null {
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function formatCurrency(n: number, currency = "AUD") {
    try {
        return new Intl.NumberFormat("en-AU", {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
        }).format(n);
    } catch {
        return `$${n.toFixed(2)}`;
    }
}

export default async function SalesPage({
    searchParams,
}: {
    searchParams: { range?: RangeOption };
}) {
    const { supabase, artist } = await requireArtistPage();

    // Determine date range
    let since: Date | null = null;
    const range = (searchParams.range ?? "all") as RangeOption;

    if (range === "30d") {
        since = new Date();
        since.setDate(since.getDate() - 30);
    } else if (range === "7d") {
        since = new Date();
        since.setDate(since.getDate() - 7);
    }

    // Build query
    let query = supabase
        .from("order_items")
        .select(
            `
      id,
      qty,
      title,
      product_id,
      unit_price_cents,
      products ( artist_cut_cents ),
      orders ( created_at )
    `
        )
        .eq("artist_id", artist.id)
        .order("orders(created_at)", { ascending: false });

    if (since) {
        query = query.gte("orders.created_at", since.toISOString());
    }

    const { data: sales, error } = await query;

    if (error) {
        logger.error("Artist sales page failed to load sales", {
            artist_id: artist.id,
            error: error.message,
        });

        return (
            <main className="min-h-screen bg-black text-white">
                <section className="border-b border-neutral-800 p-5 md:p-8">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-400">Artist backstage</p>
                    <h1 className="mt-3 text-5xl font-black uppercase leading-none md:text-7xl">Sales error.</h1>
                </section>
                <div className="p-5 md:p-8">
                    <div className="border border-neutral-800 bg-neutral-950 p-6">
                        <p className="text-red-400 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Could not load sales right now.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    const salesRows = (sales ?? []) as SalesRow[];

    // Calculate totals (artist profit only)
    const totalSales = salesRows.length;
    const totalUnits =
        salesRows.reduce((sum, s) => sum + (s.qty ?? 0), 0);

    const totalProfitCents =
        salesRows.reduce((sum, s) => {
            const product = firstJoined(s.products);
            const artistCut = product?.artist_cut_cents ?? 0;
            return sum + (s.qty ?? 0) * artistCut;
        }, 0);

    const totalProfit = totalProfitCents / 100;

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 bg-black">
                <div className="grid lg:grid-cols-[1fr_auto]">
                    <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-400">Sales board</p>
                        <h1 className="mt-3 text-5xl font-black uppercase leading-[0.86] md:text-7xl">
                            {artist.display_name} sales.
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                            Revenue, unit movement, and artist cut by period.
                        </p>
                    </div>
                    <div className="flex items-end p-5 md:p-8">
                        <SalesFilter />
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800">
                <div className="grid md:grid-cols-3">
                    <SummaryCard
                        label="Sales"
                        value={String(totalSales)}
                        icon={<ShoppingCart className="h-4 w-4" />}
                    />
                    <SummaryCard
                        label="Units sold"
                        value={String(totalUnits)}
                        icon={<Package className="h-4 w-4" />}
                    />
                    <SummaryCard
                        label="Artist profit"
                        value={formatCurrency(totalProfit)}
                        icon={<DollarSign className="h-4 w-4" />}
                        accent
                    />
                </div>
            </section>

            <section className="p-5 md:p-8">
                {!salesRows.length ? (
                    <div className="border border-neutral-800 bg-neutral-950 p-6 text-neutral-300">
                        No sales yet for this period.
                    </div>
                ) : (
                    <div className="overflow-hidden border border-neutral-800">
                        <div className="border-b border-neutral-800 bg-neutral-950 px-4 py-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-400">Recent sales</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-black text-left text-neutral-400">
                                    <tr>
                                        <th className="py-2 px-4 font-medium">Date</th>
                                        <th className="py-2 px-4 font-medium">Product</th>
                                        <th className="py-2 px-4 font-medium">Qty</th>
                                        <th className="py-2 px-4 font-medium text-right">
                                            Your Profit
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salesRows.map((s) => {
                                        const order = firstJoined(s.orders);
                                        const product = firstJoined(s.products);
                                        const artistCut = product?.artist_cut_cents ?? 0;

                                        const createdAt = order?.created_at
                                            ? new Date(order.created_at).toLocaleDateString("en-AU", {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })
                                            : "—";

                                        const lineProfit = ((s.qty ?? 0) * artistCut) / 100;

                                        return (
                                            <tr
                                                key={s.id}
                                                className="border-t border-neutral-800 bg-neutral-950 hover:bg-neutral-900"
                                            >
                                                <td className="py-2 px-4">{createdAt}</td>
                                                <td className="py-2 px-4">
                                                    {s.product_id ? (
                                                        <Link
                                                            href={`/product/${s.product_id}`}
                                                            className="underline"
                                                        >
                                                            {s.title}
                                                        </Link>
                                                    ) : (
                                                        s.title
                                                    )}
                                                </td>
                                                <td className="py-2 px-4">{s.qty}</td>
                                                <td className="py-2 px-4 text-right">
                                                    {formatCurrency(lineProfit)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {/* bottom rail */}
                        <div className="border-t border-neutral-800 bg-black px-4 py-3 flex items-center justify-between">
                            <div className="text-xs text-neutral-400">
                                Range:{" "}
                                {range === "all"
                                    ? "All time"
                                    : range === "30d"
                                        ? "Last 30 days"
                                        : "Last 7 days"}
                            </div>
                            <div className="text-xs text-neutral-400 inline-flex items-center gap-1">
                                <BadgePercent className="h-3.5 w-3.5" /> Artist cut shown
                            </div>
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
            <p className={`mt-5 text-3xl font-black md:text-5xl ${accent ? "text-red-400" : "text-white"}`}>
                {value}
            </p>
        </div>
    );
}
