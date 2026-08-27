"use client";
import teeCat from "@/images/category_tee.png";
import hoodieCat from "@/images/category_hoodie.png";
import tankCat from "@/images/category_tank.png";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const collections = [
    {
        title: "Tees",
        meta: "band tees // drop staples // front print",
        sub: "Fresh tour designs",
        image: teeCat,
        href: "/category/tees",
    },
    {
        title: "Hoodies",
        meta: "heavyweight // cold nights // loud backs",
        sub: "Heavyweight and warm",
        image: hoodieCat,
        href: "/category/hoodies",
    },
    {
        title: "Tank Tops",
        meta: "summer shows // pit ready // cut sleeves",
        sub: "Cut for the pit",
        image: tankCat,
        href: "/category/tanks",
    },
];

export default function ShopByCollection() {
    return (
        <section className="border-y border-neutral-800 bg-black text-white">
            <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10 lg:px-8">
                <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                            Shop by collection
                        </p>
                        <h2 className="mt-2 text-3xl font-black uppercase leading-none md:text-5xl">
                            Pick your rack.
                        </h2>
                    </div>
                    <p className="max-w-md text-sm leading-6 text-neutral-400">
                        Fast lanes for the pieces fans already understand: tees, hoodies, and tanks built for drops.
                    </p>
                </div>
            </div>

            <div className="grid border-t border-neutral-800 md:grid-cols-3">
                {collections.map((collection) => (
                    <Link
                        key={collection.title}
                        href={collection.href}
                        className="group relative min-h-[300px] overflow-hidden border-b border-neutral-800 md:min-h-[390px] md:border-r"
                    >
                        <Image
                            src={collection.image}
                            alt={collection.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover opacity-70 grayscale transition duration-700 group-hover:scale-105 group-hover:opacity-90 group-hover:grayscale-0"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
                        <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-400">
                                [ {collection.meta} ]
                            </p>
                            <h3 className="mt-3 text-4xl font-black uppercase leading-none md:text-5xl">
                                {collection.title}
                            </h3>
                            <p className="mt-2 text-sm font-bold text-neutral-200">
                                {collection.sub}
                            </p>
                            <span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-red-400">
                                Shop now
                                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                            </span>
                        </div>
                        <div className="absolute right-4 top-4 bg-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                            Category
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
