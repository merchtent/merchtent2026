"use client";

import Link from "next/link";
import { ArrowRight, Boxes, Factory, Search, Shirt, Sparkles } from "lucide-react";
import type { CatalogProduct } from "@/lib/product-catalog";

const categories = [
    { label: "T-shirts", description: "First-drop staples", icon: Shirt },
    { label: "Hoodies", description: "Cold-night merch", icon: Boxes },
    { label: "Posters", description: "Wall and table stock", icon: Sparkles },
    { label: "Local supply", description: "Hand-picked partners", icon: Factory },
];

export default function CatalogChooser({ products }: { products: CatalogProduct[] }) {
    return (
        <div className="space-y-8">
            <section className="grid gap-3 md:grid-cols-4">
                {categories.map((category) => {
                    const Icon = category.icon;
                    return (
                        <div key={category.label} className="border border-neutral-800 bg-neutral-950 p-4">
                            <Icon className="h-5 w-5 text-red-500" />
                            <h2 className="mt-4 text-lg font-black uppercase">{category.label}</h2>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                                {category.description}
                            </p>
                        </div>
                    );
                })}
            </section>

            <section className="border border-neutral-800 bg-neutral-950">
                <div className="grid gap-6 border-b border-neutral-800 p-5 md:grid-cols-[1fr_360px] md:p-8">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-500">
                            Catalogue
                        </p>
                        <h2 className="mt-3 text-3xl font-black uppercase leading-none md:text-5xl">
                            Choose the blank before the artwork.
                        </h2>
                        <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-400">
                            Merch Tent products start from an internal catalogue, not a one-off manual listing.
                            Each blank carries supplier, fulfilment, print area, size and colour metadata through to
                            the designer and later order automation.
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
                                Catalogue products need to be imported first.
                            </h3>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-red-100/80">
                                Ask an admin to approve a supplier product from the Supplier Catalog before artists
                                can open the designer.
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
                            <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(239,68,68,0.35),transparent_28%),linear-gradient(135deg,#f8fafc,#d4d4d4)]" />
                                <div className="absolute left-1/2 top-1/2 h-56 w-40 -translate-x-1/2 -translate-y-1/2 rounded-t-[42px] bg-white shadow-2xl">
                                    <div className="absolute left-1/2 top-2 h-12 w-20 -translate-x-1/2 rounded-b-full border-b border-neutral-300 bg-neutral-100" />
                                    <div className="absolute -left-12 top-16 h-28 w-16 rotate-[-24deg] bg-white" />
                                    <div className="absolute -right-12 top-16 h-28 w-16 rotate-[24deg] bg-white" />
                                </div>
                                <span className="absolute left-3 top-3 bg-lime-300 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-black">
                                    {product.supplier.name}
                                </span>
                            </div>

                            <div className="flex min-w-0 flex-col justify-between">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-500">
                                        {product.brand} / {product.model}
                                    </p>
                                    <h3 className="mt-2 text-2xl font-black uppercase leading-tight">
                                        {product.name}
                                    </h3>
                                    <p className="mt-3 text-sm leading-6 text-neutral-400">
                                        {product.production.method} blank with {product.sizes.length} size options,
                                        {` ${product.colors.length}`} launch colours, and supplier metadata saved for
                                        create-on-sale fulfilment.
                                    </p>
                                </div>

                                <div className="mt-6 grid gap-3 text-xs text-neutral-400 sm:grid-cols-3">
                                    <div className="border border-neutral-800 bg-black p-3">
                                        <b className="block text-white">Supplier</b>
                                        {product.supplier.name}
                                    </div>
                                    <div className="border border-neutral-800 bg-black p-3">
                                        <b className="block text-white">Automation</b>
                                        On first sale
                                    </div>
                                    <div className="border border-neutral-800 bg-black p-3">
                                        <b className="block text-white">From</b>
                                        ${product.defaultPrice}
                                    </div>
                                </div>

                                <span className="mt-6 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-[#b7ff3c]">
                                    Start designing <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
                )}
            </section>
        </div>
    );
}
