"use client";

export default function WhyTrustUs() {
    const items = [
        {
            title: "Printed locally",
            text: "Produced in Australia with trusted local print partners.",
        },
        {
            title: "Quality gear",
            text: "Soft, durable prints that are made to be worn properly.",
        },
        {
            title: "Made to order",
            text: "Every item is printed when it’s ordered — no excess, no waste.",
        },
        {
            title: "Artists get paid",
            text: "Every sale directly supports the artist behind the design.",
        },
    ];

    return (
        <section className="py-10 md:py-12 border-y border-neutral-800 bg-neutral-950 text-white">

            <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">

                {/* HEADER */}
                <div className="text-center mb-8">
                    <p className="text-xs uppercase tracking-widest text-neutral-400">
                        Why trust us
                    </p>

                    <h2 className="text-xl md:text-2xl font-semibold mt-2">
                        Built properly, from print to delivery
                    </h2>
                </div>

                {/* GRID */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                    {items.map((item, i) => (
                        <div
                            key={i}
                            className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900 text-center"
                            style={{
                                clipPath:
                                    i === 0
                                        ? "polygon(1% 0,100% 0,98% 100%,0 100%)"
                                        : undefined,
                            }}
                        >
                            <p className="text-sm font-semibold">
                                {item.title}
                            </p>

                            <p className="text-xs text-neutral-400 mt-1">
                                {item.text}
                            </p>
                        </div>
                    ))}

                </div>

            </div>
        </section>
    );
}