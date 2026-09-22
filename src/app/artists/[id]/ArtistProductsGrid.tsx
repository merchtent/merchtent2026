"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import SavedToggleButton from "@/components/SavedToggleButton";
import type { Product as CardProduct } from "@/components/shop/ProductCard";
import { trackMarketingEvent } from "@/lib/marketing/events";

export type ArtistGridProduct = CardProduct & {
    created_at?: string;
};

export default function ArtistProductsGrid({ products }: { products: ArtistGridProduct[] }) {
    const [maxPrice, setMaxPrice] = useState(200);
    const [sort, setSort] = useState("new");

    const [page, setPage] = useState(1);
    const PAGE_SIZE = 12;

    // 🔥 FILTER + SORT
    const filtered = useMemo(() => {
        let rows = [...products];

        rows = rows.filter((p) => p.price <= maxPrice);

        if (sort === "plh") {
            rows.sort((a, b) => a.price - b.price);
        } else if (sort === "phl") {
            rows.sort((a, b) => b.price - a.price);
        } else {
            rows.sort(
                (a, b) =>
                    new Date(b.created_at || "").getTime() -
                    new Date(a.created_at || "").getTime()
            );
        }

        return rows;
    }, [products, maxPrice, sort]);

    // 🔥 PAGINATION
    const paginated = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filtered.slice(start, start + PAGE_SIZE);
    }, [filtered, page]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

    function clearFilters() {
        setMaxPrice(200);
        setSort("new");
        setPage(1);
    }

    if (!products.length) {
        return (
            <div className="border border-neutral-800 bg-neutral-950 p-6">
                <p className="text-neutral-300">No products yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-7">
            <div className="grid gap-4 border-y border-neutral-800 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <p className="text-xs font-semibold text-neutral-400">
                        {filtered.length} {filtered.length === 1 ? "product" : "products"}
                    </p>
                    <label className="flex items-center gap-3 text-xs text-neutral-400">
                        <span>Up to ${maxPrice}</span>
                        <input
                            type="range"
                            min={0}
                            max={200}
                            step={5}
                            value={maxPrice}
                            onChange={(event) => {
                                setMaxPrice(Number(event.target.value));
                                setPage(1);
                            }}
                            className="w-32 accent-lime-300 sm:w-44"
                        />
                    </label>
                </div>

                <div className="flex items-center gap-3 sm:justify-end">
                    {maxPrice !== 200 || sort !== "new" ? (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="text-xs font-semibold text-neutral-500 underline-offset-4 hover:text-white hover:underline"
                        >
                            Reset
                        </button>
                    ) : null}
                    <label className="sr-only" htmlFor="artist-product-sort">Sort products</label>
                    <select
                        id="artist-product-sort"
                        value={sort}
                        onChange={(e) => {
                            setSort(e.target.value);
                            setPage(1);
                        }}
                        className="border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-lime-300 focus:outline-none"
                    >
                        <option value="new">Newest</option>
                        <option value="plh">Price: low to high</option>
                        <option value="phl">Price: high to low</option>
                    </select>
                </div>
            </div>

            <ul className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4 2xl:grid-cols-5">
                {paginated.map((p) => (
                    <li key={p.id}>
                        <ArtistProductCard product={p} />
                    </li>
                ))}
            </ul>

            {/* 🔥 PAGINATION */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">

                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="border border-neutral-700 px-3 py-2 text-sm disabled:opacity-30"
                    >
                        Prev
                    </button>

                    {Array.from({ length: totalPages }).map((_, i) => {
                        const p = i + 1;

                        return (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`border px-3 py-2 text-sm ${p === page
                                    ? "bg-red-600 border-red-500 text-white"
                                    : "border-neutral-700 hover:bg-neutral-800"
                                    }`}
                            >
                                {p}
                            </button>
                        );
                    })}

                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="border border-neutral-700 px-3 py-2 text-sm disabled:opacity-30"
                    >
                        Next
                    </button>

                </div>
            )}
        </div>
    );
}

function ArtistProductCard({ product }: { product: ArtistGridProduct }) {
    const productHref = `/product/${product.slug ?? product.id}`;
    const frontImage = product.colors?.[0]?.front || product.image;
    const backImage = product.colors?.[0]?.back || product.hover;
    const colourCount = product.colors?.length ?? 0;

    return (
        <article className="group min-w-0">
            <div className="relative aspect-square overflow-hidden border border-neutral-800 bg-[#f2f0ea] transition-colors group-hover:border-lime-300">
                <Link
                    href={productHref}
                    aria-label={`View ${product.title}`}
                    className="absolute inset-0 z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-lime-300"
                    onClick={() =>
                        trackMarketingEvent("select_item", {
                            item_list_name: "artist_shop",
                            items: [{
                                item_id: product.id,
                                item_name: product.title,
                                price_cents: Math.round(product.price * 100),
                                currency: "AUD",
                            }],
                        })
                    }
                />
                <Image
                    src={frontImage}
                    alt={product.title}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className={`object-contain p-3 transition duration-300 group-hover:scale-[1.025] ${backImage ? "group-hover:opacity-0" : ""}`}
                />
                {backImage ? (
                    <Image
                        src={backImage}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        className="object-contain p-3 opacity-0 transition duration-300 group-hover:scale-[1.025] group-hover:opacity-100"
                    />
                ) : null}
                {product.badge ? (
                    <span className="absolute left-3 top-3 z-20 bg-red-600 px-2 py-1 text-[10px] font-bold uppercase text-white">
                        {product.badge}
                    </span>
                ) : null}
                <div className="absolute right-2 top-2 z-20">
                    <SavedToggleButton
                        type="product"
                        id={product.id}
                        variant="icon"
                        className="!border-black/15 !bg-white/90 p-2 !text-neutral-700 shadow-sm hover:!bg-white hover:!text-red-600"
                    />
                </div>
            </div>

            <div className="border-t border-neutral-800 pt-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <Link href={productHref} className="line-clamp-2 text-sm font-bold leading-5 text-white hover:text-lime-300 md:text-base">
                            {product.title}
                        </Link>
                        <p className="mt-1 text-base font-bold text-lime-300">${product.price.toFixed(2)}</p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-neutral-600 transition group-hover:translate-x-0.5 group-hover:text-lime-300" />
                </div>

                <div className="mt-3 flex min-h-5 items-center justify-between gap-3 text-[11px] text-neutral-500">
                    <div className="flex items-center gap-1.5" aria-label={colourCount ? `${colourCount} colours available` : undefined}>
                        {(product.colors ?? []).slice(0, 4).map((colour, index) => (
                            <span
                                key={`${colour.hex}-${index}`}
                                className="h-3.5 w-3.5 border border-white/20"
                                style={{ backgroundColor: colour.hex }}
                                title={colour.label ?? undefined}
                            />
                        ))}
                        {colourCount > 4 ? <span>+{colourCount - 4}</span> : null}
                    </div>
                    <span>{colourCount ? `${colourCount} colour${colourCount === 1 ? "" : "s"}` : "Artist merch"}</span>
                </div>
            </div>
        </article>
    );
}
