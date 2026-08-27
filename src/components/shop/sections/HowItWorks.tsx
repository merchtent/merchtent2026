"use client";

import Link from "next/link";
import { ArrowRight, MousePointer2, PackageCheck, Shirt, Users } from "lucide-react";

const steps = [
    {
        label: "Artist",
        title: "Design the thing",
        text: "Open the designer, pick the blank, place the artwork, and save the product data.",
        icon: MousePointer2,
    },
    {
        label: "Platform",
        title: "Make it shoppable",
        text: "Mockups become a listing, the artist profile links through, and fans can buy immediately.",
        icon: Shirt,
    },
    {
        label: "Fan",
        title: "Back the drop",
        text: "Fans buy the merch, earn credits, and keep a record of what they backed.",
        icon: Users,
    },
    {
        label: "Order",
        title: "Fulfil from data",
        text: "The saved design travels with the order so production can happen after the sale.",
        icon: PackageCheck,
    },
];

export default function HowItWorks() {
    return (
        <section className="border-y border-neutral-800 bg-neutral-950 text-white">
            <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14 lg:px-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                            How it works
                        </p>
                        <h2 className="mt-2 text-4xl font-black uppercase leading-none md:text-6xl">
                            Four moves. One merch engine.
                        </h2>
                    </div>
                    <Link
                        href="/start"
                        className="inline-flex w-fit items-center gap-2 rounded-md bg-red-600 px-5 py-3 text-sm font-black hover:bg-red-500"
                    >
                        Learn more
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                <div className="mt-8 grid border border-neutral-800 md:grid-cols-4">
                    {steps.map((step, index) => {
                        const Icon = step.icon;

                        return (
                            <div key={step.title} className="relative min-h-[260px] border-b border-r border-neutral-800 bg-black p-5 last:border-r-0 md:border-b-0 md:p-6">
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-neutral-500">
                                    {String(index + 1).padStart(2, "0")} / {step.label}
                                </p>
                                <Icon className="mt-8 h-7 w-7 text-red-400" />
                                <h3 className="mt-5 text-2xl font-black uppercase leading-none">
                                    {step.title}
                                </h3>
                                <p className="mt-4 text-sm leading-6 text-neutral-400">
                                    {step.text}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
