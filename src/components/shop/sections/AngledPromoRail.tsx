"use client";

import { Button } from "@/components/ui/button";
import { BadgePercent, Megaphone } from "lucide-react";
import Link from "next/link";

const tickerItems = [
    "NEW DROPS",
    "LOCAL ARTISTS",
    "LIMITED RUNS",
    "PRINTED ON DEMAND",
];

export default function AngledPromoRail() {
    return (
        <section className="relative py-0 overflow-hidden">

            {/* giant background word */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-8 md:-top-16 left-0 text-[120px] md:text-[240px] font-black text-black/[0.035] leading-none select-none">
                    SALE
                </div>
            </div>

            <div className="-skew-y-3 bg-neutral-100 text-neutral-900 border-y border-neutral-200 relative overflow-hidden">

                {/* subtle print texture */}
                <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_18px,rgba(0,0,0,0.02)_18px,rgba(0,0,0,0.02)_36px)]" />

                <div className="skew-y-3 relative">

                    <PromoTicker />

                    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16 grid md:grid-cols-3 gap-8 items-center">

                        {/* content */}
                        <div className="md:col-span-2 relative z-10">

                            <p className="uppercase tracking-[0.35em] text-xs font-black text-red-600 mb-3">
                                FEATURED COLLECTIONS
                            </p>

                            <h3 className="text-4xl md:text-6xl lg:text-7xl font-black leading-[0.85]">
                                NEW DROPS
                                <br />
                                <span className="text-red-600">
                                    LIVE NOW
                                </span>
                            </h3>

                            <p className="mt-5 text-neutral-700 text-base md:text-lg max-w-2xl">
                                Fresh merch from local artists.
                                Limited runs, premium prints,
                                and exclusive designs you won&apos;t find anywhere else.
                            </p>
                        </div>

                        {/* actions */}
                        <div className="flex md:justify-end gap-3 relative z-10">

                            <Button
                                asChild
                                className="font-bold hover:scale-105 transition-transform"
                            >
                                <Link href="/category/tees">
                                    <BadgePercent className="h-4 w-4 mr-2" />
                                    Shop Tees
                                </Link>
                            </Button>

                            <Button
                                variant="secondary"
                                asChild
                                className="hover:scale-105 transition-transform"
                            >
                                <Link href="/new">
                                    <Megaphone className="h-4 w-4 mr-2" />
                                    New This Week
                                </Link>
                            </Button>

                        </div>

                    </div>

                    {/* sale sticker */}
                    <div className="hidden lg:flex absolute right-12 top-1/2 -translate-y-1/2 rotate-12 z-20">
                        <div className="h-28 w-28 rounded-full bg-red-600 text-white shadow-xl flex flex-col items-center justify-center">
                            <span className="text-[10px] tracking-widest font-bold">
                                LIMITED
                            </span>
                            <span className="text-3xl font-black leading-none">
                                NEW
                            </span>
                            <span className="text-[10px] tracking-widest font-bold">
                                DROP
                            </span>
                        </div>
                    </div>

                </div>
            </div>

            <style jsx>{`
                @keyframes marquee {
                    from {
                        transform: translateX(0);
                    }
                    to {
                        transform: translateX(-50%);
                    }
                }
            `}</style>
        </section>
    );
}

function PromoTicker() {
    return (
        <div className="overflow-hidden border-b border-neutral-300 bg-neutral-100">
            <div className="flex whitespace-nowrap py-2 text-[11px] font-black tracking-[0.35em] animate-[marquee_34s_linear_infinite]">
                {[...tickerItems, ...tickerItems, ...tickerItems].map((item, index) => (
                    <span key={`${item}-${index}`} className="mr-16">
                        {item}
                    </span>
                ))}
            </div>
        </div>
    );
}
