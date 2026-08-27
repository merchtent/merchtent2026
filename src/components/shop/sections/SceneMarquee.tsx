"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";

type Artist = {
    name?: string | null;
    slug?: string | null;
};

type Product = {
    id?: string | null;
    title?: string | null;
    slug?: string | null;
    image?: string | null;
    price?: number | null;
    badge?: string | null;
};

type MarqueeItem = {
    label: string;
    href: string;
    tone: "drop" | "artist" | "scene";
};

const fallbackItems: MarqueeItem[] = [
    { label: "Unsigned drops live now", href: "/new", tone: "drop" },
    { label: "Artists design it here", href: "/start", tone: "artist" },
    { label: "Fans earn merch credits", href: "/orders", tone: "scene" },
    { label: "Printed after it sells", href: "/sustainability", tone: "scene" },
    { label: "No dead stock", href: "/sustainability", tone: "scene" },
    { label: "Back the band early", href: "/artists", tone: "artist" },
];

function fillProductRow(products: Product[], count: number) {
    if (products.length === 0) return [];

    return Array.from({ length: count }, (_, index) => products[index % products.length]);
}

export default function SceneMarquee() {
    const [items, setItems] = useState<MarqueeItem[]>(fallbackItems);
    const [products, setProducts] = useState<Product[] | null>(null);

    useEffect(() => {
        let mounted = true;

        async function load() {
            try {
                const [artistsRes, productsRes] = await Promise.all([
                    fetch("/api/artists", { cache: "no-store" }),
                    fetch("/api/products", { cache: "no-store" }),
                ]);

                const [artistsJson, productsJson] = await Promise.all([
                    artistsRes.json(),
                    productsRes.json(),
                ]);

                const artists = Array.isArray(artistsJson.artists)
                    ? (artistsJson.artists as Artist[]).slice(0, 6)
                    : [];
                const products = Array.isArray(productsJson.products)
                    ? (productsJson.products as Product[]).slice(0, 12)
                    : [];

                const liveItems: MarqueeItem[] = [
                    ...products
                        .filter((product) => product.title && product.slug)
                        .map((product) => ({
                            label: `New drop: ${product.title}`,
                            href: `/product/${product.slug}`,
                            tone: "drop" as const,
                        })),
                    ...artists
                        .filter((artist) => artist.name && artist.slug)
                        .map((artist) => ({
                            label: `Artist tent: ${artist.name}`,
                            href: `/artists/${artist.slug}`,
                            tone: "artist" as const,
                        })),
                    ...fallbackItems,
                ];

                if (mounted && liveItems.length > 0) {
                    setItems(liveItems);
                    setProducts(products.slice(0, 8));
                }
            } catch {
                if (mounted) setItems(fallbackItems);
                if (mounted) setProducts([]);
            }
        }

        load();

        return () => {
            mounted = false;
        };
    }, []);

    const doubledItems = useMemo(() => [...items, ...items], [items]);
    const reversedItems = useMemo(() => [...items].reverse().concat([...items].reverse()), [items]);

    return (
        <section className="relative overflow-hidden border-y border-neutral-800 bg-red-600 text-white">
            <MarqueeRow items={doubledItems} direction="left" />
            <LiveProductStrip products={products} />
            <MarqueeRow items={reversedItems} direction="right" />

            <style jsx>{`
                @keyframes sceneMarqueeLeft {
                    from {
                        transform: translateX(0);
                    }
                    to {
                        transform: translateX(-50%);
                    }
                }

                @keyframes sceneMarqueeRight {
                    from {
                        transform: translateX(-50%);
                    }
                    to {
                        transform: translateX(0);
                    }
                }
            `}</style>
        </section>
    );
}

function LiveProductStrip({ products }: { products: Product[] | null }) {
    const cards = products === null ? Array.from({ length: 8 }) : fillProductRow(products, 8);

    return (
        <div className="border-b border-black/20 bg-black">
            <div className="grid grid-flow-col auto-cols-[145px] overflow-x-auto sm:auto-cols-[170px] lg:grid-flow-row lg:grid-cols-8">
                {cards.map((product, index) => {
                    const item = product as Product | undefined;

                    return (
                        <LiveProductCard
                            key={`${item?.id ?? "loading"}-${index}`}
                            product={item}
                            featured={index === 0}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function LiveProductCard({
    product,
    featured,
}: {
    product?: Product;
    featured: boolean;
}) {
    const href = product?.slug ? `/product/${product.slug}` : "/new";

    return (
        <Link
            href={href}
            className="group relative overflow-hidden border-r border-neutral-800 bg-neutral-950 last:border-r-0"
        >
            <div className="relative aspect-[1.35/1] bg-white">
                {product?.image ? (
                    <Image
                        src={product.image}
                        alt={product.title ?? "Merch product"}
                        fill
                        sizes="(max-width: 640px) 145px, (max-width: 1024px) 170px, 14vw"
                        className="object-contain p-2 transition duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="h-full w-full animate-pulse bg-neutral-200" />
                )}
                <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white">
                    {featured ? "Counter pick" : product?.badge ?? "New drop"}
                </span>
            </div>
            <div className="bg-neutral-950 p-2 text-white">
                <p className="line-clamp-1 text-[11px] font-black leading-tight">
                    {product?.title ?? "Loading drop"}
                </p>
                <p className="mt-0.5 text-[11px] text-blue-400">
                    {typeof product?.price === "number" ? `$${product.price}` : "Checking rack"}
                </p>
            </div>
        </Link>
    );
}

function MarqueeRow({
    items,
    direction,
}: {
    items: MarqueeItem[];
    direction: "left" | "right";
}) {
    return (
        <div className="overflow-hidden border-b border-black/20 last:border-b-0">
            <div
                className={`flex w-max whitespace-nowrap py-2 text-xs font-black uppercase tracking-[0.18em] ${
                    direction === "left"
                        ? "animate-[sceneMarqueeLeft_95s_linear_infinite]"
                        : "animate-[sceneMarqueeRight_110s_linear_infinite]"
                }`}
            >
                {items.map((item, index) => {
                    const alternatingTone = index % 2 === 1
                        ? "text-white"
                        : item.tone === "drop"
                            ? "text-black"
                            : item.tone === "artist"
                                ? "text-red-100"
                                : "text-black/80";

                    return (
                    <Link
                        key={`${item.label}-${index}`}
                        href={item.href}
                        className="group mx-5 inline-flex items-center gap-2 text-white/95 transition hover:text-black"
                    >
                        <span className={alternatingTone}>
                            {item.label}
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                    );
                })}
            </div>
        </div>
    );
}
