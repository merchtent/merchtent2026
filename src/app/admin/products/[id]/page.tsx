// app/admin/products/[id]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";

import { getServerSupabase } from "@/lib/supabase/server";
import ProductModerationActions from "./ProductModerationActions";

function money(cents: number) {
    return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

function fulfillmentFlowLabel(value?: string | null) {
    if (value === "supplier_on_demand") return "Supplier on sale";
    if (value === "manual_fulfillment") return "Manual fulfillment";
    if (value === "legacy_manual") return "Legacy manual";

    return "Unknown";
}

type ProductOrderItem = {
    id: string;
    qty?: number | null;
    unit_price_cents?: number | null;
    artist_cut_cents?: number | null;
};

type ProductColour = {
    id: string;
    hex?: string | null;
    label?: string | null;
};

export default async function ProductPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const supabase = getServerSupabase();

    const { data: product } = await supabase
        .from("products")
        .select(`
            *,
            product_images (
                id,
                path,
                sort_order,
                side
            ),
            product_colors (
                id,
                hex,
                label,
                sort_order,
                front_image_path,
                back_image_path
            ),
            order_items (
                id,
                qty,
                unit_price_cents,
                artist_cut_cents,
                created_at,
                order_id
            )
        `)
        .eq("id", id)
        .single();

    if (!product) {
        notFound();
    }

    const { data: artist } = await supabase
        .from("artists")
        .select("id, display_name")
        .eq("id", product.artist_id)
        .maybeSingle();

    const sales =
        product.order_items?.reduce(
            (sum: number, item: ProductOrderItem) =>
                sum + (item.qty ?? 0),
            0
        ) ?? 0;

    const revenue =
        product.order_items?.reduce(
            (sum: number, item: ProductOrderItem) =>
                sum +
                (
                    (item.unit_price_cents ?? 0) *
                    (item.qty ?? 0)
                ),
            0
        ) ?? 0;

    const artistEarnings =
        product.order_items?.reduce(
            (sum: number, item: ProductOrderItem) =>
                sum +
                (
                    (item.artist_cut_cents ?? 0) *
                    (item.qty ?? 0)
                ),
            0
        ) ?? 0;

    return (
        <main className="min-h-screen bg-black text-white">

            {/* HEADER */}

            <section className="border-b border-neutral-800 p-5 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">

                <div>

                    <Link
                        href="/admin/products"
                        className="text-sm font-black uppercase tracking-[0.12em] text-lime-300 hover:text-white"
                    >
                        ← Back to Products
                    </Link>

                    <h1 className="mt-4 max-w-5xl text-5xl font-black uppercase leading-[0.88] md:text-7xl">
                        {product.title}
                    </h1>

                    <div className="flex gap-2 mt-4">

                        {product.is_published && (
                            <span className="
                                px-3
                                py-1
                                rounded-lg
                                text-xs
                                bg-green-500/20
                                text-green-400
                                border
                                border-green-500/30
                            ">
                                LIVE
                            </span>
                        )}

                        {product.editors_choice && (
                            <span className="
                                px-3
                                py-1
                                rounded-lg
                                text-xs
                                bg-red-500/20
                                text-red-400
                                border
                                border-red-500/30
                            ">
                                FEATURED
                            </span>
                        )}

                    </div>

                </div>

                <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="
                        bg-lime-300
                        hover:bg-lime-200
                        px-5
                        py-3
                        font-black
                        uppercase
                        tracking-[0.08em]
                        text-black
                        transition
                    "
                >
                    Edit Product
                </Link>

            </div>
            </section>

            {/* STATS */}

            <section className="grid border-b border-neutral-800 md:grid-cols-5">

                <div className="border-b border-r border-neutral-800 bg-neutral-950 p-5">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                        Revenue
                    </div>

                    <div className="text-3xl font-black mt-2">
                        {money(revenue)}
                    </div>
                </div>

                <div className="border-b border-r border-neutral-800 bg-neutral-950 p-5">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                        Sales
                    </div>

                    <div className="text-3xl font-black mt-2">
                        {sales}
                    </div>
                </div>

                <div className="border-b border-r border-neutral-800 bg-neutral-950 p-5">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                        Colours
                    </div>

                    <div className="text-3xl font-black mt-2">
                        {product.product_colors?.length ?? 0}
                    </div>
                </div>

                <div className="border-b border-r border-neutral-800 bg-neutral-950 p-5">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                        Images
                    </div>

                    <div className="text-3xl font-black mt-2">
                        {product.product_images?.length ?? 0}
                    </div>
                </div>

                <div className="border-b border-r border-neutral-800 bg-neutral-950 p-5">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                        Artist Earnings
                    </div>

                    <div className="text-3xl font-black mt-2 text-lime-300">
                        {money(artistEarnings)}
                    </div>
                </div>

            </section>

            <section className="grid gap-px bg-neutral-800 p-px lg:grid-cols-3">

                {/* MAIN */}

                <div className="space-y-px bg-neutral-800 lg:col-span-2">

                    {/* DETAILS */}

                    <div className="bg-black p-5 md:p-6">

                        <h2 className="mb-5 text-2xl font-black uppercase tracking-tight">
                            Product Details
                        </h2>

                        <div className="grid md:grid-cols-2 gap-6">

                            <div>
                                <div className="text-xs text-neutral-500">
                                    Artist
                                </div>

                                <div className="mt-1">
                                    {artist?.display_name ?? "-"}
                                </div>
                            </div>

                            <div>
                                <div className="text-xs text-neutral-500">
                                    Category
                                </div>

                                <div className="mt-1 capitalize">
                                    {product.category}
                                </div>
                            </div>

                            <div>
                                <div className="text-xs text-neutral-500">
                                    Price
                                </div>

                                <div className="mt-1">
                                    {money(product.price_cents)}
                                </div>
                            </div>

                            <div>
                                <div className="text-xs text-neutral-500">
                                    Artist Cut
                                </div>

                                <div className="mt-1">
                                    {money(product.artist_cut_cents)}
                                </div>
                            </div>

                            <div>
                                <div className="text-xs text-neutral-500">
                                    Moderation
                                </div>

                                <div className="mt-1 capitalize">
                                    {(product.moderation_status ?? "unknown").replaceAll("_", " ")}
                                </div>
                            </div>

                            <div>
                                <div className="text-xs text-neutral-500">
                                    Fulfillment Flow
                                </div>

                                <div className="mt-1">
                                    {fulfillmentFlowLabel(product.fulfillment_flow)}
                                </div>
                            </div>

                            <div>
                                <div className="text-xs text-neutral-500">
                                    Reviewed
                                </div>

                                <div className="mt-1">
                                    {product.moderation_reviewed_at
                                        ? new Date(product.moderation_reviewed_at).toLocaleString("en-AU", {
                                            dateStyle: "medium",
                                            timeStyle: "short",
                                        })
                                        : "-"}
                                </div>
                            </div>

                        </div>

                        <div className="mt-6">
                            <div className="text-xs text-neutral-500 mb-2">
                                Description
                            </div>

                            <div className="text-neutral-300 whitespace-pre-wrap">
                                {product.description}
                            </div>
                        </div>

                        {product.moderation_notes ? (
                            <div className="mt-6">
                                <div className="text-xs text-neutral-500 mb-2">
                                    Moderation Notes
                                </div>

                                <div className="text-neutral-300 whitespace-pre-wrap">
                                    {product.moderation_notes}
                                </div>
                            </div>
                        ) : null}

                    </div>

                    {/* COLOURS */}

                    <div className="bg-black p-5 md:p-6">

                        <h2 className="mb-5 text-2xl font-black uppercase tracking-tight">
                            Colours
                        </h2>

                        <div className="grid md:grid-cols-2 gap-4">

                            {product.product_colors?.map((colour: ProductColour) => (
                                <div
                                    key={colour.id}
                                    className="
                                        border
                                        border-neutral-800
                                        rounded-xl
                                        p-4
                                    "
                                >

                                    <div className="flex items-center gap-3">

                                        <div
                                            className="h-8 w-8 rounded-full border border-white/20"
                                            style={{
                                                backgroundColor: colour.hex ?? undefined,
                                            }}
                                        />

                                        <div>
                                            <div className="font-semibold">
                                                {colour.label}
                                            </div>

                                            <div className="text-xs text-neutral-500">
                                                {colour.hex}
                                            </div>
                                        </div>

                                    </div>

                                </div>
                            ))}

                        </div>

                    </div>

                    {/* SALES */}

                    <div className="bg-black p-5 md:p-6">

                        <h2 className="mb-5 text-2xl font-black uppercase tracking-tight">
                            Recent Sales
                        </h2>

                        <div className="space-y-3">

                            {product.order_items
                                ?.slice(0, 20)
                                .map((item: ProductOrderItem) => (
                                    <div
                                        key={item.id}
                                        className="
                                            flex
                                            justify-between
                                            border
                                            border-neutral-800
                                            rounded-xl
                                            p-4
                                        "
                                    >

                                        <div>
                                            Qty {item.qty}
                                        </div>

                                        <div className="font-semibold">
                                            {money(
                                                (item.unit_price_cents ?? 0) *
                                                (item.qty ?? 0)
                                            )}
                                        </div>

                                    </div>
                                ))}

                        </div>

                    </div>

                </div>

                {/* SIDEBAR */}

                <div className="space-y-6">

                    <div className="bg-black p-5 md:p-6">

                        <h2 className="mb-4 text-2xl font-black uppercase tracking-tight">
                            Moderation
                        </h2>

                        <ProductModerationActions
                            productId={product.id}
                            currentStatus={product.moderation_status}
                        />

                    </div>

                </div>

            </section>

        </main>
    );
}
