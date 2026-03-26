"use client";

import { Star } from "lucide-react";

export default function FanShouts() {
    const shouts = [
        { name: "@markw", text: "Quality tees. Packaging was ace." },
        { name: "Azza", text: "Print feels soft, not plasticky. Sick mate." },
        { name: "Mauro", text: "Love the design. Wear it all the time." },
        { name: "Jess", text: "Fast shipping and the fit is perfect." },
    ];

    return (
        <section className="bg-neutral-950 py-10 md:py-14">

            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">

                {/* HEADER */}
                <div className="flex items-end justify-between mb-6">
                    <div>
                        <h2 className="text-xl md:text-2xl font-semibold">
                            Fan shouts
                        </h2>
                        <p className="text-sm text-neutral-400">
                            What people are saying
                        </p>
                    </div>

                    <div className="flex items-center gap-1 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-current" />
                        ))}
                    </div>
                </div>

                {/* CARDS */}
                <div className="flex md:grid md:grid-cols-3 gap-4 md:gap-6 overflow-x-auto pb-2">

                    {shouts.map((t, i) => (
                        <div
                            key={i}
                            className="min-w-[260px] md:min-w-0 group relative rounded-2xl border border-neutral-800 bg-neutral-900 p-5 md:p-6 transition-all hover:border-neutral-700 hover:-translate-y-1"
                            style={{
                                clipPath:
                                    i % 3 === 0
                                        ? "polygon(1% 0,100% 0,98% 100%,0 100%)"
                                        : undefined,
                            }}
                        >
                            {/* subtle background texture */}
                            <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                                style={{
                                    backgroundImage:
                                        "linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(0deg,rgba(255,255,255,0.1) 1px,transparent 1px)",
                                    backgroundSize: "20px 20px",
                                }}
                            />

                            {/* badge */}
                            <div className="absolute top-3 left-3 text-[10px] bg-red-600 text-white px-2 py-0.5 font-bold rounded rotate-[-3deg]">
                                Fan
                            </div>

                            {/* quote */}
                            <p className="mt-2 relative text-sm text-neutral-300 leading-relaxed">
                                “{t.text}”
                            </p>

                            {/* footer */}
                            <div className="mt-4 flex items-center justify-between">
                                <p className="text-sm font-semibold">
                                    {t.name}
                                </p>

                                <span className="text-xs text-neutral-400 group-hover:text-neutral-200 transition">
                                    Verified →
                                </span>
                            </div>
                        </div>
                    ))}

                </div>
            </div>
        </section>
    );
}