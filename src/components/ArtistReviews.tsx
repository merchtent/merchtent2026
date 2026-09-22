"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Stars from "./Stars";
import { publicImageUrl, publicStorageUrl } from "@/lib/storage";

type Review = {
    id: string;
    name: string;
    text: string;
    rating?: number | null;
    artist?: JoinedArtist | JoinedArtist[] | null;
    product?: JoinedProduct | JoinedProduct[] | null;
};

type JoinedArtist = {
    display_name?: string | null;
    hero_image_path?: string | null;
};

type JoinedProduct = {
    slug?: string | null;
    title?: string | null;
    product_images?: { path?: string | null }[] | null;
};

export default function ArtistReviews({ artistId }: { artistId: string }) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [avgRating, setAvgRating] = useState<number | null>(null);
    const [count, setCount] = useState(0);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const res = await fetch(`/api/fan-shouts?artist_id=${artistId}`, {
                    cache: "no-store",
                });

                const json = await res.json();

                if (mounted) {
                    setReviews(Array.isArray(json.shouts) ? json.shouts : []);
                    setAvgRating(json.avgRating ?? null);
                    setCount(json.count ?? 0);
                }
            } catch {
                if (mounted) setReviews([]);
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [artistId]);

    return (
        <section className="border-t border-white/10 bg-[#060606] py-10 md:py-12">

            <div className="max-w-6xl mx-auto px-4">

                {/* HEADER */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#b6ff3f]">Fan shouts</p>
                        <h2 className="mt-2 text-3xl font-black uppercase leading-none md:text-4xl">
                        What fans are saying
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                        {avgRating ? <Stars rating={Math.round(avgRating)} /> : null}
                        <span className="text-xs text-neutral-400">
                            {avgRating?.toFixed(1)} ({count})
                        </span>
                    </div>
                </div>

                {/* LOADING */}
                {loading && (
                    <div className="flex gap-4 overflow-x-auto">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-[110px] min-w-[260px] animate-pulse border border-white/10 bg-white/10"
                            />
                        ))}
                    </div>
                )}

                {/* REVIEWS */}
                {!loading && (
                    <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto pb-2">

                        {reviews.length === 0 ? (
                            <div className="min-w-full border border-white/10 bg-black p-6 md:col-span-3">
                                <p className="text-lg font-black uppercase">No verified fan reviews yet.</p>
                                <p className="mt-2 text-sm text-white/55">Customer reviews will appear after completed orders.</p>
                            </div>
                        ) : null}

                        {reviews.map((r) => {
                            const artistObj = Array.isArray(r.artist) ? r.artist[0] : r.artist;
                            const productObj = Array.isArray(r.product) ? r.product[0] : r.product;

                            const artistAvatar = publicStorageUrl("artist-images", artistObj?.hero_image_path);

                            const productImagePath = productObj?.product_images?.[0]?.path;

                            const productAvatar = publicImageUrl(productImagePath);

                            return (
                                <Link
                                    key={r.id}
                                    href={productObj?.slug ? `/product/${productObj.slug}` : "#"}
                                    className="group relative min-w-[260px] border border-white/10 bg-black p-4 transition-all duration-300 hover:border-[#b6ff3f] md:min-w-0"
                                >

                                    {/* 🔥 PARALLAX PRODUCT IMAGE */}
                                    <div className="absolute inset-0 overflow-hidden opacity-15 pointer-events-none">
                                        {productAvatar && (
                                            <Image
                                                src={productAvatar}
                                                alt={productObj?.title ?? "Product"}
                                                fill
                                                sizes="260px"
                                                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                            />
                                        )}
                                    </div>

                                    {/* CONTENT */}
                                    <div className="relative z-10">

                                        {/* TOP ROW */}
                                        <div className="flex items-center gap-3 mb-3">

                                            {/* ARTIST */}
                                            <div className="h-10 w-10 overflow-hidden border border-white/10 bg-[#f4f1e8]">
                                                {artistAvatar && (
                                                    <Image
                                                        src={artistAvatar}
                                                        alt={artistObj?.display_name ?? "Artist"}
                                                        width={40}
                                                        height={40}
                                                        className="w-full h-full object-cover"
                                                    />
                                                )}
                                            </div>

                                            {/* PRODUCT */}
                                            <div className="h-10 w-10 overflow-hidden border border-white/10 bg-[#f4f1e8]">
                                                {productAvatar && (
                                                    <Image
                                                        src={productAvatar}
                                                        alt={productObj?.title ?? "Product"}
                                                        width={40}
                                                        height={40}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    />
                                                )}
                                            </div>

                                            {/* NAME */}
                                            <div>
                                                    <p className="text-sm font-black uppercase">
                                                    {r.name}
                                                </p>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    {typeof r.rating === "number" ? <Stars rating={r.rating} /> : null}
                                                </div>
                                                <p className="text-xs text-white/45">
                                                    {artistObj?.display_name}
                                                </p>
                                            </div>

                                        </div>
                                        <p className="truncate text-[10px] uppercase tracking-[0.14em] text-white/35">
                                            {productObj?.title}
                                        </p>

                                        {/* TEXT */}
                                        <p className="mt-2 text-sm leading-relaxed text-white/70">
                                            “{r.text}”
                                        </p>

                                    </div>

                                </Link>
                            );
                        })}

                    </div>
                )}

            </div>
        </section>
    );
}
