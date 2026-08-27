"use client";

import Link from "next/link";
import { ArrowRight, BadgeDollarSign, Boxes, Radio, Repeat2 } from "lucide-react";

const benefits = [
    {
        title: "No upfront run",
        text: "Artists do not need to guess demand before launching a design.",
        icon: Boxes,
    },
    {
        title: "Fan-backed drops",
        text: "The audience proves what should exist by buying the product.",
        icon: Radio,
    },
    {
        title: "Repeat support",
        text: "Accounts, credits, and order history keep fans connected.",
        icon: Repeat2,
    },
    {
        title: "Artist revenue",
        text: "Drops become a sales channel, not just a box under the merch table.",
        icon: BadgeDollarSign,
    },
];

export default function DropInConcept() {
    return (
        <section className="border-y border-neutral-800 bg-black text-white">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
                <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r lg:p-10">
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                        What this is
                    </p>
                    <h2 className="mt-3 text-4xl font-black uppercase leading-none md:text-6xl">
                        Merch that backs the artist, not the warehouse.
                    </h2>
                    <p className="mt-5 max-w-xl text-sm leading-6 text-neutral-400 md:text-base">
                        Merch Tent is built for local and unsigned artists to design, launch, and sell merch without
                        turning every drop into a cash-flow gamble.
                    </p>
                    <div className="mt-7 flex flex-wrap gap-3">
                        <Link
                            href="/auth/sign-up"
                            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-5 py-3 text-sm font-black hover:bg-red-500"
                        >
                            Sign up
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            href="/start"
                            className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-5 py-3 text-sm font-black hover:border-red-400"
                        >
                            Learn more
                        </Link>
                    </div>
                </div>

                <div className="grid sm:grid-cols-2">
                    {benefits.map((item) => {
                        const Icon = item.icon;

                        return (
                            <div key={item.title} className="min-h-[220px] border-b border-r border-neutral-800 bg-neutral-950 p-5 md:p-6">
                                <Icon className="h-6 w-6 text-red-400" />
                                <h3 className="mt-8 text-2xl font-black uppercase leading-none">
                                    {item.title}
                                </h3>
                                <p className="mt-4 text-sm leading-6 text-neutral-400">
                                    {item.text}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
