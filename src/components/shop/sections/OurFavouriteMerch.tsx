"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Product = {
    id: string;
    title: string;
    price: number;
    image: string;
    slug: string;
};

export default function OurFavouriteMerch() {
    return (
        <section className="relative py-10 md:py-14">

            <div className="-skew-y-3 bg-neutral-100 text-neutral-900 border-y border-neutral-200">

                <div className="skew-y-3 max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14 space-y-8">

                    {/* HEADER */}
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">

                        <div>
                            <p className="text-xs uppercase tracking-widest text-neutral-500">
                                Editor’s pick
                            </p>

                            <h3 className="text-3xl md:text-5xl font-black leading-[0.95] mt-1">
                                OUR FAV MERCH <br /> // BOOM
                            </h3>

                            <p className="mt-3 text-neutral-700 max-w-xl">
                                Handpicked gear from bands doing it right.
                                No filler — just the stuff we’d actually wear.
                            </p>
                        </div>
                    </div>

                    {/* PRODUCTS */}
                    {(() => {
                        const [live, setLive] = useState<Product[] | null>(null);
                        const [loading, setLoading] = useState(true);

                        useEffect(() => {
                            let mounted = true;

                            (async () => {
                                try {
                                    const res = await fetch("/api/products", { cache: "no-store" });
                                    const json = await res.json();

                                    if (mounted) {
                                        setLive(Array.isArray(json.products) ? json.products : []);
                                    }
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

                        const list = live ?? [];

                        if (loading && (!live || live.length === 0)) {
                            return (
                                <div className="flex gap-4 overflow-x-auto">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="min-w-[220px] rounded-2xl bg-neutral-300 h-64 animate-pulse"
                                        />
                                    ))}
                                </div>
                            );
                        }

                        return (
                            <div className="flex gap-4 overflow-x-auto pb-2">

                                {list.slice(0, 6).map((p, i) => (
                                    <Link
                                        key={p.id}
                                        href={`/product/${p.slug}`}
                                        className="min-w-[220px] group rounded-2xl overflow-hidden border border-neutral-200 bg-white hover:-translate-y-1 transition"
                                        style={{
                                            clipPath:
                                                i % 3 === 0
                                                    ? "polygon(1% 0,100% 0,98% 100%,0 100%)"
                                                    : undefined,
                                        }}
                                    >
                                        {/* IMAGE */}
                                        <div className="relative aspect-[3/4] bg-neutral-200">
                                            <Image
                                                src={p.image}
                                                alt={p.title}
                                                fill
                                                className="object-cover group-hover:scale-105 transition"
                                            />

                                            {/* BADGE */}
                                            <div className="absolute top-2 left-2 text-[10px] bg-red-600 text-white px-2 py-0.5 font-bold rounded rotate-[-3deg]">
                                                PICK
                                            </div>
                                        </div>

                                        {/* CONTENT */}
                                        <div className="p-3">
                                            <p className="text-sm font-semibold truncate">
                                                {p.title}
                                            </p>

                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-sm font-bold">
                                                    ${p.price}
                                                </span>

                                                <span className="text-xs text-neutral-500 group-hover:text-neutral-900 transition">
                                                    View →
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}

                            </div>
                        );
                    })()}

                </div>
            </div>
        </section>
    );
}