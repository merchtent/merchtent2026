import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, Eye, Package, Receipt, Repeat2, ShoppingCart, Users } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";

export const revalidate = 0;

type OrderRow = {
    id: string;
    user_id: string | null;
    email: string | null;
    total_cents: number | null;
    discount_cents?: number | null;
    status: string | null;
    created_at: string;
};

type OrderItemRow = {
    id: string;
    product_id: string | null;
    artist_id: string | null;
    title: string | null;
    qty: number | null;
    unit_price_cents: number | null;
    products: { artist_cut_cents: number | null } | { artist_cut_cents: number | null }[] | null;
    artists: { display_name: string | null } | { display_name: string | null }[] | null;
};

type PageViewRow = {
    path: string | null;
    session_id: string | null;
    user_id: string | null;
    created_at: string;
};

function firstJoined<T>(value: T | T[] | null | undefined): T | null {
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function formatMoney(cents: number, currency = "AUD") {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(cents / 100);
}

function pct(part: number, total: number) {
    if (!total) return "0%";
    return `${Math.round((part / total) * 100)}%`;
}

export default async function AdminAnalyticsPage() {
    const { supabase } = await requireAdminPage();
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [ordersRes, itemsRes, viewsRes, productCountRes, artistCountRes] = await Promise.all([
        supabase
            .from("orders")
            .select("id, user_id, email, total_cents, discount_cents, status, created_at")
            .gte("created_at", since.toISOString())
            .order("created_at", { ascending: false }),
        supabase
            .from("order_items")
            .select("id, product_id, artist_id, title, qty, unit_price_cents, products ( artist_cut_cents ), artists ( display_name )")
            .gte("created_at", since.toISOString()),
        supabase
            .from("page_views")
            .select("path, session_id, user_id, created_at")
            .gte("created_at", since.toISOString())
            .limit(5000),
        supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("is_published", true),
        supabase
            .from("artists")
            .select("id", { count: "exact", head: true }),
    ]);

    if (ordersRes.error || itemsRes.error) {
        logger.error("Admin analytics failed to load commerce data", {
            orders_error: ordersRes.error?.message,
            items_error: itemsRes.error?.message,
        });
    }

    if (viewsRes.error) {
        logger.warn("Admin analytics page views unavailable", {
            error: viewsRes.error.message,
        });
    }

    const orders = (ordersRes.data ?? []) as OrderRow[];
    const items = (itemsRes.data ?? []) as OrderItemRow[];
    const views = (viewsRes.data ?? []) as PageViewRow[];
    const revenueCents = orders.reduce((sum, order) => sum + (order.total_cents ?? 0), 0);
    const units = items.reduce((sum, item) => sum + (item.qty ?? 0), 0);
    const uniqueCustomers = new Set(orders.map((order) => order.user_id ?? order.email).filter(Boolean)).size;
    const repeatCustomers = countRepeatCustomers(orders);
    const sessions = new Set(views.map((view) => view.session_id).filter(Boolean)).size;
    const productViews = views.filter((view) => view.path?.startsWith("/product/")).length;
    const conversionRate = sessions ? pct(orders.length, sessions) : "Needs traffic";

    const topProducts = aggregateTopProducts(items).slice(0, 8);
    const topArtists = aggregateTopArtists(items).slice(0, 8);
    const statusCounts = aggregateByStatus(orders);
    const trafficPaths = aggregateTraffic(views).slice(0, 8);
    const creditDiscountCents = orders.reduce((sum, order) => sum + (order.discount_cents ?? 0), 0);

    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            <section className="border-b border-neutral-800 p-6 md:p-8">
                <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase text-red-400">
                    <BarChart3 className="h-4 w-4" />
                    Admin analytics
                </p>
                <h1 className="mt-3 text-4xl font-black uppercase leading-none md:text-6xl">
                    Store performance.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                    Customer, order, traffic, product, and credit signals for the last 30 days. Artists only see product,
                    quantity, and profit summaries in their sales pages.
                </p>
            </section>

            <section className="grid border-b border-neutral-800 md:grid-cols-3 xl:grid-cols-6">
                <Metric label="Revenue" value={formatMoney(revenueCents)} icon={<Receipt className="h-4 w-4" />} />
                <Metric label="Orders" value={String(orders.length)} icon={<ShoppingCart className="h-4 w-4" />} />
                <Metric label="Units" value={String(units)} icon={<Package className="h-4 w-4" />} />
                <Metric label="Customers" value={String(uniqueCustomers)} icon={<Users className="h-4 w-4" />} />
                <Metric label="Repeat buyers" value={String(repeatCustomers)} icon={<Repeat2 className="h-4 w-4" />} />
                <Metric label="Conversion" value={conversionRate} icon={<Eye className="h-4 w-4" />} />
            </section>

            <section className="grid gap-6 p-6 md:p-8 xl:grid-cols-2">
                <AnalyticsPanel title="Top products" ctaHref="/admin/products">
                    <RankedList rows={topProducts} empty="No product sales in the last 30 days." />
                </AnalyticsPanel>
                <AnalyticsPanel title="Top artists" ctaHref="/admin/artists">
                    <RankedList rows={topArtists} empty="No artist sales in the last 30 days." />
                </AnalyticsPanel>
                <AnalyticsPanel title="Order status mix" ctaHref="/admin/orders">
                    <RankedList rows={statusCounts} empty="No orders in the last 30 days." />
                </AnalyticsPanel>
                <AnalyticsPanel title="Traffic paths" ctaHref="/admin/operations">
                    <RankedList rows={trafficPaths} empty={viewsRes.error ? "Page view data unavailable." : "No page views in the last 30 days."} />
                </AnalyticsPanel>
            </section>

            <section className="border-t border-neutral-800 p-6 md:p-8">
                <div className="grid gap-4 md:grid-cols-4">
                    <MiniSignal label="Live products" value={String(productCountRes.count ?? 0)} />
                    <MiniSignal label="Artists" value={String(artistCountRes.count ?? 0)} />
                    <MiniSignal label="Product views" value={String(productViews)} />
                    <MiniSignal label="Credit discounts" value={formatMoney(creditDiscountCents)} />
                </div>
            </section>
        </main>
    );
}

