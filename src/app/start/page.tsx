"use client";

import { Button } from "@/components/ui/button";

export default function StartPage() {
    return (
        <main className="bg-neutral-950 text-white">

            {/* HERO */}
            <section className="py-16 md:py-24 text-center border-b border-neutral-800">
                <div className="max-w-3xl mx-auto px-4">

                    <h1 className="text-3xl md:text-5xl font-black leading-tight">
                        Sell your merch. <br /> We handle everything else.
                    </h1>

                    <p className="mt-4 text-neutral-400">
                        No upfront cost. No risk. No stock. <br />
                        Just your designs, live and selling.
                    </p>

                    <div className="mt-6">
                        <a href="/auth/sign-up">
                            <Button className="bg-red-600 hover:bg-red-500 px-6 py-3 font-bold">
                                Start selling your merch
                            </Button>
                        </a>
                    </div>
                </div>
            </section>

            {/* WHAT THIS IS */}
            <section className="py-14 border-b border-neutral-800">
                <div className="max-w-5xl mx-auto px-4 text-center">
                    <h2 className="text-2xl md:text-4xl font-black">
                        Built for artists. Backed by fans.
                    </h2>

                    <p className="mt-4 text-neutral-400 max-w-2xl mx-auto">
                        Merch Tent is a platform where local and unsigned artists can
                        design, launch, and sell merch — without paying anything upfront.
                        We print, pack, ship, and handle the entire process.
                    </p>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section className="py-14 border-b border-neutral-800">
                <div className="max-w-6xl mx-auto px-4">

                    <h2 className="text-2xl md:text-3xl font-black mb-10 text-center">
                        How it works
                    </h2>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                title: "Design your merch",
                                text: "Upload your designs and choose your products.",
                            },
                            {
                                title: "We handle everything",
                                text: "Print on demand, shipping, and customer support.",
                            },
                            {
                                title: "You get paid",
                                text: "Earn from every sale — no upfront cost, no risk.",
                            },
                        ].map((s, i) => (
                            <div key={i} className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900">
                                <h3 className="font-semibold">{s.title}</h3>
                                <p className="text-sm text-neutral-400 mt-2">{s.text}</p>
                            </div>
                        ))}
                    </div>

                </div>
            </section>

            {/* WHY BETTER */}
            <section className="py-14 border-b border-neutral-800">
                <div className="max-w-6xl mx-auto px-4">

                    <h2 className="text-2xl md:text-3xl font-black mb-10 text-center">
                        Why this is better
                    </h2>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            "No bulk orders",
                            "No upfront costs",
                            "No leftover stock",
                            "Artists get paid",
                            "Print on demand",
                            "Built for independent artists",
                        ].map((item, i) => (
                            <div key={i} className="p-5 border border-neutral-800 bg-neutral-900 rounded-2xl">
                                <p>{item}</p>
                            </div>
                        ))}
                    </div>

                </div>
            </section>

            {/* PRINT ON DEMAND (DEEP EXPLAIN) */}
            <section className="py-14 border-b border-neutral-800">
                <div className="max-w-4xl mx-auto px-4 text-center">

                    <h2 className="text-2xl md:text-3xl font-black">
                        Print on demand. No waste.
                    </h2>

                    <p className="mt-4 text-neutral-400">
                        Traditional merch means guessing sizes, ordering in bulk,
                        and hoping it sells.
                    </p>

                    <p className="mt-3 text-neutral-400">
                        With print-on-demand, nothing is made until it’s ordered.
                        That means no waste, no excess stock, and no upfront spend.
                    </p>

                    <p className="mt-3 text-neutral-400">
                        Every piece is made specifically for the customer — better
                        for artists, better for fans, and better for the planet.
                    </p>

                </div>
            </section>

            {/* PRODUCTS */}
            <section className="py-14 border-b border-neutral-800">
                <div className="max-w-6xl mx-auto px-4 text-center">

                    <h2 className="text-2xl md:text-3xl font-black">
                        What you can sell
                    </h2>

                    <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm text-neutral-300">
                        {[
                            "T-Shirts",
                            "Hoodies",
                            "Long sleeves",
                            "Caps",
                            "Posters",
                            "More coming",
                        ].map((p) => (
                            <span
                                key={p}
                                className="px-3 py-1 border border-neutral-700 rounded-full"
                            >
                                {p}
                            </span>
                        ))}
                    </div>

                </div>
            </section>

            {/* ECO */}
            <section className="py-14 border-b border-neutral-800">
                <div className="max-w-4xl mx-auto px-4 text-center">

                    <h2 className="text-2xl md:text-3xl font-black">
                        Better for the planet
                    </h2>

                    <p className="mt-4 text-neutral-400">
                        No overproduction. No wasted stock. No landfill piles of unsold merch.
                    </p>

                    <p className="mt-3 text-neutral-400">
                        Print-on-demand means we only produce what people actually buy.
                        It’s a smarter, cleaner way to do merch.
                    </p>

                </div>
            </section>

            {/* FINAL CTA */}
            <section className="py-16 text-center">
                <h2 className="text-2xl md:text-4xl font-black">
                    Ready to launch your merch?
                </h2>

                <p className="mt-3 text-neutral-400">
                    It’s free. It’s simple. It works.
                </p>

                <div className="mt-6">
                    <a href="/auth/sign-up">
                        <Button className="bg-red-600 hover:bg-red-500 px-6 py-3 font-bold">
                            Start selling your merch
                        </Button>
                    </a>
                </div>
            </section>

        </main>
    );
}