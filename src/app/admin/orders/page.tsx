import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";

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

function getArtists(order: any) {
    const names = new Set<string>();

    order.order_items?.forEach((item: any) => {
        const artist = item.artists?.display_name;

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
        tracking_number,
        carrier,
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
        console.error(error);

        return (
            <div className="rounded-xl border border-red-900 bg-red-950/20 p-6">
                Failed to load orders
            </div>
        );
    }

    return (
        <main className="bg-neutral-950 text-neutral-100 min-h-screen">
            <div className="mx-auto px-6 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black">
                        Orders
                    </h1>

                    <p className="text-neutral-400 mt-1">
                        Manage customer orders and fulfilment.
                    </p>
                </div>

                <div className="border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-900">

                    <table className="w-full text-sm">

                        <thead className="bg-neutral-950 text-neutral-400">
                            <tr>
                                <th className="p-4 text-left">Order</th>
                                <th className="p-4 text-left">Customer</th>
                                <th className="p-4 text-left">Artist</th>
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
                                        {o.tracking_number || "-"}
                                    </td>

                                    <td className="p-4">
                                        {o.carrier || "-"}
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