import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, Eye, Package, Receipt, Repeat2, Route, ShoppingCart, Users } from "lucide-react";
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
    purchase_type: string | null;
    created_at: string;
};

type OrderItemRow = {
    id: string;
    product_id: string | null;
    artist_id: string | null;
    title: string | null;
    qty: number | null;
    unit_price_cents: number | null;
    artist_cut_cents: number | null;
    artists: { display_name: string | null } | { display_name: string | null }[] | null;
};

type PageViewRow = {
    path: string | null;
    session_id: string | null;
    user_id: string | null;
    created_at: string;
};

type MarketingEventRow = {
    event_name: string;
    path: string;
    session_id: string | null;
    attribution: Record<string, unknown> | null;
    properties: Record<string, unknown> | null;
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

    const [ordersRes, itemsRes, viewsRes, eventsRes, productCountRes, artistCountRes] = await Promise.all([
        supabase
            .from("orders")
            .select("id, user_id, email, total_cents, discount_cents, status, purchase_type, created_at")
            .gte("created_at", since.toISOString())
            .eq("purchase_type", "retail")
            .order("created_at", { ascending: false }),
        supabase
            .from("order_items")
            .select("id, product_id, artist_id, title, qty, unit_price_cents, artist_cut_cents, artists ( display_name )")
            .gte("created_at", since.toISOString())
            .eq("purchase_type", "retail"),
        supabase
            .from("page_views")
            .select("path, session_id, user_id, created_at")
            .gte("created_at", since.toISOString())
            .limit(5000),
        supabase
            .from("marketing_events")
            .select("event_name, path, session_id, attribution, properties, created_at")
            .gte("created_at", since.toISOString())
            .order("created_at", { ascending: true })
            .limit(20000),
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
    if (eventsRes.error) {
        logger.warn("Admin customer journey events unavailable", {
            error: eventsRes.error.message,
        });
    }

    const orders = (ordersRes.data ?? []) as OrderRow[];
    const items = (itemsRes.data ?? []) as OrderItemRow[];
    const views = (viewsRes.data ?? []) as PageViewRow[];
    const events = (eventsRes.data ?? []) as MarketingEventRow[];
    const storeViews = views.filter((view) => isStorePath(view.path));
    const revenueCents = orders.reduce((sum, order) => sum + (order.total_cents ?? 0), 0);
    const units = items.reduce((sum, item) => sum + (item.qty ?? 0), 0);
    const uniqueCustomers = new Set(orders.map((order) => order.user_id ?? order.email).filter(Boolean)).size;
    const repeatCustomers = countRepeatCustomers(orders);
    const sessions = new Set(storeViews.map((view) => view.session_id).filter(Boolean)).size;
    const productViews = storeViews.filter((view) => view.path?.startsWith("/product/")).length;
    const conversionRate = sessions ? pct(orders.length, sessions) : "Needs traffic";

    const topProducts = aggregateTopProducts(items).slice(0, 8);
    const topArtists = aggregateTopArtists(items).slice(0, 8);
    const statusCounts = aggregateByStatus(orders);
    const trafficPaths = aggregateTraffic(storeViews).slice(0, 8);
    const funnel = buildFunnel(events, sessions);
    const campaigns = aggregateCampaigns(events).slice(0, 10);
    const creditDiscountCents = orders.reduce((sum, order) => sum + (order.discount_cents ?? 0), 0);

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 p-5 md:p-8">
                <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">
                    <BarChart3 className="h-4 w-4" />
                    Admin analytics
                </p>
                <h1 className="mt-3 text-5xl font-black uppercase leading-[0.88] md:text-7xl">
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
                <Metric label="Store conversion" value={conversionRate} icon={<Eye className="h-4 w-4" />} />
            </section>

            <section className="border-b border-neutral-800 bg-neutral-950 p-5 md:p-8">
                <div className="flex flex-col gap-3 border-b border-neutral-800 pb-5 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-red-400">
                            <Route className="h-4 w-4" /> Customer journey
                        </p>
                        <h2 className="mt-2 text-3xl font-black uppercase">Store funnel.</h2>
                    </div>
                    <p className="max-w-xl text-xs leading-5 text-neutral-500">
                        Consented store activity from the last 30 days. Financial totals above remain complete and come from orders.
                    </p>
                </div>
                {eventsRes.error ? (
                    <p className="py-8 text-sm text-neutral-400">Journey events are unavailable until the analytics migration is applied.</p>
                ) : (
                    <Funnel steps={funnel} />
                )}
            </section>

            <section className="border-b border-neutral-800 bg-[#f3f1e8] p-5 text-black md:p-8">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase text-red-700">Acquisition</p>
                        <h2 className="mt-2 text-3xl font-black uppercase">Campaign performance.</h2>
                    </div>
                    <p className="max-w-lg text-xs leading-5 text-black/55">UTM-tagged visits, ad click IDs and referring sites are attributed through to purchase.</p>
                </div>
                <CampaignTable rows={campaigns} empty={eventsRes.error ? "Campaign events unavailable." : "No attributed journeys in this period."} />
            </section>

            <section className="grid gap-px bg-neutral-800 p-px xl:grid-cols-2">
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

            <section className="border-t border-neutral-800 bg-[#f3f1e8] p-5 text-black md:p-8">
                <div className="grid gap-px bg-neutral-300 md:grid-cols-4">
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

function isStorePath(path: string | null) {
    if (!path) return false;
    return !["/admin", "/dashboard", "/api", "/auth", "/account", "/orders"].some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    );
}

function uniqueEventSessions(events: MarketingEventRow[], eventName: string) {
    return new Set(
        events
            .filter((event) => event.event_name === eventName && event.session_id)
            .map((event) => event.session_id as string),
    ).size;
}

function buildFunnel(events: MarketingEventRow[], storeSessions: number) {
    const definitions = [
        ["Store visits", null],
        ["Products viewed", "view_item"],
        ["Added to cart", "add_to_cart"],
        ["Cart viewed", "view_cart"],
        ["Checkout viewed", "view_checkout"],
        ["Payment handoff", "begin_checkout"],
        ["Purchased", "purchase"],
    ] as const;

    return definitions.map(([label, eventName]) => {
        const count = eventName ? uniqueEventSessions(events, eventName) : storeSessions;
        return { label, count, reach: storeSessions ? Math.round((count / storeSessions) * 100) : 0 };
    });
}

function textProperty(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function referrerSource(value: unknown) {
    const referrer = textProperty(value);
    if (!referrer) return null;
    try {
        return new URL(referrer).hostname.replace(/^www\./, "");
    } catch {
        return null;
    }
}

function aggregateCampaigns(events: MarketingEventRow[]) {
    const rows = new Map<string, {
        source: string;
        campaign: string;
        sessions: Set<string>;
        purchases: Set<string>;
        revenueCents: number;
    }>();

    events.forEach((event) => {
        if (!event.session_id) return;
        const attribution = event.attribution ?? {};
        const source = textProperty(attribution.utm_source)
            ?? referrerSource(attribution.first_referrer)
            ?? "Direct / untagged";
        const campaign = textProperty(attribution.utm_campaign) ?? "No campaign";
        const key = `${source}\u0000${campaign}`;
        const row = rows.get(key) ?? {
            source,
            campaign,
            sessions: new Set<string>(),
            purchases: new Set<string>(),
            revenueCents: 0,
        };
        row.sessions.add(event.session_id);
        if (event.event_name === "purchase") {
            const transactionId = textProperty(event.properties?.transaction_id) ?? event.session_id;
            if (!row.purchases.has(transactionId)) {
                row.purchases.add(transactionId);
                const value = event.properties?.value_cents;
                row.revenueCents += typeof value === "number" && Number.isFinite(value) ? value : 0;
            }
        }
        rows.set(key, row);
    });

    return Array.from(rows.values())
        .sort((a, b) => b.revenueCents - a.revenueCents || b.sessions.size - a.sessions.size)
        .map((row) => ({
            source: row.source,
            campaign: row.campaign,
            sessions: row.sessions.size,
            purchases: row.purchases.size,
            conversion: pct(row.purchases.size, row.sessions.size),
            revenue: formatMoney(row.revenueCents),
        }));
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
        const existing = rows.get(key) ?? { label: artist?.display_name ?? "Unknown artist", detail: "0 units", value: 0 };
        existing.value += qty * (item.artist_cut_cents ?? 0);
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

function Funnel({ steps }: { steps: Array<{ label: string; count: number; reach: number }> }) {
    return (
        <div className="grid gap-px bg-neutral-800 md:grid-cols-4 xl:grid-cols-7">
            {steps.map((step, index) => (
                <div key={step.label} className="min-w-0 bg-black p-4">
                    <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-[10px] text-neutral-600">{String(index + 1).padStart(2, "0")}</span>
                        <span className="text-[10px] font-black uppercase text-lime-300">{step.reach}% reach</span>
                    </div>
                    <p className="mt-5 text-3xl font-black">{step.count}</p>
                    <p className="mt-2 text-[10px] font-black uppercase text-neutral-500">{step.label}</p>
                    <div className="mt-4 h-1 bg-neutral-900">
                        <div className="h-full bg-red-500" style={{ width: `${Math.min(step.reach, 100)}%` }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

function CampaignTable({
    rows,
    empty,
}: {
    rows: Array<{
        source: string;
        campaign: string;
        sessions: number;
        purchases: number;
        conversion: string;
        revenue: string;
    }>;
    empty: string;
}) {
    if (!rows.length) return <p className="mt-6 border border-black/15 bg-white p-5 text-sm text-black/55">{empty}</p>;

    return (
        <div className="mt-6 overflow-x-auto border border-black/20 bg-white">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="bg-black text-white">
                    <tr>
                        {["Source", "Campaign", "Sessions", "Purchases", "Conversion", "Revenue"].map((label) => (
                            <th key={label} className="px-4 py-3 text-[10px] font-black uppercase text-neutral-400">{label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={`${row.source}-${row.campaign}`} className="border-t border-black/10">
                            <td className="px-4 py-3 font-black">{row.source}</td>
                            <td className="px-4 py-3 text-black/60">{row.campaign}</td>
                            <td className="px-4 py-3 font-mono">{row.sessions}</td>
                            <td className="px-4 py-3 font-mono">{row.purchases}</td>
                            <td className="px-4 py-3 font-black text-red-700">{row.conversion}</td>
                            <td className="px-4 py-3 font-black">{row.revenue}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
    return (
        <div className="border-b border-r border-neutral-800 bg-neutral-950 p-5">
            <div className="flex items-center justify-between gap-3 text-red-400">
                <p className="text-[10px] font-black uppercase text-neutral-500">{label}</p>
                {icon}
            </div>
            <p className="mt-4 text-2xl font-black uppercase leading-none text-lime-300 md:text-3xl">{value}</p>
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
