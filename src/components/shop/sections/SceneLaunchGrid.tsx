"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const tiles = [
    {
        title: "Artist Drops",
        meta: "tees // hoodies // posters // no stock risk",
        cta: "Start building",
        href: "/dashboard/products/designer",
        image: "https://images.unsplash.com/photo-1521334884684-d80222895322?auto=format&fit=crop&w=1400&q=80",
        className: "md:col-span-3 md:min-h-[330px]",
    },
    {
        title: "Fan Rewards",
        meta: "credits // repeat fans // purchase history",
        cta: "Create account",
        href: "/auth/sign-up",
        image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1400&q=80",
        className: "md:col-span-3 md:min-h-[330px]",
    },
    {
        title: "Tour Table",
        meta: "drops // bundles // city-specific merch",
        cta: "Shop live",
        href: "/new",
        image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
        className: "md:col-span-2 md:min-h-[260px]",
    },
    {
        title: "Design Studio",
        meta: "place artwork // save production data",
        cta: "Open designer",
        href: "/dashboard/products/designer",
        image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
        className: "md:col-span-2 md:min-h-[260px]",
    },
    {
        title: "Scene Packs",
        meta: "stickers // tees // posters // bundles",
        cta: "Build packs",
        href: "/category/tees",
        image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80",
        className: "md:col-span-2 md:min-h-[260px]",
    },
];

export default function SceneLaunchGrid() {
    return (
        <section className="bg-black text-white">
            <div className="border-y border-neutral-800">
                <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-7 md:px-6 lg:px-8">
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                        What can go live
                    </p>
                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <h2 className="max-w-3xl text-4xl font-black leading-none md:text-5xl">
                            A merch platform for the whole scene.
                        </h2>
                        <p className="max-w-md text-sm leading-6 text-neutral-400">
                            Inspired by the custom-print world, but aimed at artists, fans, drops and direct support.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid border-b border-neutral-800 md:grid-cols-6">
                {tiles.map((tile) => (
                    <Link
                        key={tile.title}
                        href={tile.href}
                        className={`group relative min-h-[240px] overflow-hidden border-b border-neutral-800 md:border-r ${tile.className}`}
                    >
                        <Image
                            src={tile.image}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover opacity-60 grayscale transition duration-700 group-hover:scale-105 group-hover:opacity-80 group-hover:grayscale-0"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
                        <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-400">
                                [ {tile.meta} ]
                            </p>
                            <h3 className="mt-3 text-3xl font-black uppercase leading-none tracking-normal md:text-4xl">
                                {tile.title}
                            </h3>
                            <span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-red-400">
                                {tile.cta}
                                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
