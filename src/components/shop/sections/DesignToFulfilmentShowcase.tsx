"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Boxes, CreditCard, MousePointer2, Sparkles } from "lucide-react";

type Product = {
    id?: string;
    title?: string;
    slug?: string;
    image?: string | null;
    price?: number;
};

const flow = [
    {
        label: "01",
        title: "Design",
        body: "Open the product designer and place artwork, text, and print details.",
        icon: MousePointer2,
    },
    {
        label: "02",
        title: "Launch",
        body: "Mockups become a live listing connected to the artist profile.",
        icon: Sparkles,
    },
    {
        label: "03",
        title: "Sell",
        body: "Fans buy the drop, earn credits, and support the artist directly.",
        icon: CreditCard,
    },
    {
        label: "04",
        title: "Fulfil",
        body: "The saved design data travels with the order when it sells.",
        icon: Boxes,
    },
];

function fillProducts(products: Product[], count: number) {
    if (products.length === 0) return [];
    return Array.from({ length: count }, (_, index) => products[index % products.length]);
}

export default function DesignToFulfilmentShowcase() {
    const [products, setProducts] = useState<Product[] | null>(null);

    useEffect(() => {
        let mounted = true;

        async function loadProducts() {
            try {
                const response = await fetch("/api/products", { cache: "no-store" });
                const json = await response.json();

                if (mounted) {
                    setProducts(Array.isArray(json.products) ? json.products.slice(0, 6) : []);
                }
            } catch {
                if (mounted) setProducts([]);
            }
        }

        loadProducts();

        return () => {
            mounted = false;
        };
    }, []);

    const visibleProducts = products === null ? Array.from({ length: 3 }) : fillProducts(products, 3);

    return (
        <section className="grid border-y border-neutral-800 bg-neutral-100 text-black lg:grid-cols-[0.95fr_1.1fr_0.95fr]">
            <div className="border-b border-neutral-300 p-6 md:p-8 lg:border-b-0 lg:border-r">
                <h2 className="text-4xl font-black uppercase leading-none md:text-6xl">
                    From design to fulfilment
                </h2>

                <div className="mt-8 grid gap-4">
                    {flow.map((step) => {
                        const Icon = step.icon;

                        return (
                            <div key={step.title} className="grid grid-cols-[44px_1fr] gap-4 border-t border-neutral-300 pt-4">
                                <Icon className="h-7 w-7" />
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-600">
                                        {step.label}. {step.title}
                                    </p>
                                    <p className="mt-1 text-sm text-neutral-700">{step.body}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <Link
                    href="/start"
                    className="mt-8 inline-flex items-center gap-2 bg-black px-5 py-3 text-sm font-black text-white hover:bg-neutral-800"
                >
                    Learn how it works
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>

            <div className="border-b border-neutral-300 bg-black p-6 text-white md:p-8 lg:border-b-0 lg:border-r">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                    Build your first product
                </p>
                <h2 className="mt-2 text-3xl font-black uppercase leading-none md:text-4xl">
                    Product designer preview
                </h2>

                <div className="mt-6 grid gap-4 border border-neutral-800 bg-neutral-950 p-4 md:grid-cols-[90px_1fr_120px]">
                    <div className="space-y-2 text-[10px] font-black uppercase tracking-[0.12em] text-neutral-400">
                        {["Product", "Add text", "Artwork", "Upload", "Layers"].map((item) => (
                            <div key={item} className="border border-neutral-800 px-2 py-2">
                                {item}
                            </div>
                        ))}
                    </div>

                    <div className="relative min-h-[320px] bg-neutral-900">
                        <div className="absolute left-[18%] top-[12%] h-[76%] w-[64%] rounded-t-[42%] bg-neutral-800" />
                        <div className="absolute left-1/2 top-[30%] -translate-x-1/2 text-center text-3xl font-black uppercase leading-none text-red-500">
                            The
                            <br />
                            Seaside
                            <br />
                            Riot
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                                Shirt color
                            </p>
                            <div className="mt-2 flex gap-2">
                                {["#111111", "#ffffff", "#ef4444", "#2563eb"].map((color) => (
                                    <span
                                        key={color}
                                        className="h-6 w-6 rounded-full border border-neutral-600"
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                                Size
                            </p>
                            <div className="mt-2 border border-neutral-700 px-3 py-2 text-sm">M</div>
                        </div>

                        <Link
                            href="/dashboard/products/designer"
                            className="block bg-red-600 px-4 py-3 text-center text-xs font-black text-white hover:bg-red-500"
                        >
                            Save product
                        </Link>
                    </div>
                </div>
            </div>

            <div className="p-6 md:p-8">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-600">
                    Shop the scene
                </p>
                <h2 className="mt-2 text-3xl font-black uppercase leading-none md:text-4xl">
                    Discover artists. Support the next wave.
                </h2>

                <div className="mt-6 grid grid-cols-3 gap-3">
                    {visibleProducts.map((product, index) => {
                        const item = product as Product | undefined;

                        return (
                            <Link
                                key={`${item?.id ?? "loading"}-${index}`}
                                href={item?.slug ? `/product/${item.slug}` : "/new"}
                            >
                                <div className="relative aspect-[3/4] bg-white">
                                    {item?.image ? (
                                        <Image
                                            src={item.image}
                                            alt={item.title ?? "Product"}
                                            fill
                                            sizes="180px"
                                            className="object-contain p-3"
                                        />
                                    ) : (
                                        <div className="h-full w-full animate-pulse bg-neutral-300" />
                                    )}
                                </div>
                                <p className="mt-2 line-clamp-2 text-xs font-black">
                                    {item?.title ?? "Loading"}
                                </p>
                                <p className="text-xs text-neutral-600">
                                    {typeof item?.price === "number" ? `$${item.price}` : ""}
                                </p>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
