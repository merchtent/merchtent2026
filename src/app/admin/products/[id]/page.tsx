// app/admin/products/[id]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";

import { getServerSupabase } from "@/lib/supabase/server";
import ProductModerationActions from "./ProductModerationActions";

function money(cents: number) {
    return `$${((cents ?? 0) / 100).toFixed(2)}`;
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
        <div className="p-6 space-y-8">

            {/* HEADER */}

            <div className="flex items-start justify-between">

                <div>

                    <Link
                        href="/admin/products"
                        className="text-neutral-400 hover:text-white text-sm"
                    >
                        ← Back to Products
                    </Link>

                    <h1 className="text-5xl font-black mt-3">
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
                        bg-red-600
                        hover:bg-red-500
                        px-5
                        py-3
                        rounded-xl
                        font-semibold
                        transition
                    "
                >
                    Edit Product
                </Link>

            </div>

            {/* STATS */}

            <div className="grid md:grid-cols-5 gap-4">

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                    <div className="text-neutral-500 text-sm">
                        Revenue
                    </div>

                    <div className="text-3xl font-black mt-2">
                        {money(revenue)}
                    </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                    <div className="text-neutral-500 text-sm">
                        Sales
                    </div>

                    <div className="text-3xl font-black mt-2">
                        {sales}
                    </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                    <div className="text-neutral-500 text-sm">
                        Colours
                    </div>

                    <div className="text-3xl font-black mt-2">
                        {product.product_colors?.length ?? 0}
                    </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                    <div className="text-neutral-500 text-sm">
                        Images
                    </div>

                    <div className="text-3xl font-black mt-2">
                        {product.product_images?.length ?? 0}
                    </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                    <div className="text-neutral-500 text-sm">
                        Artist Earnings
                    </div>

                    <div className="text-3xl font-black mt-2 text-green-400">
                        {money(artistEarnings)}
                    </div>
                </div>

            </div>

            <div className="grid lg:grid-cols-3 gap-6">

                {/* MAIN */}

                <div className="lg:col-span-2 space-y-6">

                    {/* DETAILS */}

                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">

                        <h2 className="text-xl font-black mb-5">
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

                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">

                        <h2 className="text-xl font-black mb-5">
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

                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">

                        <h2 className="text-xl font-black mb-5">
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

                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">

                        <h2 className="font-black text-xl mb-4">
                            Moderation
                        </h2>

                        <ProductModerationActions
                            productId={product.id}
                            currentStatus={product.moderation_status}
                        />

                    </div>

                </div>

            </div>

        </div>
    );
}
