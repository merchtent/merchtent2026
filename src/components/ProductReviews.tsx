"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Stars from "./Stars";
import { publicImageUrl, publicStorageUrl } from "@/lib/storage";

type JoinedArtist = {
    display_name?: string | null;
    hero_image_path?: string | null;
};

type JoinedProduct = {
    title?: string | null;
    product_images?: Array<{ path?: string | null }> | null;
};

type Review = {
    id: string;
    name?: string | null;
    rating?: number | null;
    text?: string | null;
    artist?: JoinedArtist | JoinedArtist[] | null;
    product?: JoinedProduct | JoinedProduct[] | null;
};

type EligibleItem = { order_item_id: string; order_number?: string | null };

export default function ProductReviews({ productId }: { productId: string }) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [avgRating, setAvgRating] = useState<number | null>(null);
    const [count, setCount] = useState(0);
    const [eligible, setEligible] = useState<EligibleItem[]>([]);
    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [formMessage, setFormMessage] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const [res, eligibilityRes] = await Promise.all([
                    fetch(`/api/fan-shouts?product_id=${productId}`, { cache: "no-store" }),
                    fetch(`/api/reviews?product_id=${productId}`, { cache: "no-store" }),
                ]);
                const [json, eligibilityJson] = await Promise.all([res.json(), eligibilityRes.json()]);

                if (mounted) {
                    setReviews(Array.isArray(json.shouts) ? json.shouts : []);
                    setAvgRating(json.avgRating ?? null);
                    setCount(json.count ?? 0);
                    setEligible(Array.isArray(eligibilityJson.eligible) ? eligibilityJson.eligible : []);
                }
            } catch {
                if (mounted) setReviews([]);
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => { mounted = false; };
    }, [productId]);

    async function submitReview(event: React.FormEvent) {
        event.preventDefault();
        const item = eligible[0];
        if (!item) return;
        setSubmitting(true);
        setFormMessage(null);
        try {
            const response = await fetch("/api/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ order_item_id: item.order_item_id, rating, text: reviewText }),
            });
            const json = await response.json();
            if (!response.ok) throw new Error(json.error || "Could not publish review.");
            setFormMessage("Thanks — your verified review is now live.");
            setEligible((items) => items.slice(1));
            setReviewText("");
            window.setTimeout(() => window.location.reload(), 800);
        } catch (error) {
            setFormMessage(error instanceof Error ? error.message : "Could not publish review.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <section className="mt-16 border-t border-white/10 pt-10">

            <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-[#b6ff3f]">Fan shouts</p>
                    <h3 className="mt-2 text-3xl font-black uppercase leading-none md:text-4xl">
                    What fans are saying
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    {avgRating ? <Stars rating={Math.round(avgRating)} /> : null}
                    <span className="text-xs text-neutral-400">
                        {avgRating ? avgRating.toFixed(1) : "—"} ({count})
                    </span>
                </div>
            </div>

            {eligible.length > 0 ? (
                <form onSubmit={submitReview} className="mb-6 border border-lime-300/35 bg-lime-300/[0.06] p-5">
                    <p className="text-sm font-black uppercase text-lime-300">Review your verified purchase</p>
                    <p className="mt-1 text-xs text-white/50">Order {eligible[0].order_number ?? "delivered"}</p>
                    <div className="mt-4 flex gap-2" aria-label="Rating">
                        {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} className={`text-2xl ${value <= rating ? "text-amber-400" : "text-white/20"}`} aria-label={`${value} star${value === 1 ? "" : "s"}`}>★</button>)}
                    </div>
                    <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} minLength={10} maxLength={2000} required placeholder="Tell other fans about the product, print and fit." className="mt-3 min-h-28 w-full border border-white/15 bg-black p-3 text-sm text-white outline-none focus:border-lime-300" />
                    <button disabled={submitting} className="mt-3 bg-lime-300 px-5 py-3 text-sm font-black uppercase text-black disabled:opacity-50">{submitting ? "Publishing…" : "Publish verified review"}</button>
                    {formMessage ? <p className="mt-3 text-sm text-white/70">{formMessage}</p> : null}
                </form>
            ) : null}

            {loading && (
                <div className="flex gap-4 overflow-x-auto">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-[120px] min-w-[260px] animate-pulse border border-white/10 bg-white/10" />
                    ))}
                </div>
            )}

            {!loading && (
                <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto pb-2">

                    {reviews.length === 0 ? (
                        <div className="min-w-full border border-white/10 bg-black p-6 md:col-span-3">
                            <p className="text-lg font-black uppercase">No verified reviews yet.</p>
                            <p className="mt-2 text-sm text-white/55">Reviews from customers will appear here after completed orders.</p>
                        </div>
                    ) : null}

                    {reviews.map((r) => {
                        const artistObj = Array.isArray(r.artist) ? r.artist[0] : r.artist;
                        const productObj = Array.isArray(r.product) ? r.product[0] : r.product;

                        const artistAvatar = publicStorageUrl("artist-images", artistObj?.hero_image_path);

                        const productImagePath = productObj?.product_images?.[0]?.path;

                        const productAvatar = publicImageUrl(productImagePath);

                        return (
                            <div
                                key={r.id}
                                className="group relative min-w-[260px] border border-white/10 bg-black p-4 transition-all duration-300 hover:border-[#b6ff3f]"
                            >

                                {/* 🔥 PARALLAX PRODUCT IMAGE */}
                                <div className="absolute inset-0 overflow-hidden opacity-15 pointer-events-none">
                                    {productAvatar && (
                                        <Image
                                            src={productAvatar}
                                            alt=""
                                            fill
                                            sizes="(min-width: 768px) 33vw, 260px"
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
                                                    alt={artistObj?.display_name ?? ""}
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
                                                    alt={productObj?.title ?? ""}
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

                            </div>
                        );
                    })}

                </div>
            )}

        </section>
    );
}
