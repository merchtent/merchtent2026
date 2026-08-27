import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, Download, PackageCheck, Truck } from "lucide-react";
import { logger } from "@/lib/logger";

function formatMoney(cents: number) {
    return `AUD ${(cents / 100).toFixed(2)}`;
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        pending: "bg-yellow-500/20 text-yellow-400",
        paid: "bg-blue-500/20 text-blue-400",
        in_production: "bg-purple-500/20 text-purple-400",
        shipped: "bg-green-500/20 text-green-400",
        default: "bg-neutral-700 text-neutral-300",
    };

    return (
        <span
            className={`px-2 py-1 rounded text-xs font-semibold ${map[status] || map.default
                }`}
        >
            {status}
        </span>
    );
}

type OrderArtist = {
    display_name?: string | null;
};

type OrderItem = {
    artists?: OrderArtist | OrderArtist[] | null;
};

type AdminOrder = {
    status?: string | null;
    tracking_code?: string | null;
    order_items?: OrderItem[] | null;
};

function getArtists(order: AdminOrder) {
    const names = new Set<string>();

    order.order_items?.forEach((item) => {
        const joinedArtist = Array.isArray(item.artists)
            ? item.artists[0]
            : item.artists;
        const artist = joinedArtist?.display_name;

        if (artist) {
            names.add(artist);
        }
    });

    return Array.from(names);
}

export default async function OrdersPage() {
    const supabase = getServerSupabase();

    const { data: orders, error } = await supabase
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
        tracking_carrier,
        order_items (
            id,
            artist_id,
            artists (
                id,
                display_name
            )
        )
    `)
        .order("created_at", { ascending: false });

    if (error) {
        logger.error("Admin orders page failed to load orders", {
            error: error.message,
        });

        return (
            <div className="rounded-xl border border-red-900 bg-red-950/20 p-6">
                Failed to load orders
            </div>
        );
    }

    const orderRows = orders ?? [];
    const totalOrders = orderRows.length;
    const ordersWithoutTracking = orderRows.filter((order) =>
        ["paid", "in_production"].includes(order.status ?? "") && !order.tracking_code
    ).length;
    const shippedOrders = orderRows.filter((order) => order.status === "shipped").length;
    const statusCounts = orderRows.reduce((acc, order) => {
        const status = order.status ?? "unknown";
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <main className="bg-neutral-950 text-neutral-100 min-h-screen">
            <div className="mx-auto px-6 py-8">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-black">
                            Orders
                        </h1>

                        <p className="text-neutral-400 mt-1">
                            Admin-only customer orders, fulfilment state, tracking, exports and support triage.
                        </p>
                    </div>

                    <Link
                        href="/api/admin/orders/export"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-700 px-4 py-3 text-sm font-semibold text-neutral-100 transition hover:border-red-500 hover:text-red-200"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Link>
                </div>

                <div className="mb-6 grid gap-4 md:grid-cols-4">
                    <OpsCard title="Total orders" value={String(totalOrders)} icon={<PackageCheck className="h-4 w-4" />} />
                    <OpsCard title="Needs tracking" value={String(ordersWithoutTracking)} icon={<AlertTriangle className="h-4 w-4" />} warn={ordersWithoutTracking > 0} />
                    <OpsCard title="Shipped" value={String(shippedOrders)} icon={<Truck className="h-4 w-4" />} />
                    <OpsCard title="Status groups" value={String(Object.keys(statusCounts).length)} icon={<PackageCheck className="h-4 w-4" />} />
                </div>

                <div className="mb-6 flex flex-wrap gap-2">
                    {Object.entries(statusCounts).map(([status, count]) => (
                        <span key={status} className="border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-black uppercase text-neutral-300">
                            {status}: {count}
                        </span>
                    ))}
                </div>

                <div className="border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-900">

                    <table className="w-full text-sm">

                        <thead className="bg-neutral-950 text-neutral-400">
                            <tr>
                                <th className="p-4 text-left">Order</th>
                                <th className="p-4 text-left">Customer</th>
                                <th className="p-4 text-left">Artist</th>
                                <th className="p-4 text-left">Items</th>
                                <th className="p-4 text-left">Total</th>
                                <th className="p-4 text-left">Status</th>
                                <th className="p-4 text-left">Date</th>
                                <th className="p-4 text-left">Tracking</th>
                                <th className="p-4 text-left">Carrier</th>
                            </tr>
                        </thead>

                        <tbody>

                            {orders?.map((o) => (
                                <tr
                                    key={o.id}
                                    className="border-t border-neutral-800 hover:bg-neutral-800/40 transition"
                                >
                                    <td className="p-4">
                                        <div>
                                            <Link
                                                href={`/admin/orders/${o.id}`}
                                                className="
        inline-flex
        items-center
        gap-2
        font-bold
        text-red-400
        hover:text-red-300
        transition
    "
                                            >
                                                {o.order_number || o.id}

                                                <span className="text-neutral-500">
                                                    →
                                                </span>
                                            </Link>

                                            <div className="text-xs text-neutral-500 font-mono">
                                                {o.id}
                                            </div>
                                        </div>
                                    </td>

                                    <td className="p-4">
                                        <div>
                                            <div>
                                                {o.first_name} {o.last_name}
                                            </div>

                                            <div className="text-xs text-neutral-500">
                                                {o.email}
                                            </div>
                                        </div>
                                    </td>

                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {getArtists(o).map((artist) => (
                                                <span
                                                    key={artist}
                                                    className="
                            text-xs
                            px-2
                            py-1
                            rounded
                            bg-red-600/20
                            text-red-400
                            border
                            border-red-600/30
                        "
                                                >
                                                    {artist}
                                                </span>
                                            ))}
                                        </div>
                                    </td>

                                    <td className="p-4 text-neutral-300">
                                        {o.order_items?.length ?? 0}
                                    </td>

                                    <td className="p-4 font-semibold">
                                        {formatMoney(o.total_cents)}
                                    </td>

                                    <td className="p-4">
                                        <StatusBadge status={o.status} />
                                    </td>

                                    <td className="p-4 text-neutral-400">
                                        {new Date(
                                            o.created_at
                                        ).toLocaleString()}
                                    </td>

                                    <td className="p-4">
                                        {o.tracking_code || "-"}
                                    </td>

                                    <td className="p-4">
                                        {o.tracking_carrier || "-"}
                                    </td>
                                </tr>

                            ))}

                        </tbody>

                    </table>

                </div>

            </div>
        </main>

    );
}

function OpsCard({
    title,
    value,
    icon,
    warn,
}: {
    title: string;
    value: string;
    icon: ReactNode;
    warn?: boolean;
}) {
    return (
        <div className={`border p-4 ${warn ? "border-yellow-500/40 bg-yellow-500/10" : "border-neutral-800 bg-neutral-900"}`}>
            <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase text-neutral-500">{title}</p>
                <div className={warn ? "text-yellow-300" : "text-red-400"}>{icon}</div>
            </div>
            <p className="mt-3 text-3xl font-black">{value}</p>
        </div>
    );
}
