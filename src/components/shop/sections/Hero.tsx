"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Shirt } from "lucide-react";

type Artist = {
    name: string;
    slug: string;
    image: string;
};

type Product = {
    id?: string;
    title?: string;
    slug?: string;
    image?: string | null;
    price?: number;
    badge?: string | null;
};

const YOUTUBE_VIDEO_ID = "Z7TXlvknhCQ";
const YOUTUBE_EMBED_SRC = `https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&loop=1&playlist=${YOUTUBE_VIDEO_ID}&playsinline=1`;

const HERO_PRODUCT_BACKDROPS: CSSProperties[] = [
    {
        backgroundImage:
            "linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.58)), url('https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80')",
        backgroundPosition: "center",
        backgroundSize: "cover",
    },
    {
        backgroundImage:
            "linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.62)), url('https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=80')",
        backgroundPosition: "center",
        backgroundSize: "cover",
    },
    {
        backgroundImage:
            "linear-gradient(180deg, rgba(0,0,0,0.06), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80')",
        backgroundPosition: "center",
        backgroundSize: "cover",
    },
    {
        backgroundImage:
            "linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.64)), url('https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80')",
        backgroundPosition: "center",
        backgroundSize: "cover",
    },
];

export default function Hero() {
    const [artists, setArtists] = useState<Artist[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [index, setIndex] = useState(0);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const [featuredRes, productsRes] = await Promise.all([
                    fetch("/api/featured", { cache: "no-store" }),
                    fetch("/api/products/random", { cache: "no-store" }),
                ]);
                const [featuredJson, productsJson] = await Promise.all([
                    featuredRes.json(),
                    productsRes.json(),
                ]);

                if (mounted) {
                    setArtists(featuredJson.artists || []);
                    setProducts(Array.isArray(productsJson.products) ? productsJson.products.slice(0, 4) : []);
                }
            } catch { }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (artists.length <= 1) return;

        const interval = setInterval(() => {
            setIndex((i) => (i + 1) % artists.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [artists]);

    const artist = artists[index];
    const merchProducts: Array<Product | undefined> = products.length > 0
        ? Array.from({ length: 4 }, (_, productIndex) => products[productIndex % products.length])
        : Array.from({ length: 4 }, () => undefined);

    if (!artist) {
        return (
            <section className="relative border-b border-neutral-800 bg-black p-3 text-white md:p-4">
                <div className="grid min-h-[70vh] animate-pulse gap-3 lg:grid-cols-[1.1fr_0.8fr_0.9fr]">
                    <div className="bg-neutral-900" />
                    <div className="bg-neutral-900" />
                    <div className="bg-neutral-900" />
                </div>
            </section>
        );
    }

    return (
        <section className="relative border-b border-neutral-800 bg-black p-3 text-white md:p-4">
            <div className="grid min-h-[70vh] gap-3 lg:grid-cols-[1.1fr_0.82fr_0.9fr]">
                <div className="group relative min-h-[560px] overflow-hidden border border-neutral-800 bg-neutral-950 lg:min-h-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={artist.image}
                            initial={{ opacity: 0, scale: 1.02 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6 }}
                            className="absolute inset-0"
                        >
                            <Image
                                src={artist.image}
                                alt={artist.name}
                                fill
                                sizes="(max-width: 1024px) 100vw, 42vw"
                                className="object-cover transition duration-700 group-hover:scale-105"
                                priority
                            />
                        </motion.div>
                    </AnimatePresence>

                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(239,68,68,0.2),transparent_28%)]" />

                    <div className="absolute right-5 top-5">
                        <div className="grid h-14 w-14 rotate-[15deg] place-items-center rounded-full bg-red-600 text-xl font-black text-white">
                            *
                        </div>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={artist.name}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.4 }}
                            >
                                <p className="inline-flex bg-red-600 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em]">
                                    Unsigned drop live
                                </p>

                                <h1 className="mt-5 max-w-3xl text-5xl font-black uppercase leading-[0.85] md:text-7xl">
                                    <GlitchText
                                        lines={artist.name.toUpperCase().split(" ")}
                                    />
                                </h1>

                                <h2 className="mt-4 text-xl font-black uppercase leading-none text-neutral-100 md:text-3xl">
                                    DISCOVER BANDS EARLY. WEAR THE SCENE.
                                </h2>

                                <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-300 md:text-base">
                                    A merch table for unsigned artists, local scenes, and fans
                                    who want to back the band before the room is full.
                                </p>

                                <div className="mt-6 flex flex-wrap gap-3">
                                    <Button asChild>
                                        <Link href="/category/tees">Shop new drops</Link>
                                    </Button>

                                    <Button variant="secondary" asChild>
                                        <a href={`/artists/${artist.slug}`}>
                                            Shop {artist.name}
                                        </a>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="border-white bg-white text-neutral-950 hover:bg-red-600 hover:text-white"
                                        asChild
                                    >
                                        <a href="/start">Start your drop</a>
                                    </Button>
                                </div>

                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                <div className="grid min-h-[520px] grid-rows-[auto_1fr_auto] border border-neutral-800 bg-neutral-950 lg:min-h-0">
                    <div className="border-b border-neutral-800 p-5">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-400">
                            Fresh merch
                        </p>
                        <h2 className="mt-2 text-3xl font-black uppercase leading-none">
                            Live from the table.
                        </h2>
                    </div>

                    <div className="grid grid-cols-2">
                        {merchProducts.map((item, productIndex) => {
                            return (
                                <Link
                                    key={`${item?.id ?? "hero-product"}-${productIndex}`}
                                    href={item?.slug ? `/product/${item.slug}` : "/new"}
                                    className="group grid grid-rows-[1fr_auto] border-b border-r border-neutral-800 bg-neutral-950 text-black transition hover:bg-neutral-900"
                                >
                                    <div
                                        className="relative isolate min-h-[170px] overflow-hidden"
                                        style={HERO_PRODUCT_BACKDROPS[productIndex % HERO_PRODUCT_BACKDROPS.length]}
                                    >
                                        <div className="absolute inset-0 bg-black/28" />
                                        <div className="absolute inset-8 bg-white/70 shadow-[0_18px_40px_rgba(0,0,0,0.42)] backdrop-blur-[1px]" />
                                        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.18)_0_1px,transparent_1px_18px)] opacity-25" />
                                        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
                                        {item?.image ? (
                                            <Image
                                                src={item.image}
                                                alt={item.title ?? "Product"}
                                                fill
                                                sizes="(max-width: 1024px) 50vw, 13vw"
                                                className="relative z-10 object-contain p-4 drop-shadow-[0_22px_18px_rgba(0,0,0,0.42)] transition duration-500 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="grid h-full w-full place-items-center text-white/60">
                                                <Shirt className="h-8 w-8" />
                                            </div>
                                        )}
                                        {productIndex === 0 && (
                                            <span className="absolute left-3 top-3 bg-red-600 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                                                Counter pick
                                            </span>
                                        )}
                                    </div>
                                    <div className="border-t border-neutral-200 bg-black p-3 text-white">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-600">
                                            {item?.badge ?? "Latest drop"}
                                        </p>
                                        <p className="mt-2 line-clamp-2 min-h-[2.25rem] text-sm font-black leading-tight">
                                            {item?.title ?? "Drop loading"}
                                        </p>
                                        <div className="mt-3 flex items-center justify-between gap-3">
                                            <p className="text-sm font-black">
                                                {typeof item?.price === "number" ? `$${item.price}` : "Live soon"}
                                            </p>
                                            <ArrowRight className="h-4 w-4 text-red-600 transition group-hover:translate-x-1" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-3 border-t border-neutral-800">
                        {[
                            ["No stock", "made after sale"],
                            ["Fan credit", "earned on buys"],
                            ["Artist paid", "per order"],
                        ].map(([label, detail]) => (
                            <div key={label} className="border-r border-neutral-800 p-3 text-center last:border-r-0">
                                <p className="text-xs font-black">{label}</p>
                                <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-neutral-500">{detail}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="group relative min-h-[520px] overflow-hidden border border-neutral-800 bg-black lg:min-h-0">
                    <div className="absolute inset-0">
                        <iframe
                            src={YOUTUBE_EMBED_SRC}
                            title="Merch Tent production preview"
                            className="absolute left-1/2 top-1/2 h-[120%] w-[214%] -translate-x-1/2 -translate-y-1/2 transition duration-700 group-hover:scale-105 md:h-[115%] md:w-[205%]"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/15" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_18%,rgba(239,68,68,0.24),transparent_28%)]" />

                    <div className="relative z-10 flex h-full min-h-[520px] flex-col justify-between p-5 lg:min-h-[70vh]">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-400">
                                    Production engine
                                </p>
                                <h2 className="mt-2 text-3xl font-black uppercase leading-none md:text-4xl">
                                    Design it. Sell it. Fulfil after sale.
                                </h2>
                            </div>
                            <div className="grid h-11 w-11 place-items-center rounded-full bg-red-600 text-white">
                                <Play className="h-5 w-5 fill-current" />
                            </div>
                        </div>

                        <div>
                            <p className="max-w-sm text-sm font-bold leading-6 text-neutral-200">
                            Artists create the product here, publish the mockups straight to the store, then fulfil from
                            saved design data when a fan buys.
                            </p>
                            <Link
                                href="/auth/sign-up?type=artist"
                                className="mt-5 inline-flex w-fit items-center gap-2 bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-500"
                            >
                                Start as an artist
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {artists.length > 1 && (
                <div className="flex justify-center gap-2 border-x border-b border-neutral-800 py-3">
                    {artists.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            aria-label={`Show featured artist ${i + 1}`}
                            onClick={() => setIndex(i)}
                            className={`h-1.5 w-8 transition ${i === index
                                ? "bg-red-500"
                                : "bg-neutral-700 hover:bg-neutral-500"
                                }`}
                        />
                    ))}
                </div>
            )}

            <div className="relative h-6 overflow-hidden">
                <div className="absolute inset-0 -skew-y-3 bg-neutral-950 border-b border-neutral-800" />
            </div>
        </section>
    );
}

function GlitchText({ lines }: { lines: string[] }) {
    return (
        <div className="relative leading-[0.9] font-black select-none">
            {lines.map((t, i) => (
                <div key={i} className="relative inline-block mr-4 last:mr-0">
                    <motion.span
                        aria-hidden
                        className="absolute left-0 top-0 blur-[1px] opacity-50 text-red-500"
                        animate={{ x: [0, 2, -1, 0], y: [0, -1, 1, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "linear", delay: i * 0.12 }}
                    >
                        {t}
                    </motion.span>

                    <motion.span
                        aria-hidden
                        className="absolute left-0 top-0 blur-[0.5px] opacity-40 text-cyan-400"
                        animate={{ x: [0, -2, 1, 0], y: [0, 1, -1, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "linear", delay: i * 0.2 }}
                    >
                        {t}
                    </motion.span>

                    <span className="relative">{t}</span>
                </div>
            ))}
        </div>
    );
}
