import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, Download, PackageCheck, Truck } from "lucide-react";
import { logger } from "@/lib/logger";

function formatMoney(cents: number) {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format((cents ?? 0) / 100);
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
            className={`border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${map[status] || map.default
                }`}
        >
            {status?.replaceAll("_", " ")}
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
            <div className="m-6 border border-red-900 bg-red-950/20 p-6 text-red-200">
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
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 bg-black p-5 md:p-8">
                <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">Commerce desk</p>
                        <h1 className="mt-2 text-5xl font-black uppercase leading-[0.88] md:text-7xl">
                            Orders
                        </h1>

                        <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                            Admin-only customer orders, fulfilment state, tracking, exports and support triage.
                        </p>
                    </div>

                    <Link
                        href="/api/admin/orders/export"
                        className="inline-flex items-center justify-center gap-2 border border-neutral-700 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-neutral-100 transition hover:border-lime-300 hover:text-lime-300"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Link>
                </div>
            </section>

            <section className="grid border-b border-neutral-800 md:grid-cols-4">
                    <OpsCard title="Total orders" value={String(totalOrders)} icon={<PackageCheck className="h-4 w-4" />} />
                    <OpsCard title="Needs tracking" value={String(ordersWithoutTracking)} icon={<AlertTriangle className="h-4 w-4" />} warn={ordersWithoutTracking > 0} />
                    <OpsCard title="Shipped" value={String(shippedOrders)} icon={<Truck className="h-4 w-4" />} />
                    <OpsCard title="Status groups" value={String(Object.keys(statusCounts).length)} icon={<PackageCheck className="h-4 w-4" />} />
            </section>

            <section className="border-b border-neutral-800 bg-neutral-950 p-5 md:p-6">
                <div className="flex flex-wrap gap-2">
                    {Object.entries(statusCounts).map(([status, count]) => (
                        <span key={status} className="border border-neutral-800 bg-black px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-neutral-300">
                            {status}: {count}
                        </span>
                    ))}
                </div>
            </section>

            <section className="p-5 md:p-8">
                <div className="overflow-x-auto border border-neutral-800 bg-neutral-950">

                    <table className="w-full text-sm">

                        <thead className="bg-black text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
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
                                    className="border-t border-neutral-800 transition hover:bg-neutral-900"
                                >
                                    <td className="p-4">
                                        <div>
                                            <Link
                                                href={`/admin/orders/${o.id}`}
                                                className="
        inline-flex
        items-center
        gap-2
        font-black
        text-lime-300
        hover:text-white
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
                            bg-red-600
                            text-white
                            border
                            border-red-600
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

            </section>
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
        <div className={`border-b border-r p-5 ${warn ? "border-yellow-500/40 bg-yellow-500/10" : "border-neutral-800 bg-neutral-950"}`}>
            <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">{title}</p>
                <div className={warn ? "text-yellow-300" : "text-red-400"}>{icon}</div>
            </div>
            <p className="mt-4 text-4xl font-black uppercase leading-none">{value}</p>
        </div>
    );
}
