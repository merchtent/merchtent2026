"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gift } from "lucide-react";

type Product = {
    id?: string;
    title?: string;
    slug?: string;
    image?: string | null;
    price?: number;
};

const rackImages = {
    tees: "https://images.unsplash.com/photo-1521334884684-d80222895322?auto=format&fit=crop&w=1600&q=85",
    hoodies: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=85",
    tanks: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=85",
};

const collections = [
    {
        title: "Tees",
        href: "/category/tees",
        image: rackImages.tees,
        meta: "tour staples // first drop",
    },
    {
        title: "Hoodies",
        href: "/category/hoodies",
        image: rackImages.hoodies,
        meta: "late nights // loud backs",
    },
    {
        title: "Tanks",
        href: "/category/tanks",
        image: rackImages.tanks,
        meta: "summer shows // pit ready",
    },
];

function fillProducts(products: Product[], count: number) {
    if (products.length === 0) return [];
    return Array.from({ length: count }, (_, index) => products[index % products.length]);
}

export default function CollectionBundleFeature() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function loadProducts() {
            try {
                const res = await fetch("/api/products", { cache: "no-store" });
                const json = await res.json();

                if (!mounted) return;
                setProducts(Array.isArray(json.products) ? json.products.slice(0, 8) : []);
            } catch {
                if (mounted) setProducts([]);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        loadProducts();

        return () => {
            mounted = false;
        };
    }, []);

    const bundleProducts = useMemo(() => fillProducts(products, 3), [products]);
    const featureProduct = products[0];

    return (
        <section className="border-y border-neutral-800 bg-black text-white">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
                <div className="border-b border-neutral-800 lg:border-b-0 lg:border-r">
                    <div className="px-4 py-8 md:px-6 lg:px-8">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                            Featured collections
                        </p>
                        <h2 className="mt-2 text-5xl font-black uppercase leading-[0.88] md:text-7xl">
                            Pick your rack.
                        </h2>
                    </div>

                    <div className="grid border-t border-neutral-800 md:grid-cols-3">
                        {collections.map((collection) => (
                            <Link
                                key={collection.title}
                                href={collection.href}
                                className="group relative min-h-[320px] overflow-hidden border-b border-neutral-800 md:border-r"
                            >
                                <Image
                                    src={collection.image}
                                    alt=""
                                    fill
                                    sizes="(max-width: 768px) 100vw, 32vw"
                                    className="object-cover opacity-45 grayscale transition duration-700 group-hover:scale-105 group-hover:opacity-75 group-hover:grayscale-0"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/10" />
                                <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
                                        [ {collection.meta} ]
                                    </p>
                                    <h3 className="mt-3 text-4xl font-black uppercase leading-none md:text-5xl">
                                        {collection.title}
                                    </h3>
                                    <span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-red-400">
                                        Shop now
                                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="bg-neutral-950">
                    <div className="border-b border-neutral-800 p-5 md:p-8">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                            Mixtape bundle
                        </p>
                        <h2 className="mt-2 text-4xl font-black uppercase leading-none md:text-5xl">
                            Band merch on a budget.
                        </h2>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                            Build proper merch packs without making artists guess the stock first: two tees, a
                            hoodie, or a tour pack with fan credits attached.
                        </p>
                    </div>

                    <div className="grid gap-4 p-5 md:p-8 xl:grid-cols-[1fr_170px]">
                        <div>
                            <div className="grid grid-cols-3 gap-2">
                                {(loading ? Array.from({ length: 3 }) : bundleProducts).map((product, index) => {
                                    const item = product as Product | undefined;

                                    return (
                                        <Link
                                            key={`${item?.id ?? "bundle"}-${index}`}
                                            href={item?.slug ? `/product/${item.slug}` : "/bundles"}
                                            className="group relative aspect-[3/4] bg-white"
                                        >
                                            {item?.image ? (
                                                <Image
                                                    src={item.image}
                                                    alt={item.title ?? "Bundle product"}
                                                    fill
                                                    sizes="(max-width: 768px) 30vw, 160px"
                                                    className="object-contain p-3 transition group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="h-full w-full animate-pulse bg-neutral-200" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>

                            <Link
                                href="/bundles"
                                className="mt-5 inline-flex items-center gap-2 bg-red-600 px-5 py-4 text-sm font-black hover:bg-red-500"
                            >
                                Build a bundle
                                <Gift className="h-4 w-4" />
                            </Link>
                        </div>

                        <aside className="border border-neutral-800 bg-black p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-400">
                                Featured item
                            </p>
                            <p className="mt-5 line-clamp-5 text-sm font-black leading-5">
                                {featureProduct?.title ?? "Drop loading"}
                            </p>
                            <p className="mt-4 text-4xl font-black text-red-400">
                                {typeof featureProduct?.price === "number" ? `$${featureProduct.price}` : "$--"}
                            </p>
                        </aside>
                    </div>
                </div>
            </div>
        </section>
    );
}
