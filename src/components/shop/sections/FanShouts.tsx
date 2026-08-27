"use client";

import { ArrowRight, MessageSquare, Star } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { publicImageUrl, publicStorageUrl } from "@/lib/storage";

type JoinedArtist = {
    display_name?: string | null;
    hero_image_path?: string | null;
};

type JoinedProduct = {
    slug?: string | null;
    title?: string | null;
    product_images?: Array<{ path?: string | null }> | null;
};

type Shout = {
    id: string;
    name?: string | null;
    text?: string | null;
    artist?: JoinedArtist | JoinedArtist[] | null;
    product?: JoinedProduct | JoinedProduct[] | null;
};

function joinedOne<T>(value: T | T[] | null | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

export default function FanShouts() {
    const [shouts, setShouts] = useState<Shout[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function loadShouts() {
            try {
                const res = await fetch("/api/fan-shouts", { cache: "no-store" });
                const json = await res.json();

                if (mounted) {
                    setShouts(Array.isArray(json.shouts) ? json.shouts : []);
                }
            } catch {
                if (mounted) setShouts([]);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        loadShouts();

        return () => {
            mounted = false;
        };
    }, []);

    if (!loading && shouts.length === 0) return null;

    return (
        <section className="border-y border-neutral-800 bg-black text-white">
            <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-12 lg:px-8">
                <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
                    <div>
                        <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                            <MessageSquare className="h-4 w-4" />
                            Fan shouts
                        </p>
                        <h2 className="mt-2 text-4xl font-black uppercase leading-none md:text-6xl">
                            Proof from the pit.
                        </h2>
                    </div>

                    <div>
                        <p className="max-w-2xl text-sm leading-6 text-neutral-400 md:text-base">
                            Merch feels different when real fans are wearing it, backing artists, and leaving a trace
                            of the drop behind.
                        </p>
                        <div className="mt-4 flex items-center gap-1 text-red-400">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <Star key={index} className="h-4 w-4 fill-current" />
                            ))}
                            <span className="ml-2 text-[11px] font-black uppercase tracking-[0.18em] text-neutral-500">
                                Scene approved
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid border-t border-neutral-800 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="h-[340px] animate-pulse border-b border-r border-neutral-800 bg-neutral-950" />
                    ))}
                </div>
            ) : (
                <div className="grid border-t border-neutral-800 md:grid-cols-3">
                    {shouts.slice(0, 6).map((shout, index) => {
                        const artist = joinedOne(shout.artist);
                        const product = joinedOne(shout.product);
                        const artistAvatar = publicStorageUrl("artist-images", artist?.hero_image_path);
                        const productAvatar = publicImageUrl(product?.product_images?.[0]?.path);
                        const href = product?.slug ? `/product/${product.slug}` : "/artists";

                        return (
                            <Link
                                key={shout.id}
                                href={href}
                                className="group relative min-h-[340px] overflow-hidden border-b border-r border-neutral-800 bg-neutral-950 p-5 transition hover:border-red-500 md:p-6"
                            >
                                {productAvatar && (
                                    <Image
                                        src={productAvatar}
                                        alt=""
                                        fill
                                        sizes="(max-width: 768px) 100vw, 33vw"
                                        className="object-cover opacity-15 grayscale transition duration-700 group-hover:scale-105 group-hover:opacity-25"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/45" />

                                <div className="relative z-10 flex h-full flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between gap-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-400">
                                                [ shout {String(index + 1).padStart(2, "0")} ]
                                            </p>
                                            <div className="flex gap-0.5 text-red-400">
                                                {Array.from({ length: 5 }).map((_, starIndex) => (
                                                    <Star key={starIndex} className="h-3.5 w-3.5 fill-current" />
                                                ))}
                                            </div>
                                        </div>

                                        <p className="mt-8 text-2xl font-black leading-tight md:text-3xl">
                                            &ldquo;{shout.text ?? "This drop belongs in the room."}&rdquo;
                                        </p>
                                    </div>

                                    <div>
                                        <div className="mt-8 flex items-center gap-3">
                                            <div className="h-12 w-12 overflow-hidden border border-neutral-700 bg-neutral-900">
                                                {artistAvatar && (
                                                    <Image
                                                        src={artistAvatar}
                                                        alt={artist?.display_name ?? ""}
                                                        width={48}
                                                        height={48}
                                                        className="h-full w-full object-cover"
                                                    />
                                                )}
                                            </div>
                                            <div className="h-12 w-12 overflow-hidden border border-neutral-700 bg-neutral-900">
                                                {productAvatar && (
                                                    <Image
                                                        src={productAvatar}
                                                        alt={product?.title ?? ""}
                                                        width={48}
                                                        height={48}
                                                        className="h-full w-full object-cover"
                                                    />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-black">{shout.name ?? "Fan"}</p>
                                                <p className="truncate text-xs text-neutral-400">
                                                    {artist?.display_name ?? product?.title ?? "Merch Tent"}
                                                </p>
                                            </div>
                                        </div>

                                        <span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-red-400">
                                            View product
                                            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
