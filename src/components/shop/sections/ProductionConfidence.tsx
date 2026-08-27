"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CreditCard, MousePointer2, PackageCheck, Shirt, Store } from "lucide-react";

type Product = {
    id?: string;
    title?: string;
    slug?: string;
    image?: string | null;
    price?: number;
    badge?: string | null;
};

const trustSignals = [
    "Artist accounts",
    "Browser product designer",
    "Mockups generated on publish",
    "Shop listing created",
    "Production data saved",
    "Fulfil when sold",
    "Artist reporting",
    "Payout-ready workflow",
];

const timeline = [
    {
        label: "01",
        title: "Sign up as an artist",
        body: "Create an artist profile, add your identity, and get a proper home for your drops.",
        icon: BadgeCheck,
    },
    {
        label: "02",
        title: "Make the product",
        body: "Pick a blank, place artwork and text, then save the exact design data needed later.",
        icon: MousePointer2,
    },
    {
        label: "03",
        title: "List it instantly",
        body: "Merch Tent generates mockups and turns the design into a shoppable product page.",
        icon: Store,
    },
    {
        label: "04",
        title: "Sell before stock",
        body: "Fans buy the drop first, so artists can launch without ordering boxes upfront.",
        icon: CreditCard,
    },
    {
        label: "05",
        title: "Produce and fulfil",
        body: "The order keeps the print-ready design data, fulfilment status, and artist reporting together.",
        icon: PackageCheck,
    },
];

export default function ProductionConfidence() {
    const [product, setProduct] = useState<Product | null>(null);

    useEffect(() => {
        let mounted = true;

        async function loadProduct() {
            try {
                const response = await fetch("/api/products/random", { cache: "no-store" });
                const json = await response.json();
                const products = Array.isArray(json.products) ? (json.products as Product[]) : [];

                if (mounted) {
                    setProduct(products[0] ?? null);
                }
            } catch {
                if (mounted) setProduct(null);
            }
        }

        loadProduct();

        return () => {
            mounted = false;
        };
    }, []);

    return (
        <section className="border-y border-neutral-800 bg-neutral-950 text-white">
            <div className="overflow-hidden border-b border-neutral-800 bg-black">
                <div className="flex min-w-max animate-[marquee_42s_linear_infinite] gap-8 py-3 text-[11px] font-black uppercase tracking-[0.22em]">
                    {[...trustSignals, ...trustSignals].map((signal, index) => (
                        <span key={`${signal}-${index}`} className={index % 2 === 0 ? "text-red-400" : "text-white"}>
                            [ {signal} ]
                        </span>
                    ))}
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:px-8 lg:py-14">
                <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                            Artist launch path
                        </p>
                        <h2 className="mt-3 max-w-2xl text-4xl font-black leading-none md:text-6xl">
                            From first upload to live merch.
                        </h2>
                    </div>
                    <p className="max-w-2xl text-sm leading-6 text-neutral-400 md:text-base">
                        Merch Tent gives artists the simple path: sign up, design the product, publish the mockups,
                        sell it to fans, then use the saved production data to fulfil the order when it actually sells.
                    </p>
                </div>

                <div className="mt-8 grid gap-0 border border-neutral-800 bg-black lg:grid-cols-[repeat(5,minmax(0,1fr))_1.35fr]">
                    {timeline.map((step) => {
                        const Icon = step.icon;

                        return (
                            <div key={step.title} className="border-b border-neutral-800 p-4 md:p-5 lg:border-b-0 lg:border-r">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-neutral-500">
                                        {step.label}
                                    </p>
                                    <Icon className="h-5 w-5 text-red-400" />
                                </div>
                                <h3 className="mt-5 text-xl font-black leading-tight">
                                    {step.title}
                                </h3>
                                <p className="mt-3 text-sm leading-6 text-neutral-400">
                                    {step.body}
                                </p>
                            </div>
                        );
                    })}

                    <ProductPreview product={product} />
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                        href="/dashboard/products/designer"
                        className="inline-flex items-center gap-2 rounded-md bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-500"
                    >
                        Start a drop
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                        href="/start"
                        className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-5 py-3 text-sm font-black hover:border-red-400"
                    >
                        How artists launch
                    </Link>
                </div>
            </div>
        </section>
    );
}

function ProductPreview({ product }: { product: Product | null }) {
    return (
        <div className="bg-neutral-950 p-4 md:p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-400">
                Live listing
            </p>

            <Link
                href={product?.slug ? `/product/${product.slug}` : "/new"}
                className="group mt-4 block overflow-hidden border border-neutral-800 bg-black transition hover:border-red-500"
            >
                <div className="relative aspect-[4/5] bg-neutral-100">
                    {product?.image ? (
                        <Image
                            src={product.image}
                            alt={product.title ?? "Merch product"}
                            fill
                            sizes="(max-width: 1024px) 100vw, 22vw"
                            className="object-contain p-8 transition duration-700 group-hover:scale-105"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-500">
                            <Shirt className="h-10 w-10" />
                        </div>
                    )}
                    <span className="absolute left-3 top-3 bg-red-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white">
                        {product?.badge ?? "Mockup live"}
                    </span>
                </div>

                <div className="border-t border-neutral-800 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
                        [ store ready {"//"} fulfil later ]
                    </p>
                    <h3 className="mt-2 line-clamp-2 text-sm font-black leading-tight">
                        {product?.title ?? "Your first artist drop"}
                    </h3>
                    <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-black">
                            {typeof product?.price === "number" ? `$${product.price.toFixed(2)}` : "Set price"}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-400">
                            View
                            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                        </span>
                    </div>
                </div>
            </Link>
        </div>
    );
}
