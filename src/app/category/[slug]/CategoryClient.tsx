"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, SlidersHorizontal, Users } from "lucide-react";

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
        <section className="grid gap-6">

            {/* SIDEBAR */}
            <aside className="border border-black/15 bg-white">
                <div className="grid gap-px bg-black/15 lg:grid-cols-[1fr_auto_auto]">
                    <div className="bg-white p-4">
                        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-red-600">
                            <SlidersHorizontal className="h-4 w-4" />
                            Filter the rack
                        </div>
                        <p className="mt-2 text-sm text-neutral-600">
                            {filtered.length} of {initialProducts.length} products showing
                        </p>
                    </div>

                    <div className="bg-white p-4">
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                            Sort
                        </label>
                        <select
                            value={sort}
                            onChange={(e) => {
                                setSort(e.target.value);
                                setPage(1);
                            }}
                            className="h-11 min-w-[190px] border border-black/20 bg-[#f2f0ea] px-3 text-sm font-black text-black"
                        >
                            <option value="new">Newest</option>
                            <option value="plh">Price: Low to High</option>
                            <option value="phl">Price: High to Low</option>
                        </select>
                    </div>

                    <div className="bg-white p-4">
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                            Max price: ${maxPrice}
                        </label>
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
                            className="h-11 w-full min-w-[220px] accent-lime-400"
                        />
                    </div>
                </div>

                {artists.length ? (
                    <div className="border-t border-black/15 bg-[#f2f0ea] p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">
                                Artists
                            </p>
                            <button
                                onClick={clearFilters}
                                className="text-[11px] font-black uppercase tracking-[0.14em] text-neutral-500 hover:text-black"
                            >
                                Clear filters
                            </button>
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-1">
                        {artists.map((a) => (
                            <button
                                key={a.name}
                                onClick={() => {
                                    setSelectedArtist((prev) =>
                                        prev === a.name ? null : a.name
                                    );
                                    setPage(1);
                                }}
                                className={`flex min-w-[190px] items-center gap-3 border p-2 text-left transition ${selectedArtist === a.name
                                    ? "border-black bg-lime-300 text-black"
                                    : "border-black/15 bg-white hover:border-red-600"
                                    }`}
                            >
                                <div className="flex h-10 w-10 items-center justify-center overflow-hidden bg-black text-xs font-black text-lime-300">

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
                ) : null}

            </aside>

            {/* MAIN */}
            <div>

                {filtered.length === 0 ? (
                    <div className="border border-black/15 bg-white p-8 text-center md:p-12">
                        <div className="mx-auto grid h-14 w-14 place-items-center bg-lime-300 text-black">
                            <Users className="h-6 w-6" />
                        </div>
                        <p className="mt-5 text-3xl font-black uppercase leading-none">No products found.</p>
                        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-neutral-600">
                            This rack is empty for the selected filters. Clear the filters or jump into the artist directory.
                        </p>
                        <Link href="/artists" className="mt-5 inline-flex items-center gap-2 bg-black px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-white hover:bg-red-600">
                            Browse artists <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-px bg-black/20 sm:grid-cols-3 lg:grid-cols-4">

                        {paginated.map((p: Product) => (
                            <Link
                                key={p.id}
                                href={`/product/${p.slug}`}
                                className="group overflow-hidden bg-white text-black transition hover:bg-[#fbfaf7]"
                            >
                                <div className="relative aspect-[3/4] overflow-hidden bg-[#f7f4ec]">

                                    <Image
                                        src={p.image ?? "/merch-placeholder.svg"}
                                        alt={p.title}
                                        fill
                                        sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                                        className="object-contain p-5 transition-opacity duration-300 group-hover:opacity-0 md:p-8"
                                    />

                                    {p.hover && (
                                        <Image
                                            src={p.hover}
                                            alt={p.title}
                                            fill
                                            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                                            className="object-contain p-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:p-8"
                                        />
                                    )}

                                </div>

                                <div className="border-t border-black/15 p-3 md:p-4">
                                    {p.artist ? (
                                        <p className="mb-1 truncate text-[10px] font-black uppercase tracking-[0.16em] text-red-600">
                                            {p.artist}
                                        </p>
                                    ) : null}
                                    <p className="line-clamp-2 min-h-[2.35rem] text-sm font-black leading-tight md:text-base">
                                        {p.title}
                                    </p>

                                    <p className="mt-3 text-lg font-black text-lime-700">
                                        ${p.price.toFixed(2)}
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
                        className="border border-black/20 bg-white px-3 py-2 text-sm font-black text-black disabled:opacity-30"
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
                                className={`border px-3 py-2 text-sm font-black ${p === page
                                    ? "border-black bg-lime-300 text-black"
                                    : "border-black/20 bg-white text-black hover:bg-red-600 hover:text-white"
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
                        className="border border-black/20 bg-white px-3 py-2 text-sm font-black text-black disabled:opacity-30"
                    >
                        Next
                    </button>

                </div>
            )}
        </section>
    );
}
