"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

type Artist = {
    name: string;
    slug: string;
    image: string;
};

export default function Hero() {
    const [artists, setArtists] = useState<Artist[]>([]);
    const [index, setIndex] = useState(0);

    // 🔌 load artists
    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const res = await fetch("/api/featured", { cache: "no-store" });
                const json = await res.json();

                if (mounted) {
                    setArtists(json.artists || []);
                }
            } catch { }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    // 🔁 rotate every 5s
    useEffect(() => {
        if (artists.length <= 1) return;

        const interval = setInterval(() => {
            setIndex((i) => (i + 1) % artists.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [artists]);

    const artist = artists[index];
    if (!artist) return null;

    return (
        <section className="relative border-b border-neutral-800">
            <div className="grid md:grid-cols-2 min-h-[65vh]">

                {/* IMAGE */}
                <div className="relative order-1 md:order-2">

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
                                className="object-cover"
                                priority
                            />
                        </motion.div>
                    </AnimatePresence>

                    {/* overlay */}
                    <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-transparent to-transparent" />

                    {/* bottom fade */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.6)_100%)]" />

                    {/* star */}
                    <div className="absolute top-6 right-6">
                        <div className="h-16 w-16 rounded-full bg-red-600 grid place-items-center text-white font-black text-xl rotate-[15deg]">
                            ★
                        </div>
                    </div>
                </div>

                {/* TEXT */}
                <div className="relative order-2 md:order-1 flex items-center justify-end p-8 md:p-14">
                    <div className="max-w-xl">

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={artist.name}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.4 }}
                            >

                                <p className="uppercase tracking-[0.3em] text-xs text-red-400">
                                    FEATURED DROP — {artist.name}
                                </p>

                                <h1 className="mt-3 leading-[0.9] text-5xl md:text-7xl font-black">
                                    <GlitchText lines={["MERCH", "FOR", "THE", "SCENE"]} />
                                </h1>

                                <p className="mt-4 text-neutral-300">
                                    Merch for local artists. No upfront cost. No risk.
                                    Built for bands. Backed by fans.
                                </p>

                                <p className="text-xs text-neutral-500 mt-2">
                                    Printed on demand. No waste. Artists get paid.
                                </p>

                                <div className="mt-6 flex gap-3">
                                    <Button asChild>
                                        <a href="/start">Start your drop</a>
                                    </Button>

                                    <Button variant="secondary" asChild>
                                        <a href={`/artists/${artist.slug}`}>
                                            Shop {artist.name}
                                        </a>
                                    </Button>
                                </div>

                            </motion.div>
                        </AnimatePresence>

                        {/* DOTS */}
                        {artists.length > 1 && (
                            <div className="mt-4 flex gap-2">
                                {artists.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 w-6 rounded-full transition ${i === index
                                            ? "bg-red-500"
                                            : "bg-neutral-700"
                                            }`}
                                    />
                                ))}
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* skew */}
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