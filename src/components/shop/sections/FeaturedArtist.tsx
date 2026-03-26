"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Product = {
    id: string;
    title: string;
    price: number;
    image: string;
    slug: string;
};

type Artist = {
    id: string;
    name: string;
    slug: string;
    image: string;
};

export default function FeaturedArtist() {
    const [artist, setArtist] = useState<Artist | null>(null);
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                // 👉 You can later swap this to /api/artists/featured
                const res = await fetch("/api/artists", { cache: "no-store" });
                const json = await res.json();

                const a = json.artists?.[0];

                if (!a) return;

                if (mounted) {
                    setArtist(a);

                    // 👉 fetch their products
                    const pres = await fetch(`/api/products?artist=${a.slug}`);
                    const pjson = await pres.json();

                    setProducts(Array.isArray(pjson.products) ? pjson.products.slice(0, 2) : []);
                }

            } catch {
                // silent fail
            }
        })();

        return () => { mounted = false; };
    }, []);

    if (!artist) return null;

    return (
        <section className="py-12 md:py-16 border-y border-neutral-800 bg-neutral-950 text-white">

            <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 grid md:grid-cols-2 gap-8 items-center">

                {/* LEFT — ARTIST STORY */}
                <div>
                    <p className="text-xs uppercase tracking-widest text-neutral-400">
                        This week’s featured artist
                    </p>

                    <h2 className="text-3xl md:text-4xl font-black mt-2">
                        {artist.name}
                    </h2>

                    <p className="mt-4 text-neutral-300 max-w-md">
                        A standout from the local scene — bringing energy, sound,
                        and identity into everything they put out.
                    </p>

                    <p className="mt-3 text-neutral-400 max-w-md text-sm">
                        Their latest drop reflects exactly what they’re about —
                        simple, loud, and built to be worn.
                    </p>

                    <div className="mt-6 flex gap-3">
                        <Link
                            href={`/artists/${artist.slug}`}
                            className="bg-red-600 px-5 py-3 rounded-xl font-bold hover:bg-red-500"
                        >
                            View artist
                        </Link>

                        <Link
                            href={`/artists/${artist.slug}`}
                            className="border border-neutral-700 px-5 py-3 rounded-xl hover:bg-neutral-900"
                        >
                            View all merch
                        </Link>
                    </div>
                </div>

                {/* RIGHT — PRODUCTS */}
                <div className="flex gap-4">

                    {products.map((p, i) => (
                        <Link
                            key={p.id}
                            href={`/product/${p.slug}`}
                            className="flex-1 group rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 hover:-translate-y-1 transition"
                            style={{
                                clipPath:
                                    i === 0
                                        ? "polygon(1% 0,100% 0,98% 100%,0 100%)"
                                        : undefined,
                            }}
                        >
                            <div className="relative aspect-[3/4]">
                                <Image
                                    src={p.image}
                                    alt={p.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition"
                                />
                            </div>

                            <div className="p-3">
                                <p className="text-sm font-semibold truncate">
                                    {p.title}
                                </p>

                                <p className="text-sm font-bold mt-1">
                                    ${p.price}
                                </p>
                            </div>
                        </Link>
                    ))}

                </div>

            </div>
        </section>
    );
}