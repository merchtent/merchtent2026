import Link from "next/link";
import { Plus } from "lucide-react";

import { getServerSupabase } from "@/lib/supabase/server";

function money(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
}

function fulfillmentFlowLabel(value?: string | null) {
    if (value === "supplier_on_demand") return "SUPPLIER ON SALE";
    if (value === "manual_fulfillment") return "MANUAL";
    if (value === "legacy_manual") return "LEGACY MANUAL";

    return "UNKNOWN FLOW";
}

type ProductOrderItem = {
    qty?: number | null;
    unit_price_cents?: number | null;
};

type ProductColour = {
    id: string;
    hex?: string | null;
    label?: string | null;
};

export default async function ProductsPage() {
    const supabase = getServerSupabase();

    const { data: artists } = await supabase
        .from("artists")
        .select("id, display_name");

    const artistLookup = Object.fromEntries(
        (artists ?? []).map((a) => [a.id, a.display_name])
    );

    const { data: products, error } = await supabase
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
                front_image_path,
                back_image_path
            ),
            order_items (
                id,
                qty,
                unit_price_cents,
                qty
            )
        `)
        .order("created_at", {
            ascending: false,
        });

    if (error) {
        return (
            <div className="m-6 border border-red-900 bg-red-950/20 p-6 text-red-200">
                Failed to load products
            </div>
        );
    }

    const sortedProducts =
        [...(products ?? [])].sort((a, b) => {

            const revenueA =
                a.order_items?.reduce(
                    (sum: number, item: ProductOrderItem) =>
                        sum + ((item.unit_price_cents ?? 0) * (item.qty ?? 0)),
                    0
                ) ?? 0;

            const revenueB =
                b.order_items?.reduce(
                    (sum: number, item: ProductOrderItem) =>
                        sum + ((item.unit_price_cents ?? 0) * (item.qty ?? 0)),
                    0
                ) ?? 0;

            return revenueB - revenueA;
        });

    const totalSales =
        products?.reduce(
            (sum, product) =>
                sum +
                (
                    product.order_items?.reduce(
                        (x: number, oi: ProductOrderItem) => x + (oi.qty ?? 0),
                        0
                    ) ?? 0
                ),
            0
        ) ?? 0;

    return (
        <main className="min-h-screen bg-black text-white">

            {/* HEADER */}

            <section className="border-b border-neutral-800 p-5 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">Merch control</p>
                    <h1 className="mt-2 text-5xl font-black uppercase leading-[0.88] md:text-7xl">
                        Products
                    </h1>

                    <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                        Manage merch, colours, images, moderation state, fulfilment flow and sales visibility.
                    </p>
                </div>

                <Link
                    href="/admin/products/new"
                    className="
                        inline-flex
                        items-center
                        gap-2
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
                    <Plus className="h-4 w-4" />
                    New Product
                </Link>

            </div>
            </section>

            {/* STATS */}

            <section className="grid border-b border-neutral-800 md:grid-cols-4">

                <div className="border-b border-r border-neutral-800 bg-neutral-950 p-5">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                        Products
                    </div>

                    <div className="mt-4 text-4xl font-black">
                        {products?.length ?? 0}
                    </div>
                </div>

                <div className="border-b border-r border-neutral-800 bg-neutral-950 p-5">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                        Published
                    </div>

                    <div className="mt-4 text-4xl font-black text-lime-300">
                        {
                            products?.filter(
                                p => p.is_published
                            ).length
                        }
                    </div>
                </div>

                <div className="border-b border-r border-neutral-800 bg-neutral-950 p-5">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                        Pending Review
                    </div>

                    <div className="mt-4 text-4xl font-black text-red-400">
                        {
                            products?.filter(
                                p => p.moderation_status === "pending_review"
                            ).length
                        }
                    </div>
                </div>

                <div className="border-b border-r border-neutral-800 bg-neutral-950 p-5">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                        Total Sales
                    </div>

                    <div className="mt-4 text-4xl font-black">
                        {totalSales}
                    </div>
                </div>

            </section>

            {/* TABLE */}

            <section className="p-5 md:p-8">
            <div className="
                border
                border-neutral-800
                bg-neutral-950
                overflow-hidden
            ">

                <table className="w-full">

                    <thead className="bg-black text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">

                        <tr>

                            <th className="p-4 text-left">
                                Product
                            </th>

                            <th className="p-4 text-left">
                                Artist
                            </th>

                            <th className="p-4 text-left">
                                Colours
                            </th>

                            <th className="p-4 text-left">
                                Images
                            </th>

                            <th className="p-4 text-left">
                                Price
                            </th>

                            <th className="p-4 text-left">
                                Sales
                            </th>

                            <th className="p-4 text-left">
                                Revenue
                            </th>

                            <th className="p-4 text-left">
                                Status
                            </th>

                            <th className="p-4 text-left">
                                Actions
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        {sortedProducts?.map((product) => {

                            const sales =
                                product.order_items?.reduce(
                                    (sum: number, item: ProductOrderItem) =>
                                        sum +
                                        (item.qty ?? 0),
                                    0
                                ) ?? 0;

                            const revenue =
                                product.order_items?.reduce(
                                    (sum: number, item: ProductOrderItem) =>
                                        sum +
                                        ((item.unit_price_cents ?? 0) * (item.qty ?? 0)),
                                    0
                                ) ?? 0;

                            return (
                                <tr
                                    key={product.id}
                                    className="
                                        border-t
                                        border-neutral-800
                                        hover:bg-neutral-800/30
                                    "
                                >

                                    {/* PRODUCT */}

                                    <td className="p-4">

                                        <div className="font-semibold">
                                            {product.title}
                                        </div>

                                        <div className="text-xs text-neutral-500">
                                            {product.slug}
                                        </div>

                                        <div className="text-xs text-neutral-600 mt-1 uppercase">
                                            {product.category}
                                        </div>

                                    </td>

                                    {/* ARTIST */}

                                    <td className="p-4">

                                        {artistLookup[
                                            product.artist_id
                                        ] ?? "-"}

                                    </td>

                                    {/* COLOURS */}

                                    <td className="p-4">

                                        <div className="flex flex-wrap gap-1">

                                            {product.product_colors?.map(
                                                (colour: ProductColour) => (
                                                    <div
                                                        key={colour.id}
                                                        className="
                                                            h-5
                                                            w-5
                                                            rounded-full
                                                            border
                                                            border-white/20
                                                        "
                                                        style={{
                                                            backgroundColor:
                                                                colour.hex ?? undefined,
                                                        }}
                                                        title={
                                                            colour.label ??
                                                            colour.hex ??
                                                            undefined
                                                        }
                                                    />
                                                )
                                            )}

                                        </div>

                                    </td>

                                    {/* IMAGES */}

                                    <td className="p-4">
                                        {
                                            product.product_images
                                                ?.length
                                        } Images
                                    </td>

                                    {/* PRICE */}

                                    <td className="p-4 font-semibold">
                                        {money(
                                            product.price_cents
                                        )}
                                    </td>

                                    {/* SALES */}

                                    <td className="p-4">
                                        {sales}
                                    </td>

                                    {/* REVENUE */}

                                    <td className="p-4 font-semibold">
                                        {money(revenue)}
                                    </td>

                                    {/* STATUS */}

                                    <td className="p-4">

                                        <div className="flex flex-wrap gap-2">

                                            {product.is_published && (
                                                <span
                                                    className="
                                                        px-2
                                                        py-1
                                                        rounded
                                                        text-xs
                                                        bg-green-500/20
                                                        text-green-400
                                                    "
                                                >
                                                    LIVE
                                                </span>
                                            )}

                                            {product.editors_choice && (
                                                <span
                                                    className="
                                                        px-2
                                                        py-1
                                                        rounded
                                                        text-xs
                                                        bg-red-500/20
                                                        text-red-400
                                                    "
                                                >
                                                    FEATURED
                                                </span>
                                            )}

                                            {!product.is_published && (
                                                <span
                                                    className="
                                                        px-2
                                                        py-1
                                                        rounded
                                                        text-xs
                                                        bg-neutral-700
                                                        text-neutral-300
                                                    "
                                                >
                                                    DRAFT
                                                </span>
                                            )}

                                            {product.moderation_status && (
                                                <span
                                                    className="
                                                        px-2
                                                        py-1
                                                        rounded
                                                        text-xs
                                                        bg-yellow-500/15
                                                        text-yellow-200
                                                    "
                                                >
                                                    {String(product.moderation_status).replaceAll("_", " ").toUpperCase()}
                                                </span>
                                            )}

                                            <span
                                                className="
                                                    px-2
                                                    py-1
                                                    rounded
                                                    text-xs
                                                    bg-neutral-800
                                                    text-neutral-200
                                                    border
                                                    border-neutral-700
                                                "
                                            >
                                                {fulfillmentFlowLabel(product.fulfillment_flow)}
                                            </span>

                                        </div>

                                    </td>

                                    {/* ACTIONS */}

                                    <td className="p-4">

                                        <Link
                                            href={`/admin/products/${product.id}`}
                                            className="
                                                text-red-400
                                                hover:text-red-300
                                                font-semibold
                                            "
                                        >
                                            Manage →
                                        </Link>

                                    </td>

                                </tr>
                            );
                        })}

                    </tbody>

                </table>

            </div>
            </section>

        </main>
    );
}
