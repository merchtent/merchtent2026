"use client";

import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";

export default function MiniCTAStrip() {
    return (
        <section className="border-y border-neutral-800 bg-red-600 text-white">
            <div className="grid lg:grid-cols-[1fr_auto]">
                <div className="border-b border-black/20 p-5 md:p-7 lg:border-b-0 lg:border-r">
                    <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-black">
                        <Megaphone className="h-4 w-4" />
                        Got a band?
                    </p>
                    <h2 className="mt-3 max-w-4xl text-4xl font-black uppercase leading-none md:text-6xl">
                        Open the tent. Launch the drop.
                    </h2>
                    <p className="mt-4 max-w-2xl text-sm font-bold leading-6 text-white/90 md:text-base">
                        No cost to start, no boxes to buy first, and a shop built around fans finding the artists early.
                    </p>
                </div>

                <div className="flex items-center gap-3 p-5 md:p-7">
                    <Link
                        href="/artists/apply"
                        className="inline-flex items-center gap-2 bg-black px-5 py-3 text-sm font-black text-white hover:bg-neutral-900"
                    >
                        Sign up your band
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
