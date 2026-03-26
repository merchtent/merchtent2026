"use client";

import { useEffect, useState } from "react";
import { Product, ProductCard } from "../ProductCard";

export default function MerchWall() {
    return (
        <section id="grid" className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
            <div className="flex items-end justify-between mb-6">
                <div>
                    <h2 className="text-xl md:text-3xl font-black tracking-tight">Latest Drop</h2>
                    <p className="text-sm text-neutral-400">Graphic tees, vinyl, posters & more</p>
                </div>
                <a href="/new" className="text-sm underline">View all</a>
            </div>

            {/* Ideally pull this into its own component, but keeping your pattern */}
            {(() => {
                const [live, setLive] = useState<Product[] | null>(null);
                const [loading, setLoading] = useState(true);

                useEffect(() => {
                    let mounted = true;
                    (async () => {
                        try {
                            const res = await fetch("/api/products", { cache: "no-store" });
                            const json = await res.json();
                            if (mounted) setLive(Array.isArray(json.products) ? json.products : []);
                        } catch {
                            if (mounted) setLive([]);
                        } finally {
                            if (mounted) setLoading(false);
                        }
                    })();
                    return () => {
                        mounted = false;
                    };
                }, []);

                const list = (live && live.length > 0 ? live : []);

                if (loading && (!live || live.length === 0)) {
                    return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="rounded-2xl border border-neutral-800 bg-neutral-900 h-64 animate-pulse" />
                            ))}
                        </div>
                    );
                }

                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {list.slice(0, 8).map((p, i) => (
                            <div key={p.id}>
                                <ProductCard
                                    p={p}
                                    theme="light"
                                    clipped={i % 2 === 0}
                                    sizeTone="dark"
                                />
                            </div>
                        ))}
                    </div>
                );
            })()}
        </section>
    )
}