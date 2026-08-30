"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Disc3, Flame, Package, Search, Shirt } from "lucide-react";

type Aisle = "tees" | "hoodies" | "vinyl" | "posters";

type Product = {
    id?: string;
    title?: string;
    slug?: string;
    image?: string | null;
    price?: number;
    artist?: string | null;
    badge?: string | null;
};

const aisles = [
    { key: "tees", label: "Tees", icon: Shirt, note: "Front-row staples" },
    { key: "hoodies", label: "Hoodies", icon: Package, note: "Cold-night merch" },
    { key: "vinyl", label: "Vinyl", icon: Disc3, note: "Record crate energy" },
    { key: "posters", label: "Posters", icon: Search, note: "Flyer wall finds" },
] satisfies Array<{
    key: Aisle;
    label: string;
    icon: typeof Shirt;
    note: string;
}>;

function pickDiverseProducts(products: Product[], limit: number, maxPerArtist: number) {
    const counts = new Map<string, number>();
    const picked: Product[] = [];
    const pickedIds = new Set<string>();

    for (const product of products) {
        const artistKey = (product.badge ?? product.artist ?? "Unknown artist").trim().toLowerCase();
        const count = counts.get(artistKey) ?? 0;

        if (count >= maxPerArtist) continue;

        picked.push(product);
        if (product.id) pickedIds.add(product.id);
        counts.set(artistKey, count + 1);

        if (picked.length >= limit) return picked;
    }

    for (const product of products) {
        if (picked.length >= limit) return picked;
        if (product.id && pickedIds.has(product.id)) continue;

        picked.push(product);
        if (product.id) pickedIds.add(product.id);
    }

    return picked;
}

export default function RetailSceneFloor() {
    const [products, setProducts] = useState<Product[] | null>(null);
    const [activeAisle, setActiveAisle] = useState<Aisle>("tees");

    useEffect(() => {
        let mounted = true;

        async function load() {
            setProducts(null);

            try {
                const response = await fetch(`/api/products/category?category=${activeAisle}`, { cache: "no-store" });
                const json = await response.json();
                const categoryProducts = Array.isArray(json.products) ? (json.products as Product[]) : [];

                if (mounted) setProducts(categoryProducts.slice(0, 24));
            } catch {
                if (mounted) setProducts([]);
            }
        }

        load();

        return () => {
            mounted = false;
        };
    }, [activeAisle]);

    const railProducts = products ? pickDiverseProducts(products, 16, 2) : [];
    const activeAisleLabel = aisles.find((aisle) => aisle.key === activeAisle)?.label ?? "Tees";

    return (
        <section className="border-y border-neutral-800 bg-black text-white">
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-red-400">
                            <Flame className="h-3.5 w-3.5" />
                            Retail floor
                        </div>
                        <h2 className="mt-2 text-3xl md:text-4xl font-black leading-none">
                            Quick racks from the scene.
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm text-neutral-400">
                            Tap a rack to filter the floor without leaving the homepage.
                        </p>
                    </div>
                    <Link
                        href="/new"
                        className="inline-flex w-fit items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm font-black hover:border-red-400"
                    >
                        New this week
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                <div className="mt-6 grid gap-4">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        {aisles.map((aisle) => {
                            const Icon = aisle.icon;
                            const active = aisle.key === activeAisle;

                            return (
                                <button
                                    key={aisle.label}
                                    type="button"
                                    onClick={() => setActiveAisle(aisle.key)}
                                    className={`group border p-3 text-left transition ${active
                                        ? "border-red-500 bg-red-600 text-white"
                                        : "border-neutral-800 bg-neutral-950 hover:border-red-500"
                                    }`}
                                    aria-pressed={active}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon className={`h-4 w-4 ${active ? "text-white" : "text-red-400"}`} />
                                        <p className="text-lg font-black">{aisle.label}</p>
                                    </div>
                                    <p className={`mt-1 text-[11px] uppercase tracking-[0.12em] ${active ? "text-white/75" : "text-neutral-500 group-hover:text-neutral-300"}`}>
                                        {aisle.note}
                                    </p>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-between border-y border-neutral-800 py-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-400">
                            Showing {activeAisleLabel}
                        </p>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
                            {products === null ? "Loading" : `${railProducts.length} rack ${railProducts.length === 1 ? "pick" : "picks"}`}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                        {(products === null ? Array.from({ length: 16 }) : railProducts).map((product, index) => {
                            const typedProduct = product as Product | undefined;

                            return (
                                <Link
                                    key={`${typedProduct?.id ?? "loading-rack"}-${activeAisle}-${index}`}
                                    href={typedProduct?.slug ? `/product/${typedProduct.slug}` : "/new"}
                                    className="group relative overflow-hidden border border-neutral-800 bg-neutral-900"
                                >
                                    <div className="relative aspect-[1/1]">
                                        {typedProduct?.image ? (
                                            <Image
                                                src={typedProduct.image}
                                                alt={typedProduct.title ?? "Merch"}
                                                fill
                                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 12.5vw"
                                                className="object-cover transition duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="h-full w-full animate-pulse bg-neutral-800" />
                                        )}
                                        {index === 0 && (
                                            <div className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
                                                Counter pick
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2">
                                        <p className="line-clamp-1 text-[11px] font-black leading-tight">
                                            {typedProduct?.title ?? "Loading drop"}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-neutral-500">
                                            {typeof typedProduct?.price === "number" ? `$${typedProduct.price}` : "Checking rack"}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
