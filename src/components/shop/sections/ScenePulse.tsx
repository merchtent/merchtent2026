"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, Radio, Shirt, Sparkles, Users } from "lucide-react";

type Artist = {
    id?: string;
    name?: string;
    slug?: string;
    image?: string | null;
};

type Product = {
    id?: string;
    title?: string;
    slug?: string;
    image?: string | null;
    price?: number;
};

type SceneState = {
    artists: Artist[];
    products: Product[];
    loading: boolean;
};

const signals = [
    {
        icon: Radio,
        label: "Unsigned-first discovery",
        detail: "Drops are built around artists, not anonymous inventory.",
    },
    {
        icon: Shirt,
        label: "Made after it sells",
        detail: "Artists can publish without boxes of unsold stock.",
    },
    {
        icon: Users,
        label: "Fans become backers",
        detail: "Purchases, shouts, credits, and repeat support all matter.",
    },
];

export default function ScenePulse() {
    const [{ artists, products, loading }, setSceneState] = useState<SceneState>({
        artists: [],
        products: [],
        loading: true,
    });

    useEffect(() => {
        let mounted = true;

        async function loadScene() {
            try {
                const [artistsRes, productsRes] = await Promise.all([
                    fetch("/api/artists", { cache: "no-store" }),
                    fetch("/api/products/tees", { cache: "no-store" }),
                ]);

                const [artistsJson, productsJson] = await Promise.all([
                    artistsRes.json(),
                    productsRes.json(),
                ]);

                if (!mounted) return;

                setSceneState({
                    artists: Array.isArray(artistsJson.artists) ? artistsJson.artists.slice(0, 8) : [],
                    products: Array.isArray(productsJson.products) ? productsJson.products.slice(0, 6) : [],
                    loading: false,
                });
            } catch {
                if (mounted) {
                    setSceneState({ artists: [], products: [], loading: false });
                }
            }
        }

        loadScene();

        return () => {
            mounted = false;
        };
    }, []);

    const artistNames = useMemo(
        () => artists.map((artist) => artist.name).filter(Boolean) as string[],
        [artists]
    );

    return (
        <section className="relative overflow-hidden border-b border-neutral-800 bg-neutral-950 text-white">
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
                <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-10 items-stretch">
                    <div className="min-h-[360px] flex flex-col justify-between border border-neutral-800 bg-black p-5 md:p-7 rounded-lg">
                        <div>
                            <div className="inline-flex items-center gap-2 border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-red-300">
                                <Sparkles className="h-3.5 w-3.5" />
                                Scene signal
                            </div>

                            <h2 className="mt-5 max-w-3xl text-4xl md:text-6xl font-black leading-[0.9]">
                                Discover bands early. Wear the scene.
                            </h2>

                            <p className="mt-5 max-w-2xl text-base md:text-lg text-neutral-300">
                                Merch Tent should feel like the table outside the venue: loud, close, a bit improvised,
                                and full of artists worth backing before everyone else catches on.
                            </p>
                        </div>

                        <div className="mt-8 grid sm:grid-cols-3 gap-3">
                            {signals.map((signal) => {
                                const Icon = signal.icon;

                                return (
                                    <div key={signal.label} className="border border-neutral-800 bg-neutral-950 p-4 rounded-md">
                                        <Icon className="h-5 w-5 text-red-400" />
                                        <p className="mt-3 text-sm font-bold">{signal.label}</p>
                                        <p className="mt-1 text-xs leading-relaxed text-neutral-400">{signal.detail}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid gap-4">
                        <div className="border border-neutral-800 bg-neutral-900 rounded-lg p-5">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Live rack</p>
                                    <h3 className="mt-1 text-2xl font-black">Fresh tee drops</h3>
                                </div>
                                <Link href="/category/tees" className="inline-flex items-center gap-1 text-sm font-bold text-red-300 hover:text-red-200">
                                    Shop tees <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>

                            <div className="mt-5 grid grid-cols-3 gap-2">
                                {loading
                                    ? Array.from({ length: 6 }).map((_, index) => (
                                        <div key={index} className="aspect-[3/4] animate-pulse rounded-md bg-neutral-800" />
                                    ))
                                    : products.map((product) => (
                                        <Link
                                            key={product.id ?? product.slug}
                                            href={product.slug ? `/product/${product.slug}` : "/category/tees"}
                                            className="group relative aspect-[3/4] overflow-hidden rounded-md bg-neutral-800"
                                        >
                                            {product.image ? (
                                                <Image
                                                    src={product.image}
                                                    alt={product.title ?? "Merch drop"}
                                                    fill
                                                    sizes="(max-width: 1024px) 30vw, 12vw"
                                                    className="object-cover transition duration-500 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="h-full w-full bg-neutral-800" />
                                            )}
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                                <p className="line-clamp-2 text-[11px] font-bold leading-tight">
                                                    {product.title ?? "New merch"}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                            </div>
                        </div>

                        <div className="border border-neutral-800 bg-neutral-900 rounded-lg p-5">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Now boarding</p>
                                    <h3 className="mt-1 text-2xl font-black">Artist roll call</h3>
                                </div>
                                <BadgeCheck className="h-6 w-6 text-red-400" />
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {loading
                                    ? Array.from({ length: 8 }).map((_, index) => (
                                        <span key={index} className="h-8 w-24 animate-pulse rounded-full bg-neutral-800" />
                                    ))
                                    : artistNames.map((name) => (
                                        <span
                                            key={name}
                                            className="rounded-full border border-neutral-700 bg-black px-3 py-1.5 text-sm font-semibold text-neutral-200"
                                        >
                                            {name}
                                        </span>
                                    ))}
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-neutral-300">
                                <Link href="/start" className="border border-neutral-700 bg-black px-4 py-3 font-bold hover:border-red-400 rounded-md">
                                    Start an artist drop
                                </Link>
                                <Link href="/artists" className="border border-neutral-700 bg-black px-4 py-3 font-bold hover:border-red-400 rounded-md">
                                    Browse artists
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
