"use client";

import { useMemo, useState, useEffect } from "react";
import { ProductCard, type Product as CardProduct } from "@/components/shop/ProductCard";

export type ArtistGridProduct = CardProduct & {
    created_at?: string;
};

export default function ArtistProductsGrid({ products }: { products: ArtistGridProduct[] }) {
    const [maxPrice, setMaxPrice] = useState(200);
    const [sort, setSort] = useState("new");

    const [page, setPage] = useState(1);
    const PAGE_SIZE = 12;

    useEffect(() => {
        setPage(1);
    }, [maxPrice, sort]);

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
    }

    if (!products.length) {
        return (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                <p className="text-neutral-300">No products yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* 🔥 FILTER BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3">

                <p className="text-xs text-neutral-400">
                    {filtered.length} items
                </p>

                <div className="flex items-center gap-2">

                    <button
                        onClick={clearFilters}
                        className="text-xs underline text-neutral-400 hover:text-white"
                    >
                        Clear
                    </button>

                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className="bg-neutral-900 border border-neutral-700 text-sm px-3 py-2 rounded-lg"
                    >
                        <option value="new">Newest</option>
                        <option value="plh">Price: Low → High</option>
                        <option value="phl">Price: High → Low</option>
                    </select>

                </div>
            </div>

            {/* 💰 PRICE SLIDER */}
            <div>
                <p className="text-xs text-neutral-400 mb-2">
                    Max Price: ${maxPrice}
                </p>

                <input
                    type="range"
                    min={0}
                    max={200}
                    step={5}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-red-500"
                />
            </div>

            {/* 🔥 PRODUCT GRID (UNCHANGED CARDS) */}
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paginated.map((p, idx) => (
                    <li key={p.id}>
                        <ProductCard p={p} theme="light" clipped={idx % 2 === 0} />
                    </li>
                ))}
            </ul>

            {/* 🔥 PAGINATION */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">

                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-2 text-sm border border-neutral-700 rounded disabled:opacity-30"
                    >
                        Prev
                    </button>

                    {Array.from({ length: totalPages }).map((_, i) => {
                        const p = i + 1;

                        return (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`px-3 py-2 text-sm rounded border ${p === page
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
                        className="px-3 py-2 text-sm border border-neutral-700 rounded disabled:opacity-30"
                    >
                        Next
                    </button>

                </div>
            )}
        </div>
    );
}