function countRepeatCustomers(orders: OrderRow[]) {
    const counts = new Map<string, number>();
    orders.forEach((order) => {
        const key = order.user_id ?? order.email;
        if (!key) return;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.values()).filter((count) => count > 1).length;
}

function aggregateTopProducts(items: OrderItemRow[]) {
    const rows = new Map<string, { label: string; detail: string; value: number }>();
    items.forEach((item) => {
        const key = item.product_id ?? item.title ?? item.id;
        const qty = item.qty ?? 0;
        const existing = rows.get(key) ?? { label: item.title ?? "Untitled product", detail: "0 units", value: 0 };
        existing.value += qty * (item.unit_price_cents ?? 0);
        existing.detail = `${Number(existing.detail.split(" ")[0] || 0) + qty} units`;
        rows.set(key, existing);
    });
    return Array.from(rows.values())
        .sort((a, b) => b.value - a.value)
        .map((row) => ({ ...row, valueLabel: formatMoney(row.value) }));
}

function aggregateTopArtists(items: OrderItemRow[]) {
    const rows = new Map<string, { label: string; detail: string; value: number }>();
    items.forEach((item) => {
        const artist = firstJoined(item.artists);
        const key = item.artist_id ?? artist?.display_name ?? item.id;
        const qty = item.qty ?? 0;
        const product = firstJoined(item.products);
        const existing = rows.get(key) ?? { label: artist?.display_name ?? "Unknown artist", detail: "0 units", value: 0 };
        existing.value += qty * (product?.artist_cut_cents ?? 0);
        existing.detail = `${Number(existing.detail.split(" ")[0] || 0) + qty} units`;
        rows.set(key, existing);
    });
    return Array.from(rows.values())
        .sort((a, b) => b.value - a.value)
        .map((row) => ({ ...row, valueLabel: formatMoney(row.value) }));
}

function aggregateByStatus(orders: OrderRow[]) {
    const rows = new Map<string, { label: string; detail: string; value: number }>();
    orders.forEach((order) => {
        const label = order.status ?? "unknown";
        const existing = rows.get(label) ?? { label, detail: "orders", value: 0 };
        existing.value += 1;
        rows.set(label, existing);
    });
    return Array.from(rows.values())
        .sort((a, b) => b.value - a.value)
        .map((row) => ({ ...row, valueLabel: String(row.value) }));
}

function aggregateTraffic(views: PageViewRow[]) {
    const rows = new Map<string, { label: string; detail: string; value: number }>();
    views.forEach((view) => {
        const label = view.path ?? "unknown";
        const existing = rows.get(label) ?? { label, detail: "views", value: 0 };
        existing.value += 1;
        rows.set(label, existing);
    });
    return Array.from(rows.values())
        .sort((a, b) => b.value - a.value)
        .map((row) => ({ ...row, valueLabel: String(row.value) }));
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
    return (
        <div className="border-b border-r border-neutral-800 bg-neutral-900 p-5">
            <div className="flex items-center justify-between gap-3 text-red-400">
                <p className="text-[10px] font-black uppercase text-neutral-500">{label}</p>
                {icon}
            </div>
            <p className="mt-4 text-2xl font-black uppercase leading-none md:text-3xl">{value}</p>
        </div>
    );
}

function AnalyticsPanel({
    title,
    ctaHref,
    children,
}: {
    title: string;
    ctaHref: string;
    children: ReactNode;
}) {
    return (
        <div className="border border-neutral-800 bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-800 p-4">
                <h2 className="text-xl font-black uppercase">{title}</h2>
                <Link href={ctaHref} className="text-xs font-black uppercase text-red-400 hover:text-red-300">
                    Open
                </Link>
            </div>
            {children}
        </div>
    );
}

function RankedList({
    rows,
    empty,
}: {
    rows: Array<{ label: string; detail: string; valueLabel: string }>;
    empty: string;
}) {
    if (!rows.length) return <p className="p-4 text-sm text-neutral-400">{empty}</p>;

    return (
        <div>
            {rows.map((row, index) => (
                <div key={`${row.label}-${index}`} className="grid grid-cols-[auto_1fr_auto] gap-4 border-b border-neutral-800 p-4 last:border-b-0">
                    <p className="font-mono text-xs text-neutral-500">{String(index + 1).padStart(2, "0")}</p>
                    <div className="min-w-0">
                        <p className="truncate font-black">{row.label}</p>
                        <p className="mt-1 text-xs uppercase text-neutral-500">{row.detail}</p>
                    </div>
                    <p className="font-black text-red-400">{row.valueLabel}</p>
                </div>
            ))}
        </div>
    );
}

function MiniSignal({ label, value }: { label: string; value: string }) {
    return (
        <div className="border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-[10px] font-black uppercase text-neutral-500">{label}</p>
            <p className="mt-2 text-2xl font-black">{value}</p>
        </div>
    );
}
