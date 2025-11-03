"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/shop/ProductCard";

type SortOption = "new" | "plh" | "phl";
type CardProduct = {
    id: string;
    title: string;
    price: number;
    image: string;
    hover?: string;
    slug?: string;
    colors?: Array<{ hex: string; label?: string | null; front?: string | null; back?: string | null }>;
    sizes?: string[];
    created_at?: string | null;
    price_cents?: number;
};

export default function CategoryClient({ initialProducts }: { initialProducts: CardProduct[] }) {
    // UI state
    const [sort, setSort] = useState<SortOption>("new");
    const [min, setMin] = useState<number | undefined>(undefined);
    const [max, setMax] = useState<number | undefined>(undefined);
    // slider mirrors (so labels update while sliding)
    const [minSlide, setMinSlide] = useState<number>(0);
    const [maxSlide, setMaxSlide] = useState<number>(500);

    // filter + sort (computed)
    const filtered = useMemo(() => {
        let rows = initialProducts.slice();

        if (typeof min === "number") {
            rows = rows.filter(p => p.price >= min);
        }
        if (typeof max === "number") {
            rows = rows.filter(p => p.price <= max);
        }

        if (sort === "plh") rows.sort((a, b) => a.price - b.price);
        else if (sort === "phl") rows.sort((a, b) => b.price - a.price);
        else rows.sort((a, b) => (new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()));

        return rows;
    }, [initialProducts, min, max, sort]);

    // helpers
    const count = filtered.length;
    const clearAll = () => {
        setMin(undefined);
        setMax(undefined);
        setMinSlide(0);
        setMaxSlide(500);
        setSort("new");
    };

    return (
        <section className="grid lg:grid-cols-[260px_1fr] gap-6">
            {/* Sidebar filters (live) */}
            <aside className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 self-start sticky top-4">
                {/* Price */}
                <div className="space-y-3">
                    <p className="text-xs uppercase tracking-wide text-neutral-400">Price (A$)</p>

                    <div className="space-y-2">
                        <label className="flex items-center justify-between text-[11px] text-neutral-400">
                            <span>Min</span>
                            <span className="text-neutral-300">{typeof min === "number" ? min : "—"}</span>
                        </label>
                        <input
                            type="range"
                            min={0}
                            max={500}
                            step={1}
                            value={minSlide}
                            onChange={(e) => {
                                const v = Number(e.target.value);
                                setMinSlide(v);
                                setMin(v === 0 ? undefined : v);
                            }}
                            className="w-full"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center justify-between text-[11px] text-neutral-400">
                            <span>Max</span>
                            <span className="text-neutral-300">{typeof max === "number" ? max : "—"}</span>
                        </label>
                        <input
                            type="range"
                            min={0}
                            max={500}
                            step={1}
                            value={maxSlide}
                            onChange={(e) => {
                                const v = Number(e.target.value);
                                setMaxSlide(v);
                                setMax(v === 0 ? undefined : v);
                            }}
                            className="w-full"
                        />
                    </div>

                    {/* Numeric inputs (also live) */}
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="Min"
                            value={typeof min === "number" ? String(min) : ""}
                            onChange={(e) => {
                                const v = e.target.value === "" ? undefined : Math.max(0, Math.floor(Number(e.target.value) || 0));
                                setMin(v);
                                setMinSlide(typeof v === "number" ? v : 0);
                            }}
                            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 text-neutral-200 px-2 py-2 text-sm placeholder:text-neutral-600"
                        />
                        <input
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="Max"
                            value={typeof max === "number" ? String(max) : ""}
                            onChange={(e) => {
                                const v = e.target.value === "" ? undefined : Math.max(0, Math.floor(Number(e.target.value) || 0));
                                setMax(v);
                                setMaxSlide(typeof v === "number" ? v : 500);
                            }}
                            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 text-neutral-200 px-2 py-2 text-sm placeholder:text-neutral-600"
                        />
                    </div>
                </div>

                {/* Sort */}
                <div className="mt-5">
                    <p className="text-xs uppercase tracking-wide text-neutral-400 mb-2">Sort</p>
                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value as SortOption)}
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-950 text-neutral-200 px-3 py-2 text-sm"
                    >
                        <option value="new">Newest</option>
                        <option value="plh">Price: Low → High</option>
                        <option value="phl">Price: High → Low</option>
                    </select>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4">
                    <button
                        onClick={clearAll}
                        className="rounded-xl px-3 py-2 border border-neutral-700 text-neutral-200 text-sm hover:bg-neutral-900"
                    >
                        Clear
                    </button>
                    <span className="text-xs text-neutral-500">{count} result{count === 1 ? "" : "s"}</span>
                </div>

                {/* Chips (purely informative here) */}
                <div className="pt-2 flex flex-wrap gap-2">
                    {typeof min === "number" && (
                        <span className="text-xs rounded-full border border-neutral-700 bg-neutral-900 text-neutral-200 px-2 py-1">
                            Min ${min}
                        </span>
                    )}
                    {typeof max === "number" && (
                        <span className="text-xs rounded-full border border-neutral-700 bg-neutral-900 text-neutral-200 px-2 py-1">
                            Max ${max}
                        </span>
                    )}
                    {sort !== "new" && (
                        <span className="text-xs rounded-full border border-neutral-700 bg-neutral-900 text-neutral-200 px-2 py-1">
                            {sort === "plh" ? "Price ↑" : "Price ↓"}
                        </span>
                    )}
                </div>
            </aside>

            {/* Results grid */}
            <div>
                <div className="mb-3 text-sm text-neutral-400">
                    {count} result{count === 1 ? "" : "s"}
                    {(typeof min === "number" || typeof max === "number") && (
                        <span className="ml-2 text-neutral-500">
                            (price
                            {typeof min === "number" ? ` ≥ $${min}` : ""}
                            {typeof min === "number" && typeof max === "number" ? " &" : ""}
                            {typeof max === "number" ? ` ≤ $${max}` : ""})
                        </span>
                    )}
                </div>

                {!filtered.length ? (
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        <p className="text-neutral-300">No products in this category yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-2">
                        {filtered.map((p, i) => (
                            <div key={p.id}>
                                {/* Keep ProductCard exactly the same usage so size pills remain clickable */}
                                <ProductCard p={p as any} theme="light" clipped={i % 2 === 0} sizeTone="dark" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
