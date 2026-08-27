"use client";

import Image from "next/image";
import { Star } from "lucide-react";

const reviewCards = [
    {
        handle: "@lunakite",
        text: "Copped this tee from the drop tonight. Quality is wild.",
        image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=85",
    },
    {
        handle: "@deadpilot",
        text: "First merch launched without ordering boxes. That changes things.",
        image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85",
    },
    {
        handle: "@rileypark",
        text: "Fans funded the run in a weekend. Keep it moving.",
        image: "https://images.unsplash.com/photo-1521334884684-d80222895322?auto=format&fit=crop&w=1200&q=85",
    },
];

export default function CommunityReviews() {
    return (
        <section className="border-b border-neutral-800 bg-black text-white">
            <div className="grid lg:grid-cols-[280px_1fr]">
                <div className="border-b border-neutral-800 p-6 md:p-8 lg:border-b-0 lg:border-r">
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                        Built with the community
                    </p>
                    <p className="mt-5 text-6xl font-black">4.8</p>
                    <div className="mt-2 flex text-red-500">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <Star key={index} className="h-5 w-5 fill-current" />
                        ))}
                    </div>
                    <p className="mt-3 text-sm text-neutral-400">Real fans. Real feedback.</p>
                </div>

                <div className="grid md:grid-cols-3">
                    {reviewCards.map((card) => (
                        <div
                            key={card.handle}
                            className="relative min-h-[300px] overflow-hidden border-b border-r border-neutral-800 p-5"
                        >
                            <Image
                                src={card.image}
                                alt=""
                                fill
                                sizes="(max-width: 768px) 100vw, 33vw"
                                className="object-cover opacity-25 grayscale"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />
                            <div className="relative z-10 flex h-full flex-col justify-end">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-400">
                                    {card.handle}
                                </p>
                                <p className="mt-4 text-2xl font-black leading-tight">
                                    &ldquo;{card.text}&rdquo;
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
