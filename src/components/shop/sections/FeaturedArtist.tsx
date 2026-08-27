"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { publicStorageUrlOrSource } from "@/lib/storage";

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

const featuredArtistName = "Lionel Loves Vinyl";

export default function FeaturedArtist() {
    const [artist, setArtist] = useState<Artist | null>(null);
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        let mounted = true;

        async function load() {
            try {
                const res = await fetch("/api/artists", { cache: "no-store" });
                const json = await res.json();
                const artists = Array.isArray(json.artists) ? (json.artists as Artist[]) : [];
                const selectedArtist = artists.find((item) => item.name === featuredArtistName) ?? artists[0];

                if (!selectedArtist || !mounted) return;

                setArtist(selectedArtist);

                const productRes = await fetch(`/api/products/artist?artistId=${selectedArtist.id}`, { cache: "no-store" });
                const productJson = await productRes.json();

                if (mounted) {
                    setProducts(Array.isArray(productJson.products) ? productJson.products.slice(0, 2) : []);
                }
            } catch {
                if (mounted) setProducts([]);
            }
        }

        load();

        return () => {
            mounted = false;
        };
    }, []);

    if (!artist) return null;

    const heroImage = publicStorageUrlOrSource("artist-images", artist.image);

    return (
        <section className="relative overflow-hidden border-y border-neutral-800 bg-neutral-950 py-12 text-white md:py-16">
            {heroImage && (
                <Image
                    src={heroImage}
                    alt={artist.name}
                    fill
                    sizes="100vw"
                    priority
                    className="absolute inset-0 h-full w-full scale-105 object-cover opacity-40"
                />
            )}

            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-neutral-950" />
            <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                    backgroundImage: "linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)",
                }}
            />

            <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-8 px-4 md:grid-cols-2 md:px-6 lg:px-8">
                <div>
                    <p className="text-xs uppercase tracking-widest text-neutral-400">
                        This week&apos;s featured artist
                    </p>

                    <h2 className="mt-2 text-3xl font-black md:text-4xl">
                        {artist.name}
                    </h2>

                    <p className="mt-4 max-w-md text-neutral-300">
                        A standout from the local scene - bringing energy, sound, and identity into everything they put out.
                    </p>

                    <p className="mt-3 max-w-md text-sm text-neutral-400">
                        Their latest drop reflects exactly what they&apos;re about - simple, loud, and built to be worn.
                    </p>

                    <div className="mt-6 flex gap-3">
                        <Link
                            href={`/artists/${artist.slug}`}
                            className="rounded-xl bg-red-600 px-5 py-3 font-bold hover:bg-red-500"
                        >
                            Shop {artist.name}
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {products.map((product, index) => (
                        <Link
                            key={product.id}
                            href={`/product/${product.slug}`}
                            className={`group overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 transition hover:-translate-y-1 ${index === 0 ? "md:[clip-path:polygon(1%_0,100%_0,98%_100%,0_100%)]" : ""}`}
                        >
                            <div className="relative aspect-[3/4]">
                                <Image
                                    src={product.image}
                                    alt={product.title}
                                    fill
                                    className="object-cover transition group-hover:scale-105"
                                />
                            </div>

                            <div className="p-3">
                                <p className="truncate text-sm font-semibold">
                                    {product.title}
                                </p>

                                <p className="mt-1 text-sm font-bold">
                                    ${product.price}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
