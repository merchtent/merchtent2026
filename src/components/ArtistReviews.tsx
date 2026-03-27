"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import Link from "next/link";
import Stars from "./Stars";

type Review = {
    id: string;
    name: string;
    text: string;
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

    function artistImage(path?: string | null) {
        if (!path) return null;
        return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artist-images/${path}`;
    }

    if (!loading && reviews.length === 0) return null;

    return (
        <section className="py-10 md:py-12 border-t border-neutral-800 bg-neutral-950">

            <div className="max-w-6xl mx-auto px-4">

                {/* HEADER */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg md:text-xl font-semibold">
                        What fans are saying
                    </h2>

                    <div className="flex items-center gap-2">
                        <Stars rating={Math.round(avgRating || 5)} />
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
                                className="min-w-[260px] h-[110px] bg-neutral-800 rounded-2xl animate-pulse"
                            />
                        ))}
                    </div>
                )}

                {/* REVIEWS */}
                {!loading && (
                    <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto pb-2">

                        {reviews.map((r: any, i) => {
                            const artistObj = Array.isArray(r.artist) ? r.artist[0] : r.artist;
                            const productObj = Array.isArray(r.product) ? r.product[0] : r.product;

                            const artistAvatar = artistImage(artistObj?.hero_image_path);

                            const productImagePath = productObj?.product_images?.[0]?.path;

                            const productAvatar = productImagePath
                                ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${productImagePath}`
                                : null;

                            return (
                                <Link
                                    key={r.id}
                                    href={productObj?.slug ? `/product/${productObj.slug}` : "#"}
                                    className="group min-w-[260px] md:min-w-0 relative rounded-2xl border border-neutral-800 bg-neutral-900 p-4 transition-all duration-300 hover:border-neutral-700 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30"
                                    style={{
                                        clipPath:
                                            i % 3 === 0
                                                ? "polygon(1% 0,100% 0,98% 100%,0 100%)"
                                                : undefined,
                                    }}
                                >

                                    {/* 🔥 PARALLAX PRODUCT IMAGE */}
                                    <div className="absolute inset-0 overflow-hidden rounded-2xl opacity-20 pointer-events-none">
                                        {productAvatar && (
                                            <img
                                                src={productAvatar}
                                                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 group-hover:-translate-y-1"
                                            />
                                        )}
                                    </div>

                                    {/* CONTENT */}
                                    <div className="relative z-10">

                                        {/* TOP ROW */}
                                        <div className="flex items-center gap-3 mb-3">

                                            {/* ARTIST */}
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-700">
                                                {artistAvatar && (
                                                    <img
                                                        src={artistAvatar}
                                                        className="w-full h-full object-cover"
                                                    />
                                                )}
                                            </div>

                                            {/* PRODUCT */}
                                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-800">
                                                {productAvatar && (
                                                    <img
                                                        src={productAvatar}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    />
                                                )}
                                            </div>

                                            {/* NAME */}
                                            <div>
                                                <p className="text-sm font-semibold">
                                                    {r.name}
                                                </p>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <Stars rating={r.rating ?? 5} />
                                                </div>
                                                <p className="text-xs text-neutral-400">
                                                    {artistObj?.display_name}
                                                </p>
                                            </div>

                                        </div>
                                        <p className="text-[10px] text-neutral-500 truncate">
                                            {productObj?.title}
                                        </p>

                                        {/* TEXT */}
                                        <p className="text-sm text-neutral-300 leading-relaxed">
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