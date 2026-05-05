import { getServerSupabase } from "@/lib/supabase/server";

function formatMoney(cents: number, currency = "AUD") {
    return `${currency} ${(cents / 100).toFixed(2)}`;
}

type OrderSummary = {
    total_cents: number;
    status: string;
};

export default async function AdminDashboard() {
    const supabase = getServerSupabase();

    // 🔢 Total orders + revenue
    const { data: totals } = await supabase
        .from("orders")
        .select("total_cents, status")
        .returns<OrderSummary[]>();

    const totalOrders = (totals?.length ?? 0) as number;
    const totalRevenue =
        totals?.reduce((sum, o) => sum + (o.total_cents || 0), 0) ?? 0;

    // 📅 Today stats
    const today = new Date().toISOString().split("T")[0];

    const { data: todayOrders } = await supabase
        .from("orders")
        .select("total_cents")
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

    const todayCount = todayOrders?.length ?? 0;
    const todayRevenue =
        todayOrders?.reduce((sum, o) => sum + (o.total_cents || 0), 0) ?? 0;

    // 📊 Status breakdown
    const statusCounts: Record<string, number> =
        totals?.reduce((acc, o) => {
            acc[o.status] = (acc[o.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>) ?? {};

    // 📦 Recent orders
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
            tracking_number,
            carrier
        `)
        .order("created_at", { ascending: false })
        .limit(50);

    return (
        <main className="bg-neutral-950 text-neutral-100 min-h-screen">

            <div className="max-w-6xl mx-auto px-6 py-8">

                {/* HEADER */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-black">Admin Dashboard</h1>
                        <p className="text-sm text-neutral-400">
                            Overview of orders & performance
                        </p>
                    </div>

                    <div className="text-xs bg-red-600 px-3 py-1 rounded">
                        ADMIN
                    </div>
                </div>

                {/* KPI CARDS */}
                <div className="grid md:grid-cols-4 gap-4">

                    <Card title="Total Orders" value={totalOrders} />
                    <Card title="Total Revenue" value={formatMoney(totalRevenue)} />
                    <Card title="Orders Today" value={todayCount} />
                    <Card title="Revenue Today" value={formatMoney(todayRevenue)} />

                </div>

                {/* STATUS */}
                <div className="mt-10">
                    <h3 className="text-lg font-bold mb-3">Order Status</h3>

                    <div className="flex gap-4 flex-wrap">
                        {Object.entries(statusCounts).map(([status, count]) => (
                            <div
                                key={status}
                                className="border border-neutral-800 rounded-xl px-4 py-3 bg-neutral-900"
                            >
                                <div className="text-xs text-neutral-400 uppercase">
                                    {status}
                                </div>
                                <div className="text-xl font-bold">
                                    {count}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RECENT ORDERS */}
                <div className="mt-10">
                    <h3 className="text-lg font-bold mb-3">Recent Orders</h3>

                    <div className="border border-neutral-800 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">

                            <thead className="bg-neutral-900 text-neutral-400">
                                <tr>
                                    <th className="p-3 text-left">Order</th>
                                    <th className="p-3 text-left">Customer</th>
                                    <th className="p-3 text-left">Total</th>
                                    <th className="p-3 text-left">Status</th>
                                    <th className="p-3 text-left">Date</th>
                                    <th className="p-3 text-left">Tracking</th>
                                    <th className="p-3 text-left">Carrier</th>
                                </tr>
                            </thead>

                            <tbody>
                                {recentOrders?.map((o) => (
                                    <tr
                                        key={o.id}
                                        className="border-t border-neutral-800 hover:bg-neutral-900/60 transition"
                                    >
                                        <td className="p-3 font-mono text-xs">
                                            {o.id}
                                        </td>

                                        <td className="p-3 text-neutral-300">
                                            {o.first_name} {o.last_name}
                                        </td>

                                        <td className="p-3">
                                            {formatMoney(o.total_cents)}
                                        </td>

                                        <td className="p-3">
                                            <StatusBadge status={o.status} />
                                        </td>

                                        <td className="p-3 text-neutral-400">
                                            {new Date(o.created_at).toLocaleString()}
                                        </td>
                                        <td className="p-3">
                                            {o.tracking_number}
                                        </td>
                                        <td className="p-3">
                                            {o.carrier}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>

                        </table>
                    </div>
                </div>

            </div>
        </main>
    );
}

// Simple card component
function Card({
    title,
    value,
}: {
    title: string;
    value: React.ReactNode;
}) {
    return (
        <div className="border border-neutral-800 rounded-2xl p-4 bg-neutral-900">
            <div className="text-xs text-neutral-400 uppercase mb-1">
                {title}
            </div>
            <div className="text-2xl font-black">
                {value}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        pending: "bg-yellow-500/20 text-yellow-400",
        paid: "bg-blue-500/20 text-blue-400",
        in_production: "bg-purple-500/20 text-purple-400",
        shipped: "bg-green-500/20 text-green-400",
        default: "bg-neutral-700 text-neutral-300",
    };

    const style = map[status] || map.default;

    return (
        <span className={`text-xs px-2 py-1 rounded ${style}`}>
            {status}
        </span>
    );
}