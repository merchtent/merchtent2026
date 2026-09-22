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

const statusFilters = [
    { value: "all", label: "All" },
    { value: "pending_review", label: "Pending review" },
    { value: "approved", label: "Approved" },
    { value: "blocked", label: "Blocked" },
    { value: "draft", label: "Drafts" },
    { value: "failed", label: "Failed" },
    { value: "archived", label: "Archived" },
] as const;
const PAGE_SIZE = 20;

type StatusFilter = (typeof statusFilters)[number]["value"];

function matchesStatus(product: { moderation_status: string | null; production_status: string | null; is_published: boolean | null; artist_archived_at: string | null }, status: StatusFilter) {
    if (status === "archived") return Boolean(product.artist_archived_at);
    if (product.artist_archived_at) return false;
    if (status === "all") return true;
    if (status === "failed") return product.production_status === "failed";
    if (status === "draft") return !product.is_published && product.moderation_status !== "blocked" && product.production_status !== "failed";
    return product.moderation_status === status;
}

function filterHref(status: StatusFilter, artistId: string, page = 1) {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (artistId) params.set("artist", artistId);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return `/admin/products${query ? `?${query}` : ""}`;
}

export default async function ProductsPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string; artist?: string; page?: string }>;
}) {
    const filters = await searchParams;
    const status: StatusFilter = statusFilters.find((item) => item.value === filters.status)?.value ?? "all";
    const supabase = getServerSupabase();

    const { data: artists } = await supabase
        .from("artists")
        .select("id, display_name");

    const artistLookup = Object.fromEntries(
        (artists ?? []).map((a) => [a.id, a.display_name])
    );
    const artistId = filters.artist && artistLookup[filters.artist] ? filters.artist : "";
    const artistOptions = [...(artists ?? [])].sort((a, b) => a.display_name.localeCompare(b.display_name));

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
    const artistProducts = artistId ? sortedProducts.filter((product) => product.artist_id === artistId) : sortedProducts;
    const visibleProducts = artistProducts.filter((product) => matchesStatus(product, status));
    const totalPages = Math.max(1, Math.ceil(visibleProducts.length / PAGE_SIZE));
    const requestedPage = filters.page && /^\d+$/.test(filters.page) ? Number(filters.page) : 1;
    const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
    const firstIndex = (currentPage - 1) * PAGE_SIZE;
    const pageProducts = visibleProducts.slice(firstIndex, firstIndex + PAGE_SIZE);
    const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, index) =>
        Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + index
    );

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
                        {products?.filter((product) => !product.artist_archived_at).length ?? 0}
                    </div>
                </div>

                <div className="border-b border-r border-neutral-800 bg-neutral-950 p-5">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                        Live
                    </div>

                    <div className="mt-4 text-4xl font-black text-lime-300">
                        {
                            products?.filter(
                                p => !p.artist_archived_at && p.is_published && p.moderation_status === "approved" && p.production_status === "published"
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
                                p => !p.artist_archived_at && p.moderation_status === "pending_review"
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

            <section className="p-5 md:p-8">
            <div className="mb-5 flex flex-col gap-4 border-b border-neutral-800 pb-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-lime-300">Filter products</p>
                    <nav className="flex max-w-full gap-2 overflow-x-auto pb-1" aria-label="Product status filters">
                        {statusFilters.map((item) => {
                            const active = status === item.value;
                            const count = artistProducts.filter((product) => matchesStatus(product, item.value)).length;
                            return (
                                <Link
                                    key={item.value}
                                    href={filterHref(item.value, artistId)}
                                    aria-current={active ? "page" : undefined}
                                    className={`inline-flex h-10 shrink-0 items-center gap-2 border px-3 text-xs font-black uppercase transition ${active ? "border-lime-300 bg-lime-300 text-black" : "border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-lime-300 hover:text-white"}`}
                                >
                                    {item.label}<span className={active ? "text-black/65" : "text-neutral-500"}>{count}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                <form action="/admin/products" className="flex flex-wrap items-end gap-2">
                    {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
                    <label className="grid min-w-52 gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">
                        Artist
                        <select name="artist" defaultValue={artistId} className="h-10 min-w-52 border border-neutral-700 bg-black px-3 text-sm font-semibold normal-case tracking-normal text-white focus:border-lime-300 focus:outline-none">
                            <option value="">All artists</option>
                            {artistOptions.map((artist) => <option key={artist.id} value={artist.id}>{artist.display_name}</option>)}
                        </select>
                    </label>
                    <button type="submit" className="h-10 border border-neutral-700 px-4 text-xs font-black uppercase text-white transition hover:border-lime-300 hover:text-lime-300">Apply</button>
                </form>
            </div>
            <p className="mb-3 text-xs text-neutral-500" aria-live="polite">
                {visibleProducts.length === 0
                    ? "No products match these filters"
                    : `Showing ${firstIndex + 1}-${firstIndex + pageProducts.length} of ${visibleProducts.length} products`}
            </p>
            <div className="
                border
                border-neutral-800
                bg-neutral-950
                overflow-x-auto
            ">

                <table className="w-full min-w-[1000px]">

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

                        {pageProducts.map((product) => {

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

                                            {product.artist_archived_at && (
                                                <span className="border border-neutral-600 px-2 py-1 text-xs text-neutral-300">ARCHIVED</span>
                                            )}

                                            {product.is_published && product.moderation_status === "approved" && product.production_status === "published" && (
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

                                            {!product.is_published && product.moderation_status !== "blocked" && product.production_status !== "failed" && (
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

                                            {product.production_status === "failed" && (
                                                <span className="border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-300">FAILED</span>
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
                        {visibleProducts.length === 0 ? (
                            <tr><td colSpan={9} className="border-t border-neutral-800 px-4 py-12 text-center text-sm text-neutral-400">No products match these filters.</td></tr>
                        ) : null}

                    </tbody>

                </table>

            </div>
            {totalPages > 1 ? (
                <nav className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800 pt-5" aria-label="Product pages">
                    <div className="text-xs text-neutral-500">Page {currentPage} of {totalPages}</div>
                    <div className="flex flex-wrap items-center gap-1">
                        {currentPage > 1 ? (
                            <Link href={filterHref(status, artistId, currentPage - 1)} className="inline-flex h-10 items-center border border-neutral-700 px-3 text-xs font-black uppercase text-white hover:border-lime-300">Previous</Link>
                        ) : <span className="inline-flex h-10 items-center border border-neutral-800 px-3 text-xs font-black uppercase text-neutral-600">Previous</span>}
                        {pageNumbers[0] > 1 ? <Link href={filterHref(status, artistId, 1)} className="inline-flex h-10 min-w-10 items-center justify-center border border-neutral-700 px-2 text-sm text-white hover:border-lime-300">1</Link> : null}
                        {pageNumbers[0] > 2 ? <span className="px-1 text-neutral-500" aria-hidden="true">...</span> : null}
                        {pageNumbers.map((page) => (
                            <Link key={page} href={filterHref(status, artistId, page)} aria-current={currentPage === page ? "page" : undefined} className={`inline-flex h-10 min-w-10 items-center justify-center border px-2 text-sm font-bold ${currentPage === page ? "border-lime-300 bg-lime-300 text-black" : "border-neutral-700 text-white hover:border-lime-300"}`}>
                                {page}
                            </Link>
                        ))}
                        {pageNumbers[pageNumbers.length - 1] < totalPages - 1 ? <span className="px-1 text-neutral-500" aria-hidden="true">...</span> : null}
                        {pageNumbers[pageNumbers.length - 1] < totalPages ? <Link href={filterHref(status, artistId, totalPages)} className="inline-flex h-10 min-w-10 items-center justify-center border border-neutral-700 px-2 text-sm text-white hover:border-lime-300">{totalPages}</Link> : null}
                        {currentPage < totalPages ? (
                            <Link href={filterHref(status, artistId, currentPage + 1)} className="inline-flex h-10 items-center border border-neutral-700 px-3 text-xs font-black uppercase text-white hover:border-lime-300">Next</Link>
                        ) : <span className="inline-flex h-10 items-center border border-neutral-800 px-3 text-xs font-black uppercase text-neutral-600">Next</span>}
                    </div>
                </nav>
            ) : null}
            </section>

        </main>
    );
}
