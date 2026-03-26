"use client";

import { Button } from "@/components/ui/button";
import { BadgePercent, Megaphone } from "lucide-react";

export default function DropInConcept() {
    return (
        <section className="py-14 md:py-20 border-t border-neutral-800 bg-neutral-950 text-white">
            <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 grid md:grid-cols-2 gap-10 items-center">

                {/* LEFT — STORY */}
                <div>
                    <p className="text-xs uppercase tracking-widest text-neutral-400">
                        What this is
                    </p>

                    <h2 className="text-3xl md:text-4xl font-black mt-2 leading-tight">
                        Merch that actually <br /> supports the artists
                    </h2>

                    <p className="mt-4 text-neutral-300 max-w-lg">
                        Merch Tent is a platform built for local and unsigned artists to design,
                        launch, and sell their own merch — without upfront costs, risk, or hassle.
                    </p>

                    <p className="mt-3 text-neutral-400 max-w-lg">
                        Everything is print-on-demand, meaning less waste, no overproduction,
                        and artists get paid on every sale.
                    </p>

                    <div className="mt-6 flex gap-3">
                        <a href="/auth/sign-up">
                            <button className="border border-neutral-700 px-5 py-3 rounded-xl hover:bg-neutral-900">
                                Sign up
                            </button>
                        </a>

                        <a href="/start">
                            <button className="bg-red-600 px-5 py-3 rounded-xl font-bold hover:bg-red-500">
                                Learn more
                            </button>
                        </a>
                    </div>
                </div>

                {/* RIGHT — BENEFITS */}
                <div className="grid gap-4">

                    {[
                        {
                            title: "No upfront costs",
                            text: "Design your merch and launch without paying a cent.",
                        },
                        {
                            title: "Print on demand",
                            text: "Only what’s ordered gets made — no waste, no excess stock.",
                        },
                        {
                            title: "Artists get paid",
                            text: "Earn from every sale while focusing on your music.",
                        },
                        {
                            title: "Built for the scene",
                            text: "Independent artists, real fans, no middlemen.",
                        },
                    ].map((item, i) => (
                        <div
                            key={i}
                            className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900"
                        >
                            <p className="font-semibold">{item.title}</p>
                            <p className="text-sm text-neutral-400 mt-1">{item.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section >
    )
}