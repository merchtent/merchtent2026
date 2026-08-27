"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Product = {
    id: string;
    title: string;
    price: number;
    image: string | null;
    hover?: string | null;
    slug: string;
    artist?: string | null;
    artist_image?: string | null;
    created_at?: string;
};

type ArtistFilterOption = {
    name: string;
    image?: string | null;
};

export default function CategoryClient({ initialProducts }: { initialProducts: Product[] }) {
    const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
    const [maxPrice, setMaxPrice] = useState<number>(200);
    const [sort, setSort] = useState("new");

    const [page, setPage] = useState(1);
    const PAGE_SIZE = 12;

    const artists = useMemo(() => {
        const map = new Map<string, ArtistFilterOption>();

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
        setPage(1);
    }

    return (
        <section className="grid gap-6 lg:grid-cols-[260px_1fr]">

            {/* SIDEBAR */}
            <aside className="space-y-6 border border-neutral-800 bg-neutral-950 p-4 lg:sticky lg:top-24 lg:self-start">

                <button
                    onClick={clearFilters}
                    className="text-xs font-black uppercase tracking-[0.16em] text-red-400 hover:text-white"
                >
                    Clear filters
                </button>

                <div className="mb-4 flex items-center justify-between gap-3">

                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">
                        {filtered.length} items
                    </p>

                    <select
                        value={sort}
                        onChange={(e) => {
                            setSort(e.target.value);
                            setPage(1);
                        }}
                        className="border border-neutral-700 bg-black px-3 py-2 text-sm font-bold text-white"
                    >
                        <option value="new">Newest</option>
                        <option value="plh">Price: Low → High</option>
                        <option value="phl">Price: High → Low</option>
                    </select>

                </div>

                {/* ARTISTS */}
                <div>
                    <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-red-500">
                        Artists
                    </p>

                    <div className="flex flex-col gap-2">
                        {artists.map((a) => (
                            <button
                                key={a.name}
                                onClick={() => {
                                    setSelectedArtist((prev) =>
                                        prev === a.name ? null : a.name
                                    );
                                    setPage(1);
                                }}
                                className={`flex items-center gap-3 border p-2 text-left transition ${selectedArtist === a.name
                                    ? "border-red-500 bg-red-600 text-white"
                                    : "border-neutral-800 bg-black hover:border-neutral-600"
                                    }`}
                            >
                                <div className="flex h-9 w-9 items-center justify-center overflow-hidden bg-neutral-800 text-xs font-black">

                                    {a.image ? (
                                        <Image
                                            src={a.image}
                                            alt={a.name}
                                            width={36}
                                            height={36}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        a.name.charAt(0)
                                    )}

                                </div>

                                <span className="truncate text-sm font-bold">
                                    {a.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* PRICE SLIDER */}
                <div>
                    <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-red-500">
                        Max Price: ${maxPrice}
                    </p>

                    <input
                        type="range"
                        min={0}
                        max={200}
                        step={5}
                        value={maxPrice}
                        onChange={(e) => {
                            setMaxPrice(Number(e.target.value));
                            setPage(1);
                        }}
                        className="w-full accent-red-500"
                    />
                </div>

            </aside>

            {/* MAIN */}
            <div>

                {filtered.length === 0 ? (
                    <div className="border border-neutral-800 bg-neutral-950 p-8 text-center">
                        <p className="text-lg font-black uppercase">No products found.</p>
                        <Link href="/artists" className="mt-2 block text-sm font-bold text-red-400 hover:text-white">
                            Browse artists
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-px bg-neutral-800 sm:grid-cols-3 lg:grid-cols-4">

                        {paginated.map((p: Product) => (
                            <Link
                                key={p.id}
                                href={`/product/${p.slug}`}
                                className="group overflow-hidden bg-neutral-950 transition hover:bg-black"
                            >
                                <div className="relative aspect-[3/4] overflow-hidden bg-white">

                                    <Image
                                        src={p.image ?? "/merch-placeholder.svg"}
                                        alt={p.title}
                                        fill
                                        sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                                        className="object-cover transition-opacity duration-300 group-hover:opacity-0"
                                    />

                                    {p.hover && (
                                        <Image
                                            src={p.hover}
                                            alt={p.title}
                                            fill
                                            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                                            className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                                        />
                                    )}

                                </div>

                                <div className="border-t border-neutral-800 p-3">
                                    {p.artist ? (
                                        <p className="mb-1 truncate text-[10px] font-black uppercase tracking-[0.16em] text-red-500">
                                            {p.artist}
                                        </p>
                                    ) : null}
                                    <p className="truncate text-sm font-black">
                                        {p.title}
                                    </p>

                                    <p className="mt-1 text-sm font-bold text-neutral-400">
                                        ${p.price}
                                    </p>
                                </div>
                            </Link>
                        ))}

                    </div>
                )}

            </div>
            {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2 lg:col-start-2">

                    {/* PREV */}
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="border border-neutral-700 px-3 py-2 text-sm font-bold disabled:opacity-30"
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
                                className={`border px-3 py-2 text-sm font-bold ${p === page
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
                        className="border border-neutral-700 px-3 py-2 text-sm font-bold disabled:opacity-30"
                    >
                        Next
                    </button>

                </div>
            )}
        </section>
    );
}
