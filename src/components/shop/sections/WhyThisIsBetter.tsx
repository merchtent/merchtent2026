"use client";

import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

const comparisons = [
    {
        old: "Bulk boxes before you know demand",
        new: "Publish first, produce after the fan buys",
    },
    {
        old: "Guessing sizes and colours upfront",
        new: "Real orders tell the system what to make",
    },
    {
        old: "Generic product pages with no artist story",
        new: "Drops tied to artists, fans, credits, and scenes",
    },
    {
        old: "Stock left under the bed after the tour",
        new: "No dead stock sitting around after launch week",
    },
];

export default function WhyThisIsBetter() {
    return (
        <section className="border-y border-neutral-800 bg-black text-white">
            <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14 lg:px-8">
                <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                            Why this is better
                        </p>
                        <h2 className="mt-2 text-4xl font-black uppercase leading-none md:text-6xl">
                            Old merch was a gamble.
                        </h2>
                        <p className="mt-5 max-w-xl text-sm leading-6 text-neutral-400 md:text-base">
                            Merch Tent turns the risk around: prove the demand, keep the design data, and fulfil the
                            order instead of forcing artists to become warehouse managers.
                        </p>
                        <Link
                            href="/dashboard/products/designer"
                            className="mt-7 inline-flex items-center gap-2 rounded-md bg-red-600 px-5 py-3 text-sm font-black hover:bg-red-500"
                        >
                            Start selling your merch
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <div className="grid border border-neutral-800 md:grid-cols-2">
                        {comparisons.map((item) => (
                            <div key={item.old} className="border-b border-r border-neutral-800 bg-neutral-950">
                                <div className="border-b border-neutral-800 p-4">
                                    <div className="flex items-start gap-3">
                                        <span className="mt-0.5 flex h-6 w-6 items-center justify-center bg-neutral-800 text-neutral-500">
                                            <X className="h-4 w-4" />
                                        </span>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                                                Old way
                                            </p>
                                            <p className="mt-1 text-sm leading-5 text-neutral-300">{item.old}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <div className="flex items-start gap-3">
                                        <span className="mt-0.5 flex h-6 w-6 items-center justify-center bg-red-600 text-white">
                                            <Check className="h-4 w-4" />
                                        </span>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-400">
                                                Merch Tent
                                            </p>
                                            <p className="mt-1 text-sm font-bold leading-5 text-white">{item.new}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
