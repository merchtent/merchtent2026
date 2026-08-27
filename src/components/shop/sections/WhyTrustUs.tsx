"use client";

import { BadgeCheck, CreditCard, PackageCheck, ShieldCheck } from "lucide-react";

const items = [
    {
        title: "Print partners",
        text: "Local production paths and order data structured for fulfilment.",
        icon: PackageCheck,
    },
    {
        title: "Clear order status",
        text: "Customers should know what happened after they backed the drop.",
        icon: ShieldCheck,
    },
    {
        title: "Artist earnings",
        text: "Sales, credits, and payout reporting belong in the same system.",
        icon: CreditCard,
    },
    {
        title: "Production data",
        text: "Design placement and product settings stay attached to the order.",
        icon: BadgeCheck,
    },
];

export default function WhyTrustUs() {
    return (
        <section className="border-y border-neutral-800 bg-black text-white">
            <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-12 lg:px-8">
                <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                            Trust layer
                        </p>
                        <h2 className="mt-2 text-4xl font-black uppercase leading-none md:text-6xl">
                            Built properly, not just loudly.
                        </h2>
                    </div>
                    <p className="max-w-2xl text-sm leading-6 text-neutral-400 md:text-base">
                        The site can feel like a venue, but the platform needs the grown-up bits underneath:
                        fulfilment, order visibility, artist records, and customer confidence.
                    </p>
                </div>
            </div>

            <div className="grid border-t border-neutral-800 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((item) => {
                    const Icon = item.icon;

                    return (
                        <div key={item.title} className="min-h-[220px] border-b border-r border-neutral-800 bg-neutral-950 p-5 md:p-6">
                            <Icon className="h-7 w-7 text-red-400" />
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
        </section>
    );
}
