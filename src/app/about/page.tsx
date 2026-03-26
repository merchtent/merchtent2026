// app/about/page.tsx
import Link from "next/link";

export const revalidate = 60;

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">

            {/* Breadcrumbs */}
            <nav className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-4 text-xs text-neutral-400">
                <Link href="/" className="hover:underline">Home</Link> /{" "}
                <span className="text-neutral-200">About</span>
            </nav>

            {/* HERO */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-10">
                        <p className="uppercase tracking-[0.25em] text-xs text-red-600">
                            About Merch Tent
                        </p>
                        <h1 className="text-3xl md:text-4xl font-black leading-[0.95] mt-1">
                            Built for bands. Backed by fans.
                        </h1>
                    </div>
                </div>
            </section>

            <section className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-12 space-y-10">

                {/* WHAT THIS IS */}
                <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8">
                    <h2 className="text-xl md:text-2xl font-bold">
                        What we’re building
                    </h2>

                    <p className="text-neutral-300 mt-3 leading-relaxed">
                        Merch Tent is a platform for local and unsigned artists to design,
                        launch, and sell their own merch — without the usual barriers.
                    </p>

                    <p className="text-neutral-300 mt-3 leading-relaxed">
                        Fans get access to real band merch. Artists get a way to earn from it.
                        Everything is built around supporting the scene, not extracting from it.
                    </p>
                </article>

                {/* WHY IT EXISTS */}
                <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8">
                    <h2 className="text-xl md:text-2xl font-bold">
                        Why it exists
                    </h2>

                    <p className="text-neutral-300 mt-3 leading-relaxed">
                        Traditional merch is broken for smaller artists.
                    </p>

                    <ul className="mt-4 space-y-2 text-sm text-neutral-300 list-disc pl-5">
                        <li>Pay upfront for stock</li>
                        <li>Guess sizes and quantities</li>
                        <li>Risk unsold inventory</li>
                    </ul>

                    <p className="text-neutral-300 mt-4 leading-relaxed">
                        Most bands either lose money or never start.
                        We built Merch Tent to remove that completely.
                    </p>
                </article>

                {/* HOW WE FIX IT */}
                <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8">
                    <h2 className="text-xl md:text-2xl font-bold">
                        A better way to do merch
                    </h2>

                    <p className="text-neutral-300 mt-3 leading-relaxed">
                        We use print-on-demand production.
                    </p>

                    <p className="text-neutral-300 mt-3 leading-relaxed">
                        That means nothing is made until it’s ordered.
                        No stock. No waste. No upfront cost.
                    </p>

                    <p className="text-neutral-300 mt-3 leading-relaxed">
                        Artists upload their designs. We handle printing,
                        shipping, and customer experience.
                    </p>

                    <p className="text-neutral-300 mt-3 leading-relaxed">
                        Every sale earns them money — automatically.
                    </p>
                </article>

                {/* ECO */}
                <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8">
                    <h2 className="text-xl md:text-2xl font-bold">
                        Better for the planet
                    </h2>

                    <p className="text-neutral-300 mt-3 leading-relaxed">
                        Print-on-demand means no overproduction and no excess waste.
                    </p>

                    <p className="text-neutral-300 mt-3 leading-relaxed">
                        We only produce what people actually buy — reducing landfill,
                        unnecessary shipping, and unused stock.
                    </p>
                </article>

                {/* CTA */}
                <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8 text-center">

                    <h3 className="text-xl font-bold">
                        Want to start your own merch?
                    </h3>

                    <p className="text-neutral-400 mt-2">
                        It’s free. No risk. Takes minutes to get started.
                    </p>

                    <div className="mt-6 flex justify-center gap-3">
                        <Link
                            href="/start"
                            className="rounded-xl bg-red-600 text-white px-6 py-3 font-bold hover:bg-red-500"
                        >
                            Learn how it works
                        </Link>

                        <Link
                            href="/auth/sign-up"
                            className="rounded-xl border border-neutral-700 px-6 py-3 hover:bg-neutral-800"
                        >
                            Get started
                        </Link>
                    </div>

                </section>

            </section>
        </main>
    );
}