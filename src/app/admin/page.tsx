import Link from "next/link";
import {
    Activity,
    ArrowRight,
    BarChart3,
    Database,
    Package,
    Receipt,
    ShoppingBag,
    Users,
} from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";

function formatMoney(cents: number, currency = "AUD") {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format((cents || 0) / 100);
}

function sydneyDateRangeForToday() {
    const parts = new Intl.DateTimeFormat("en-AU", {
        timeZone: "Australia/Sydney",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());

    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    const date = `${year}-${month}-${day}`;

    return {
        start: `${date}T00:00:00+10:00`,
        end: `${date}T23:59:59+10:00`,
        label: date,
    };
}

type OrderSummary = {
    total_cents: number;
    status: string | null;
};

type RecentOrder = {
    id: string;
    order_number: string | null;
    email: string | null;
    total_cents: number | null;
    status: string | null;
    created_at: string;
    first_name: string | null;
    last_name: string | null;
    tracking_code: string | null;
    tracking_carrier: string | null;
};

const adminLinks = [
    {
        href: "/admin/orders",
        title: "Orders",
        body: "Review customer orders, payment state, shipping details and support issues.",
        icon: ShoppingBag,
        label: "Commerce",
    },
    {
        href: "/admin/supplier-catalog",
        title: "Supplier catalogue",
        body: "Import approved blanks, manage provider options, pricing and fulfilment inputs.",
        icon: Database,
        label: "Supply",
    },
    {
        href: "/admin/operations",
        title: "Operations",
        body: "Repair jobs, retry notifications, review webhook health and handle exceptions.",
        icon: Activity,
        label: "Reliability",
    },
    {
        href: "/admin/artists",
        title: "Artists",
        body: "Manage artist profiles, visibility, featured content and storefront readiness.",
        icon: Users,
        label: "Scene",
    },
];

export default async function AdminDashboard() {
    const supabase = getServerSupabase();

    const { data: totals } = await supabase
        .from("orders")
        .select("total_cents, status")
        .returns<OrderSummary[]>();

    const totalOrders = totals?.length ?? 0;
    const totalRevenue = totals?.reduce((sum, order) => sum + (order.total_cents || 0), 0) ?? 0;

    const today = sydneyDateRangeForToday();

    const { data: todayOrders } = await supabase
        .from("orders")
        .select("total_cents")
        .gte("created_at", today.start)
        .lte("created_at", today.end);

    const todayCount = todayOrders?.length ?? 0;
    const todayRevenue = todayOrders?.reduce((sum, order) => sum + (order.total_cents || 0), 0) ?? 0;

    const statusCounts: Record<string, number> =
        totals?.reduce((acc, order) => {
            const status = order.status ?? "unknown";
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>) ?? {};

    const { data: recentOrders } = await supabase
        .from("orders")
        .select(`
            id,
            order_number,
            email,
            total_cents,
            status,
            created_at,
            first_name,
            last_name,
            tracking_code,
            tracking_carrier
        `)
        .order("created_at", { ascending: false })
        .limit(12)
        .returns<RecentOrder[]>();

    const openOrders = (statusCounts.pending ?? 0) + (statusCounts.paid ?? 0) + (statusCounts.in_production ?? 0);

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 bg-black">
                <div className="grid lg:grid-cols-[1fr_0.72fr]">
                    <div className="border-b border-neutral-800 p-5 md:p-10 lg:border-b-0 lg:border-r">
                        <p className="inline-flex bg-lime-300 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-black">
                            Merch Tent admin
                        </p>
                        <h1 className="mt-5 max-w-5xl text-5xl font-black uppercase leading-[0.86] md:text-7xl">
                            Backstage control for the whole shop.
                        </h1>
                        <p className="mt-5 max-w-3xl text-base font-bold leading-7 text-neutral-300 md:text-lg">
                            Watch orders, catalogue, artists, fulfilment and operational health from one place.
                            This is where the quiet machinery behind the scene stays visible.
                        </p>
                        <div className="mt-7 flex flex-wrap gap-3">
                            <Link
                                href="/admin/orders"
                                className="inline-flex items-center gap-2 bg-lime-300 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-black hover:bg-lime-200"
                            >
                                Review orders
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/admin/operations"
                                className="inline-flex items-center gap-2 border border-neutral-700 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] hover:border-lime-300 hover:text-lime-300"
                            >
                                Operations queue
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-2">
                        <KpiCard title="Total orders" value={String(totalOrders)} note="All time" icon={<Receipt className="h-5 w-5" />} />
                        <KpiCard title="Total revenue" value={formatMoney(totalRevenue)} note="Gross order value" icon={<BarChart3 className="h-5 w-5" />} />
                        <KpiCard title="Orders today" value={String(todayCount)} note={`Sydney date ${today.label}`} icon={<ShoppingBag className="h-5 w-5" />} />
                        <KpiCard title="Revenue today" value={formatMoney(todayRevenue)} note="AEST/AEDT window" icon={<Package className="h-5 w-5" />} />
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-[#f3f1e8] text-black">
                <div className="grid md:grid-cols-2 xl:grid-cols-4">
                    {adminLinks.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="group min-h-[260px] border-b border-r border-neutral-300 p-5 transition hover:bg-white md:p-7"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <span className="bg-lime-300 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-black">
                                        {item.label}
                                    </span>
                                    <Icon className="h-6 w-6 text-red-600" />
                                </div>
                                <h2 className="mt-14 text-3xl font-black uppercase leading-none">{item.title}</h2>
                                <p className="mt-4 text-sm leading-6 text-neutral-700">{item.body}</p>
                                <span className="mt-8 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-red-600">
                                    Open
                                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-black">
                <div className="grid lg:grid-cols-[0.42fr_0.58fr]">
                    <aside className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">
                            Order status
                        </p>
                        <h2 className="mt-2 text-4xl font-black uppercase leading-[0.9] md:text-5xl">
                            What needs attention?
                        </h2>
                        <p className="mt-4 text-sm leading-6 text-neutral-400">
                            Use this as the quick pulse check. Open orders include pending, paid and in-production jobs.
                        </p>
                        <div className="mt-6 border border-neutral-800 bg-neutral-950 p-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Open order count</p>
                            <p className="mt-3 text-5xl font-black text-lime-300">{openOrders}</p>
                        </div>
                    </aside>

                    <div className="grid md:grid-cols-2">
                        {Object.entries(statusCounts).length ? (
                            Object.entries(statusCounts).map(([status, count]) => (
                                <div key={status} className="border-b border-r border-neutral-800 bg-neutral-950 p-5">
                                    <StatusBadge status={status} />
                                    <p className="mt-6 text-4xl font-black">{count}</p>
                                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-neutral-500">orders</p>
                                </div>
                            ))
                        ) : (
                            <div className="border-b border-r border-neutral-800 bg-neutral-950 p-5 text-sm text-neutral-400">
                                No order status data yet.
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="bg-[#f3f1e8] p-5 text-black md:p-8">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-600">Recent orders</p>
                        <h2 className="mt-2 text-4xl font-black uppercase leading-none md:text-5xl">Latest checkout activity.</h2>
                    </div>
                    <Link href="/admin/orders" className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.08em] text-red-600 hover:text-black">
                        View all orders
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                <div className="overflow-x-auto border border-neutral-300 bg-white shadow-[10px_10px_0_#d9d6ca]">
                    <table className="w-full min-w-[980px] text-sm">
                        <thead className="border-b border-neutral-300 bg-black text-white">
                            <tr>
                                <th className="p-4 text-left text-[10px] font-black uppercase tracking-[0.2em]">Order</th>
                                <th className="p-4 text-left text-[10px] font-black uppercase tracking-[0.2em]">Customer</th>
                                <th className="p-4 text-left text-[10px] font-black uppercase tracking-[0.2em]">Total</th>
                                <th className="p-4 text-left text-[10px] font-black uppercase tracking-[0.2em]">Status</th>
                                <th className="p-4 text-left text-[10px] font-black uppercase tracking-[0.2em]">Date</th>
                                <th className="p-4 text-left text-[10px] font-black uppercase tracking-[0.2em]">Tracking</th>
                                <th className="p-4 text-left text-[10px] font-black uppercase tracking-[0.2em]">Carrier</th>
                            </tr>
                        </thead>

                        <tbody>
                            {recentOrders?.length ? (
                                recentOrders.map((order) => (
                                    <tr key={order.id} className="border-b border-neutral-200 transition last:border-b-0 hover:bg-lime-50">
                                        <td className="p-4">
                                            <Link href={`/admin/orders/${order.id}`} className="font-black text-red-600 hover:text-black">
                                                {order.order_number || order.id.slice(0, 8)}
                                            </Link>
                                            <p className="mt-1 font-mono text-[10px] text-neutral-500">{order.id.slice(0, 12)}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-black">
                                                {[order.first_name, order.last_name].filter(Boolean).join(" ") || "Customer"}
                                            </p>
                                            <p className="mt-1 text-xs text-neutral-500">{order.email || "No email"}</p>
                                        </td>
                                        <td className="p-4 font-black">{formatMoney(order.total_cents ?? 0)}</td>
                                        <td className="p-4"><StatusBadge status={order.status ?? "unknown"} /></td>
                                        <td className="p-4 text-neutral-600">
                                            {new Date(order.created_at).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}
                                        </td>
                                        <td className="p-4 font-mono text-xs">{order.tracking_code || "-"}</td>
                                        <td className="p-4">{order.tracking_carrier || "-"}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="p-5 text-neutral-600">
                                        No recent orders yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}

function KpiCard({
    title,
    value,
    note,
    icon,
}: {
    title: string;
    value: string;
    note: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="border-b border-r border-neutral-800 bg-[#f3f1e8] p-5 text-black md:p-6">
            <div className="flex items-start justify-between gap-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">{title}</p>
                <span className="text-red-600">{icon}</span>
            </div>
            <p className="mt-8 text-3xl font-black md:text-4xl">{value}</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">{note}</p>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        pending: "bg-yellow-300 text-black",
        paid: "bg-lime-300 text-black",
        in_production: "bg-red-600 text-white",
        shipped: "bg-black text-white",
        fulfilled: "bg-black text-white",
        cancelled: "bg-neutral-300 text-black",
        refunded: "bg-neutral-300 text-black",
        default: "bg-neutral-800 text-white",
    };

    const style = map[status] || map.default;

    return (
        <span className={`inline-flex px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${style}`}>
            {status.replaceAll("_", " ")}
        </span>
    );
}
