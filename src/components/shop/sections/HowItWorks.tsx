"use client";

export default function HowItWorks() {
    const steps = [
        {
            title: "Artists create",
            text: "Bands design their merch and launch it on the platform — no upfront costs, no risk.",
        },
        {
            title: "We print & ship",
            text: "Every order is printed on demand, packed, and shipped directly to the customer.",
        },
        {
            title: "Fans support",
            text: "You get quality merch, and artists earn from every sale. Simple as that.",
        },
    ];

    return (
        <section className="py-12 md:py-16 border-y border-neutral-800 bg-neutral-950 text-white">

            <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">

                {/* HEADER */}
                <div className="text-center mb-10">
                    <p className="text-xs uppercase tracking-widest text-neutral-400">
                        How it works
                    </p>

                    <h2 className="text-2xl md:text-4xl font-black mt-2">
                        Simple. No fluff.
                    </h2>

                    <p className="text-neutral-400 mt-3 max-w-xl mx-auto text-sm">
                        Built for artists, backed by fans — here’s how it all comes together.
                    </p>
                </div>

                {/* STEPS */}
                <div className="grid md:grid-cols-3 gap-6">

                    {steps.map((step, i) => (
                        <div
                            key={i}
                            className="relative p-6 rounded-2xl border border-neutral-800 bg-neutral-900 group hover:border-neutral-700 transition"
                            style={{
                                clipPath:
                                    i === 0
                                        ? "polygon(1% 0,100% 0,98% 100%,0 100%)"
                                        : undefined,
                            }}
                        >
                            {/* NUMBER */}
                            <div className="absolute top-3 left-3 text-xs bg-red-600 px-2 py-0.5 font-bold rounded rotate-[-3deg]">
                                {i + 1}
                            </div>

                            {/* CONTENT */}
                            <h3 className="text-lg font-semibold mt-2">
                                {step.title}
                            </h3>

                            <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                                {step.text}
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
                        Learn more
                    </a>
                </div>

            </div>
        </section>
    );
}