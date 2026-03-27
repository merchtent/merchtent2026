"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Product = {
    id: string;
    title: string;
    price: number;
    image: string;
    hover?: string;
    slug: string;
    artist?: string | null;
    artist_image?: string | null;
    created_at?: string;
};

export default function CategoryClient({ initialProducts }: any) {
    const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
    const [maxPrice, setMaxPrice] = useState<number>(200);
    const [sort, setSort] = useState("new");

    const [page, setPage] = useState(1);
    const PAGE_SIZE = 12;

    useEffect(() => {
        setPage(1);
    }, [selectedArtist, maxPrice, sort]);

    const artists = useMemo(() => {
        const map = new Map();

        initialProducts.forEach((p: Product) => {
            if (p.artist && !map.has(p.artist)) {
                map.set(p.artist, {
                    name: p.artist,
                    image: p.artist_image,
                });
            }
        });

        return Array.from(map.values());
    }, [initialProducts]);

    const filtered = useMemo(() => {
        let rows = [...initialProducts];

        if (selectedArtist) {
            rows = rows.filter((p) => p.artist === selectedArtist);
        }

        rows = rows.filter((p) => p.price <= maxPrice);

        // 🔥 SORTING
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
    }, [initialProducts, selectedArtist, maxPrice, sort]);

    const paginated = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filtered.slice(start, start + PAGE_SIZE);
    }, [filtered, page]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

    function clearFilters() {
        setSelectedArtist(null);
        setMaxPrice(200);
    }

    return (
        <section className="grid lg:grid-cols-[240px_1fr] gap-6">

            {/* SIDEBAR */}
            <aside className="space-y-6">

                <button
                    onClick={clearFilters}
                    className="text-xs underline text-neutral-400 hover:text-white"
                >
                    Clear filters
                </button>

                <div className="mb-4 flex items-center justify-between">

                    <p className="text-xs text-neutral-400">
                        {filtered.length} items
                    </p>

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

                {/* ARTISTS */}
                <div>
                    <p className="text-xs uppercase text-neutral-400 mb-3">
                        Artists
                    </p>

                    <div className="flex flex-col gap-2">
                        {artists.map((a: any) => (
                            <button
                                key={a.name}
                                onClick={() =>
                                    setSelectedArtist((prev) =>
                                        prev === a.name ? null : a.name
                                    )
                                }
                                className={`flex items-center gap-3 p-2 rounded-xl border ${selectedArtist === a.name
                                    ? "bg-red-600 border-red-500 text-white"
                                    : "border-neutral-800 bg-neutral-900 hover:bg-neutral-800"
                                    }`}
                            >
                                {/* ✅ AVATAR (always works) */}
                                <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-700 flex items-center justify-center text-xs font-bold">

                                    {a.image ? (
                                        <img
                                            src={a.image}
                                            alt={a.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        a.name.charAt(0)
                                    )}

                                </div>

                                <span className="text-sm truncate">
                                    {a.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* PRICE SLIDER */}
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

            </aside>

            {/* MAIN */}
            <div>

                {filtered.length === 0 ? (
                    <div className="p-6 text-center border border-neutral-800 bg-neutral-900 rounded-2xl">
                        <p>No products found.</p>
                        <Link href="/artists" className="underline mt-2 block">
                            Browse artists →
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">

                        {paginated.map((p: Product) => (
                            <Link
                                key={p.id}
                                href={`/product/${p.slug}`}
                                className="group rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 hover:-translate-y-1 transition"
                            >
                                {/* 🔥 IMAGE SWAP */}
                                <div className="relative aspect-[3/4] overflow-hidden">

                                    <Image
                                        src={p.image}
                                        alt={p.title}
                                        fill
                                        className="object-cover transition-opacity duration-300 group-hover:opacity-0"
                                    />

                                    {p.hover && (
                                        <Image
                                            src={p.hover}
                                            alt={p.title}
                                            fill
                                            className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                                        />
                                    )}

                                </div>

                                <div className="p-3">
                                    <p className="text-sm font-semibold truncate">
                                        {p.title}
                                    </p>

                                    <p className="text-sm font-bold mt-1">
                                        ${p.price}
                                    </p>
                                </div>
                            </Link>
                        ))}

                    </div>
                )}

            </div>
            {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">

                    {/* PREV */}
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-2 text-sm border border-neutral-700 rounded disabled:opacity-30"
                    >
                        Prev
                    </button>

                    {/* PAGE NUMBERS */}
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

                    {/* NEXT */}
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-2 text-sm border border-neutral-700 rounded disabled:opacity-30"
                    >
                        Next
                    </button>

                </div>
            )}
        </section>
    );
}