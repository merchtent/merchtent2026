"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Search } from "lucide-react";
import type { CatalogProduct } from "@/lib/product-catalog";
import { getMockupTemplate } from "@/lib/products/mockup-templates";

function formatMoney(cents: number) {
    return new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
        minimumFractionDigits: 2,
    }).format(cents / 100);
}

function productDescription(product: CatalogProduct) {
    if (product.category === "tees") {
        return "A soft, everyday unisex tee made for merch tables, live drops and repeat wear.";
    }

    if (product.category === "hoodies") {
        return "A comfortable unisex hoodie with room for bold artwork and cold-night shows.";
    }

    return `A ready-to-customise ${product.name.toLowerCase()} for your next merch drop.`;
}

function friendlyPlacement(placement: string) {
    return placement.replace(/ side$/i, "").replace(/ inner$/i, "");
}

function CatalogProductPreview({ product }: { product: CatalogProduct }) {
    const front = getMockupTemplate(product, "#111111", "front");
    const back = getMockupTemplate(product, "#111111", "back");

    return (
        <div className="relative aspect-[4/5] overflow-hidden bg-white">
            {front ? (
                <>
                    <Image
                        src={front.publicPath}
                        alt={`${product.name} black tee, front view`}
                        fill
                        sizes="220px"
                        className="object-contain"
                    />
                    <span className="absolute bottom-3 left-3 bg-black px-2 py-1 text-[10px] font-black uppercase text-white">
                        Front
                    </span>
                    {back ? (
                        <div className="absolute bottom-3 right-3 h-24 w-20 border border-neutral-300 bg-white shadow-lg">
                            <Image
                                src={back.publicPath}
                                alt={`${product.name} black tee, back view`}
                                fill
                                sizes="80px"
                                className="object-contain"
                            />
                            <span className="absolute bottom-0 right-0 bg-black px-1.5 py-0.5 text-[9px] font-black uppercase text-white">
                                Back
                            </span>
                        </div>
                    ) : null}
                </>
            ) : (
                <>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(239,68,68,0.35),transparent_28%),linear-gradient(135deg,#f8fafc,#d4d4d4)]" />
                    <div className="absolute left-1/2 top-1/2 h-56 w-40 -translate-x-1/2 -translate-y-1/2 rounded-t-[42px] bg-white shadow-2xl">
                        <div className="absolute left-1/2 top-2 h-12 w-20 -translate-x-1/2 rounded-b-full border-b border-neutral-300 bg-neutral-100" />
                        <div className="absolute -left-12 top-16 h-28 w-16 rotate-[-24deg] bg-white" />
                        <div className="absolute -right-12 top-16 h-28 w-16 rotate-[24deg] bg-white" />
                    </div>
                </>
            )}
            <span className="absolute left-3 top-3 bg-lime-300 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-black">
                {product.category}
            </span>
        </div>
    );
}

export default function CatalogChooser({ products }: { products: CatalogProduct[] }) {
    return (
        <div>
            <section className="border border-neutral-800 bg-neutral-950">
                <div className="grid gap-6 border-b border-neutral-800 p-5 md:grid-cols-[1fr_360px] md:p-8">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-500">
                            Catalogue
                        </p>
                        <h2 className="mt-3 text-3xl font-black uppercase leading-none md:text-5xl">
                            Pick your product.
                        </h2>
                        <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-400">
                            Compare the fit, colours, sizes, retail price and your profit. Choose one to start
                            adding your artwork.
                        </p>
                    </div>
                    <label className="flex h-12 items-center gap-3 border border-neutral-800 bg-black px-4 text-sm text-neutral-400">
                        <Search className="h-4 w-4 text-red-500" />
                        <input
                            disabled
                            placeholder="Search coming as the catalogue grows"
                            className="w-full bg-transparent outline-none placeholder:text-neutral-600"
                        />
                    </label>
                </div>

                {products.length === 0 ? (
                    <div className="p-5 md:p-8">
                        <div className="border border-red-900/60 bg-red-950/20 p-6">
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#b7ff3c]">
                                No approved blanks
                            </p>
                            <h3 className="mt-2 text-2xl font-black uppercase">
                                No products are ready yet.
                            </h3>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-red-100/80">
                                There are no products available to design right now. Check back soon.
                            </p>
                        </div>
                    </div>
                ) : (
                <div className="grid divide-y divide-neutral-800 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                    {products.map((product) => (
                        <Link
                            key={product.key}
                            href={`/dashboard/products/designer/${product.key}`}
                            className="group grid gap-5 p-5 transition hover:bg-neutral-900/60 md:grid-cols-[220px_1fr] md:p-8"
                        >
                            <CatalogProductPreview product={product} />

                            <div className="flex min-w-0 flex-col justify-between">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-500">
                                        {product.brand} / {product.model}
                                    </p>
                                    <h3 className="mt-2 text-2xl font-black uppercase leading-tight">
                                        {product.name}
                                    </h3>
                                    <p className="mt-3 text-sm leading-6 text-neutral-400">
                                        {productDescription(product)}
                                    </p>
                                </div>

                                <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-neutral-400">
                                    <div className="border border-neutral-800 bg-black p-3">
                                        <b className="block text-white">RRP</b>
                                        ${product.defaultPrice}
                                    </div>
                                    <div className="border border-neutral-800 bg-black p-3">
                                        <b className="block text-white">Band profit / sale*</b>
                                        {product.production.artistProfitCents !== undefined
                                            ? formatMoney(product.production.artistProfitCents)
                                            : "To be confirmed"}
                                    </div>
                                </div>

                                <div className="mt-5 border-t border-neutral-800 pt-5">
                                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-neutral-400">
                                        <p>
                                            <b className="text-white">Print:</b> {product.production.method}
                                        </p>
                                        <p>
                                            <b className="text-white">Print areas:</b>{" "}
                                            {product.production.placements.map(friendlyPlacement).join(", ")}
                                        </p>
                                    </div>

                                    <div className="mt-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                                            Sizes
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {product.sizes.map((size) => (
                                                <span key={size} className="border border-neutral-700 px-2 py-1 text-[11px] font-bold text-neutral-200">
                                                    {size}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                                            Colours ({product.colors.length})
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {product.colors.map((color) => (
                                                <span
                                                    key={color.label}
                                                    title={color.label}
                                                    aria-label={color.label}
                                                    className="h-6 w-6 border border-neutral-600"
                                                    style={{ backgroundColor: color.value }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <span className="mt-6 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-[#b7ff3c]">
                                    Start designing <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                                </span>
                            </div>
                        </Link>
                    ))}
                    <p className="p-5 text-xs leading-5 text-neutral-500 lg:col-span-2 md:px-8">
                        *Profit shown is based on the current product setup. Your final profit may change with
                        product options and print choices.
                    </p>
                </div>
                )}
            </section>
        </div>
    );
}
