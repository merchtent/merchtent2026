import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import OrderStatusUpdater from "@/components/admin/OrderStatusUpdater";


import { getServerSupabase } from "@/lib/supabase/server";
import { normaliseExternalUrl } from "@/lib/urls";

function money(cents?: number | null) {
    return `AUD ${((cents ?? 0) / 100).toFixed(2)}`;
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        pending: "bg-yellow-500/20 text-yellow-400",
        paid: "bg-blue-500/20 text-blue-400",
        in_production: "bg-purple-500/20 text-purple-400",
        shipped: "bg-green-500/20 text-green-400",
        delivered: "bg-green-500/20 text-green-400",
        default: "bg-neutral-700 text-neutral-300",
    };

    return (
        <span
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${map[status] || map.default
                }`}
        >
            {status}
        </span>
    );
}

type OrderItem = {
    id: string;
    title?: string | null;
    color_label?: string | null;
    size?: string | null;
    unit_price_cents?: number | null;
    qty?: number | null;
    artists?: { display_name?: string | null } | { display_name?: string | null }[] | null;
};

type OrderStatusEvent = {
    id: string;
    from_status: string | null;
    to_status: string;
    reason: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
};

function firstJoined<T>(value: T | T[] | null | undefined): T | null {
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function OrderViewPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const supabase = getServerSupabase();

    const { data: order, error } = await supabase
        .from("orders")
        .select(`
            *,
            order_items (
                *,
                artists (
                    id,
                    display_name,
                    slug
                )
            )
        `)
        .eq("id", id)
        .single();

    if (error || !order) {
        notFound();
    }

    const { data: statusEvents } = await supabase
        .from("order_status_events")
        .select("id, from_status, to_status, reason, metadata, created_at")
        .eq("order_id", id)
        .order("created_at", { ascending: false });

    const timeline = (statusEvents ?? []) as OrderStatusEvent[];
    const trackingUrl = normaliseExternalUrl(order.tracking_url);

    const itemsSubtotal =
        order.order_items
            ?.filter(
                (item: OrderItem) =>
                    !item.title?.toLowerCase().includes("shipping")
            )
            .reduce(
                (sum: number, item: OrderItem) =>
                    sum +
                    ((item.unit_price_cents ?? 0) *
                        (item.qty ?? 0)),
                0
            )

    const shippingLine =
        order.order_items?.find(
            (item: OrderItem) =>
                item.title?.toLowerCase().includes("shipping")
        );

    const calculatedShipping =
        shippingLine?.unit_price_cents ?? 0;

    const calculatedTotal =
        itemsSubtotal +
        calculatedShipping -
        (order.discount_cents ?? 0);

    return (
        <main className="bg-neutral-950 text-neutral-100 min-h-screen">

            <div className="max-w-7xl mx-auto px-6 py-8">

                {/* Header */}

                <div className="flex items-center justify-between mb-8">

                    <div>
                        <Link
                            href="/admin/orders"
                            className="inline-flex items-center gap-2 text-neutral-400 hover:text-white mb-4"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Orders
                        </Link>

                        <h1 className="text-4xl font-black">
                            {order.order_number || order.id}
                        </h1>

                        <div className="mt-3">
                            <StatusBadge status={order.status} />
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-neutral-500 text-sm">
                            Order Date
                        </div>

                        <div className="font-semibold">
                            {new Date(
                                order.created_at
                            ).toLocaleString()}
                        </div>
                    </div>

                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 mb-6">

                    <h2 className="font-black text-lg mb-4">
                        Order Actions
                    </h2>

                    <OrderStatusUpdater
                        orderId={order.id}
                        currentStatus={order.status}
                        currentTrackingNumber={order.tracking_code}
                        currentCarrier={order.tracking_carrier}
                    />

                </div>

                {/* Top Row */}

                <div className="grid lg:grid-cols-2 gap-6 mb-6">

                    {/* Customer */}

                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

                        <h2 className="font-black text-lg mb-4">
                            Customer
                        </h2>

                        <div className="space-y-2">

                            <div>
                                <div className="text-neutral-500 text-sm">
                                    Name
                                </div>

                                <div>
                                    {order.first_name} {order.last_name}
                                </div>
                            </div>

                            <div>
                                <div className="text-neutral-500 text-sm">
                                    Email
                                </div>

                                <div>{order.email || "-"}</div>
                            </div>

                            <div>
                                <div className="text-neutral-500 text-sm">
                                    Phone
                                </div>

                                <div>{order.phone || "-"}</div>
                            </div>

                        </div>

                    </div>

                    {/* Shipping */}

                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

                        <h2 className="font-black text-lg mb-4">
                            Shipping Address
                        </h2>

                        <div className="space-y-1 text-neutral-300">

                            <div>{order.line1}</div>

                            {order.line2 && (
                                <div>{order.line2}</div>
                            )}

                            <div>
                                {order.city} {order.state}
                            </div>

                            <div>{order.postal_code}</div>

                            <div>{order.country}</div>

                        </div>

                    </div>

                </div>

                {/* Items */}

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 mb-6">

                    <h2 className="font-black text-lg mb-6">
                        Order Items
                    </h2>

                    <div className="space-y-4">

                        {order.order_items?.map((item: OrderItem) => {
                            const artist = firstJoined(item.artists);

                            return (
                            <div
                                key={item.id}
                                className="border border-neutral-800 rounded-xl p-4"
                            >
                                <div className="flex justify-between items-start gap-4">

                                    <div>

                                        <h3 className="font-semibold">
                                            {item.title}
                                        </h3>

                                        <div className="mt-2 text-sm text-neutral-400">

                                            {item.color_label && (
                                                <div>
                                                    Colour: {item.color_label}
                                                </div>
                                            )}

                                            {item.size && (
                                                <div>
                                                    Size: {item.size}
                                                </div>
                                            )}

                                            <div>
                                                Qty: {item.qty}
                                            </div>

                                        </div>

                                        {artist && (
                                            <div className="mt-3">

                                                <span className="
                                                    inline-flex
                                                    px-2
                                                    py-1
                                                    rounded-lg
                                                    text-xs
                                                    font-semibold
                                                    bg-red-600/20
                                                    text-red-400
                                                    border
                                                    border-red-600/30
                                                ">
                                                    {
                                                        artist.display_name
                                                    }
                                                </span>

                                            </div>
                                        )}

                                    </div>

                                    <div className="text-right">

                                        <div className="font-semibold">
                                            {money(
                                                (item.unit_price_cents ?? 0) *
                                                (item.qty ?? 0)
                                            )}
                                        </div>

                                        <div className="text-xs text-neutral-500 mt-1">
                                            {money(
                                                item.unit_price_cents ?? 0
                                            )} each
                                        </div>

                                    </div>

                                </div>
                            </div>
                            );
                        })}

                    </div>

                </div>



                {/* Bottom Row */}

                <div className="grid lg:grid-cols-2 gap-6">

                    {/* Tracking */}

                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

                        <h2 className="font-black text-lg mb-4">
                            Tracking
                        </h2>

                        <div className="space-y-3">

                            <div>
                                <div className="text-neutral-500 text-sm">
                                    Carrier
                                </div>

                                <div>
                                    {order.tracking_carrier || "-"}
                                </div>
                            </div>

                            <div>
                                <div className="text-neutral-500 text-sm">
                                    Tracking Number
                                </div>

                                <div>
                                    {trackingUrl ? (
                                        <a
                                            href={trackingUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-red-300 underline"
                                        >
                                            {order.tracking_code || "Track shipment"}
                                        </a>
                                    ) : (
                                        order.tracking_code || "-"
                                    )}
                                </div>
                            </div>

                            <div>
                                <div className="text-neutral-500 text-sm">
                                    Shipping Method
                                </div>

                                <div>
                                    {order.shipping_method || "-"}
                                </div>
                            </div>

                        </div>

                    </div>

                    {/* Totals */}

                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

                        <h2 className="font-black text-lg mb-4">
                            Totals
                        </h2>

                        <div className="space-y-3">

                            <div className="flex justify-between">
                                <span className="text-neutral-500">
                                    Subtotal
                                </span>

                                <span>
                                    {money(itemsSubtotal)}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-neutral-500">
                                    Shipping
                                </span>

                                <span>
                                    {money(calculatedShipping)}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-neutral-500">
                                    Discount
                                </span>

                                <span>
                                    -{money(order.discount_cents)}
                                </span>
                            </div>

                            <div className="border-t border-neutral-800 pt-3 flex justify-between text-lg font-black">

                                <span>Total</span>

                                <span>
                                    {money(calculatedTotal)}
                                </span>

                            </div>

                        </div>

                    </div>

                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

                        <h2 className="font-black text-lg mb-4">
                            Status Timeline
                        </h2>

                        {timeline.length === 0 ? (
                            <p className="text-sm text-neutral-400">
                                No status events recorded.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {timeline.map((event) => (
                                    <div
                                        key={event.id}
                                        className="rounded-xl border border-neutral-800 bg-neutral-950 p-3"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="text-sm font-semibold">
                                                {event.from_status || "created"} → {event.to_status}
                                            </div>
                                            <div className="text-xs text-neutral-500">
                                                {new Date(event.created_at).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="mt-1 text-xs text-neutral-400">
                                            {event.reason || "status_update"}
                                        </div>
                                        {event.metadata?.trackingNumber || event.metadata?.carrier ? (
                                            <div className="mt-2 text-xs text-neutral-300">
                                                Tracking: {String(event.metadata.trackingNumber ?? "-")}
                                                {" · "}
                                                Carrier: {String(event.metadata.carrier ?? "-")}
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        )}

                    </div>

                </div>

            </div>

        </main>
    );
}
