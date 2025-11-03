// app/dashboard/sales/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import SalesFilter from "@/components/SalesFilter";
import { BadgePercent, DollarSign, Package, ShoppingCart, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const revalidate = 0;

type RangeOption = "all" | "30d" | "7d";

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
    const supabase = getServerSupabase();

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
                                SALES // ACCESS
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
                            to view your sales.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    // Find artist profile
    const { data: artist } = await supabase
        .from("artists")
        .select("id, display_name")
        .eq("user_id", user.id)
        .maybeSingle();

    if (!artist) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                {/* angled banner */}
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                SALES // SETUP
                            </h1>
                            <span className="text-xs bg-red-600 text-white px-2 py-1 rounded rotate-[2deg]">
                                ACTION NEEDED
                            </span>
                        </div>
                    </div>
                </section>

                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        <p className="text-neutral-300">No artist profile found.</p>
                        <div className="mt-4">
                            <Button asChild>
                                <Link href="/auth/sign-up">Create artist profile</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

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
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                SALES // ERROR
                            </h1>
                        </div>
                    </div>
                </section>
                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        <p className="text-red-400 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Error loading sales: {error.message}
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    // Calculate totals (artist profit only)
    const totalSales = sales?.length ?? 0;
    const totalUnits =
        sales?.reduce((sum: number, s: any) => sum + (s.qty ?? 0), 0) ?? 0;

    const totalProfitCents =
        sales?.reduce((sum: number, s: any) => {
            const product = Array.isArray(s.products) ? s.products[0] : s.products;
            const artistCut = product?.artist_cut_cents ?? 0;
            return sum + (s.qty ?? 0) * artistCut;
        }, 0) ?? 0;

    const totalProfit = totalProfitCents / 100;

    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* angled banner */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">
                                Artist Dashboard
                            </p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                {artist.display_name} // SALES
                            </h1>
                        </div>
                        <SalesFilter />
                    </div>
                </div>
            </section>

            {/* summary cards */}
            <section className="max-w-5xl mx-auto px-4 py-8">
                <div className="grid md:grid-cols-3 gap-4">
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

            {/* table / empty state */}
            <section className="max-w-5xl mx-auto px-4 pb-12">
                {!sales?.length ? (
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-neutral-300">
                        No sales yet for this period.
                    </div>
                ) : (
                    <div className="rounded-2xl border border-neutral-800 overflow-hidden">
                        <div className="bg-neutral-900/70 border-b border-neutral-800 px-4 py-3 text-sm text-neutral-300">
                            Recent sales
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-left text-neutral-400 bg-neutral-950/50">
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
                                    {sales.map((s: any) => {
                                        const order = Array.isArray(s.orders)
                                            ? s.orders[0]
                                            : s.orders;
                                        const product = Array.isArray(s.products)
                                            ? s.products[0]
                                            : s.products;
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
                                                className="border-t border-neutral-800 hover:bg-neutral-900/40"
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
                        <div className="bg-neutral-900/70 border-t border-neutral-800 px-4 py-3 flex items-center justify-between">
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
        <Card
            className="bg-neutral-900 border-neutral-800"
            style={{ clipPath: "polygon(6% 0,100% 0,94% 100%,0 100%)" }}
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
