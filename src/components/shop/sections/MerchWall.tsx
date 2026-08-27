"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import type { Product } from "../ProductCard";

export default function MerchWall() {
    return (
        <section id="grid" className="border-y border-neutral-800 bg-black text-white">
            <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10 lg:px-8">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                            Fresh from the table
                        </p>
                        <h2 className="mt-2 text-3xl font-black uppercase leading-none md:text-5xl">
                            Latest Drop
                        </h2>
                        <p className="mt-2 text-sm text-neutral-400">
                            Graphic tees, vinyl, posters and more.
                        </p>
                    </div>
                    <Link
                        href="/new"
                        className="inline-flex w-fit items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-red-400 hover:text-red-300"
                    >
                        View all
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>

            <MerchWallGrid />
        </section>
    );
}

function MerchWallGrid() {
    const [live, setLive] = useState<Product[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const res = await fetch("/api/products/random", { cache: "no-store" });
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

    const list = live && live.length > 0 ? live : [];

    if (loading && (!live || live.length === 0)) {
        return (
            <div className="grid grid-cols-2 border-t border-neutral-800 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-80 animate-pulse border-b border-r border-neutral-800 bg-neutral-900 md:h-[430px]"
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 border-t border-neutral-800 md:grid-cols-3 lg:grid-cols-4">
            {list.slice(0, 8).map((p, i) => (
                <LatestDropTile key={`${p.id}-${i}`} product={p} featured={i === 0} />
            ))}
        </div>
    );
}

function LatestDropTile({ product, featured }: { product: Product; featured: boolean }) {
    return (
        <Link
            href={`/product/${product.slug ?? product.id}`}
            className="group relative overflow-hidden border-b border-r border-neutral-800 bg-neutral-950 transition hover:border-red-500"
        >
            <div className="relative aspect-[4/5] bg-neutral-100 md:aspect-[3/4]">
                <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-contain p-5 transition duration-700 group-hover:scale-105 md:p-8"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                <span className="absolute left-3 top-3 bg-red-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white">
                    {featured ? "Counter pick" : product.badge ?? "New drop"}
                </span>
                <button
                    type="button"
                    aria-label="Wishlist"
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center border border-black/10 bg-white/90 text-neutral-900 transition hover:bg-red-600 hover:text-white"
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                    }}
                >
                    <Heart className="h-4 w-4" />
                </button>
            </div>

            <div className="border-t border-neutral-800 bg-black p-3 md:p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
                    [ {product.kind ?? "merch"} {"//"} live now ]
                </p>
                <h3 className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-black leading-tight text-white">
                    {product.title}
                </h3>
                <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-white">
                        ${product.price.toFixed(2)}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-400">
                        View
                        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                    </span>
                </div>
            </div>
        </Link>
    );
}
