"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, CreditCard, Shirt, Users } from "lucide-react";

const paths = [
    {
        title: "Artist account",
        kicker: "Launch the drop",
        body: "Design products, publish mockups, track orders, and keep the production data attached for fulfilment.",
        href: "/auth/sign-up?type=artist",
        action: "Start as an artist",
        icon: Shirt,
        accent: "bg-red-600 text-white hover:bg-red-500",
    },
    {
        title: "Fan account",
        kicker: "Back the scene",
        body: "Save orders, follow artists, earn merch credits, and find the next drop before it becomes obvious.",
        href: "/auth/sign-up?type=fan",
        action: "Join as a fan",
        icon: Users,
        accent: "border border-neutral-700 bg-black text-white hover:border-red-500",
    },
];

const proof = [
    { label: "No stock guesswork", icon: BadgeCheck },
    { label: "Credits for fans", icon: CreditCard },
    { label: "Artist-first drops", icon: Shirt },
];

export default function AccountPathways() {
    return (
        <section className="border-y border-neutral-800 bg-black text-white">
            <div className="grid lg:grid-cols-[0.75fr_1.25fr]">
                <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                        Choose your entry
                    </p>
                    <h2 className="mt-3 text-4xl font-black uppercase leading-none md:text-6xl">
                        Artist or fan. Same tent.
                    </h2>
                    <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-400 md:text-base">
                        Merch Tent should split cleanly from the start: artists come to launch, fans come to back the
                        scene, and both paths feed the same marketplace.
                    </p>
                </div>

                <div className="grid md:grid-cols-2">
                    {paths.map((path) => {
                        const Icon = path.icon;

                        return (
                            <Link
                                key={path.title}
                                href={path.href}
                                className="group min-h-[330px] border-b border-r border-neutral-800 bg-neutral-950 p-5 transition hover:bg-neutral-900 md:p-7"
                            >
                                <div className="flex h-full flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between gap-4">
                                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-400">
                                                {path.kicker}
                                            </p>
                                            <Icon className="h-7 w-7 text-red-400" />
                                        </div>
                                        <h3 className="mt-8 text-4xl font-black uppercase leading-none">
                                            {path.title}
                                        </h3>
                                        <p className="mt-4 max-w-md text-sm leading-6 text-neutral-400">
                                            {path.body}
                                        </p>
                                    </div>

                                    <span className={`mt-8 inline-flex w-fit items-center gap-2 px-5 py-3 text-sm font-black ${path.accent}`}>
                                        {path.action}
                                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <div className="grid border-t border-neutral-800 md:grid-cols-3">
                {proof.map((item) => {
                    const Icon = item.icon;

                    return (
                        <div key={item.label} className="flex items-center gap-3 border-b border-r border-neutral-800 p-4">
                            <Icon className="h-5 w-5 text-red-400" />
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-300">
                                {item.label}
                            </p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
