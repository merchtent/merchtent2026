"use client";

export default function WhyThisIsBetter() {
    const items = [
        {
            title: "No bulk orders",
            text: "No guessing sizes, no leftover stock sitting in boxes.",
        },
        {
            title: "No upfront costs",
            text: "Artists don’t pay to get started. Just design and launch.",
        },
        {
            title: "No wasted product",
            text: "Everything is printed on demand — better for the planet, no excess.",
        },
        {
            title: "Artists get paid",
            text: "Every sale directly supports the band, not a middleman.",
        },
        {
            title: "Better designs",
            text: "Real band merch, not generic templates or mass-produced prints.",
        },
        {
            title: "Built for the scene",
            text: "Independent artists, real fans, and a platform that actually gets it.",
        },
    ];

    return (
        <section className="py-12 md:py-16 bg-neutral-950 text-white border-y border-neutral-800">

            <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">

                {/* HEADER */}
                <div className="text-center mb-10">
                    <p className="text-xs uppercase tracking-widest text-neutral-400">
                        Why this works
                    </p>

                    <h2 className="text-2xl md:text-4xl font-black mt-2">
                        Better than traditional merch
                    </h2>

                    <p className="text-neutral-400 mt-3 max-w-xl mx-auto text-sm">
                        No risk. No waste. No nonsense.
                    </p>
                </div>

                {/* GRID */}
                <div className="grid md:grid-cols-3 gap-6">

                    {items.map((item, i) => (
                        <div
                            key={i}
                            className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900 hover:border-neutral-700 transition group"
                            style={{
                                clipPath:
                                    i % 4 === 0
                                        ? "polygon(1% 0,100% 0,98% 100%,0 100%)"
                                        : undefined,
                            }}
                        >
                            <h3 className="font-semibold text-base">
                                {item.title}
                            </h3>

                            <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                                {item.text}
                            </p>
                        </div>
                    ))}

                </div>

                {/* CTA */}
                <div className="text-center mt-10">
                    <a
                        href="/start"
                        className="inline-block bg-red-600 hover:bg-red-500 px-6 py-3 rounded-xl font-bold"
                    >
                        Start selling your merch
                    </a>
                </div>

            </div>
        </section>
    );
}