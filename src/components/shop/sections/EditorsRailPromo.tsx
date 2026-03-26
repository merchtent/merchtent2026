"use client";

import { Product, ProductCard } from "../ProductCard";
import { useEffect, useState } from "react";

export default function EditorsRailPromo() {
    return (
        <section className="py-10 md:py-14">
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                <div className="flex items-end justify-between mb-6">
                    <h3 className="text-xl md:text-2xl font-black">Editor’s Picks</h3>
                    <a href="/editors" className="text-sm underline">View all</a>
                </div>

                <EditorsRail
                    onQuickAdd={(p) => (1 + 1)} // addToCart
                    onQuickView={(p) => (1 + 1)} // setQuickView
                    fallback={[]} // optional fallback to your temp set
                />
            </div>
        </section>
    )
}

function EditorsRail({
    onQuickAdd,
    onQuickView,
    fallback = [],
}: {
    onQuickAdd: (p: Product) => void;
    onQuickView: (p: Product) => void;
    fallback?: Product[];
}) {
    const [list, setList] = useState<Product[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await fetch("/api/products/editors", { cache: "no-store" });
                const json = await res.json();
                if (mounted) setList(Array.isArray(json.products) ? json.products : []);
            } catch {
                if (mounted) setList([]);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const data = (list && list.length ? list : fallback) as Product[];

    return (
        <div className="overflow-x-auto no-scrollbar pb-6 h-full">
            <div className="flex gap-4 pr-4 items-stretch min-h-[320px] h-full">
                {loading && (!list || list.length === 0) &&
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="min-w-[220px] max-w-[220px] h-full">
                            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 h-80 w-[220px] animate-pulse" />
                        </div>
                    ))
                }

                {data.map((p, idx) => (
                    <div
                        key={p.id}
                        className={`min-w-[270px] max-w-[270px] min-h-[320px] ${idx % 2 ? "rotate-2" : "-rotate-2"
                            } transition-transform`}
                    >
                        <div className="h-full">
                            <ProductCard
                                p={p}
                                // onQuickAdd={onQuickAdd}
                                // onQuickView={onQuickView}
                                theme={idx % 2 ? "light" : "dark"}
                                clipped={idx % 3 === 0}
                                sizeTone="dark"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}