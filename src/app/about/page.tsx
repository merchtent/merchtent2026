// app/about/page.tsx
import Link from "next/link";

export const revalidate = 60;

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* Breadcrumbs */}
            <nav className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-4 text-xs text-neutral-400">
                <Link href="/" className="hover:underline">Home</Link> /{" "}
                <span className="text-neutral-200">About Us</span>
            </nav>

            {/* Angled banner */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">Our Story</p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">About Us</h1>
                        </div>
                        <span className="text-xs bg-neutral-900 text-white px-2 py-1 rounded rotate-[-2deg]">
                            INFO
                        </span>
                    </div>
                </div>
            </section>

            <section className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-10 space-y-10">
                {/* Section: Mission */}
                <article
                    className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8"
                    style={{ clipPath: "polygon(1% 0,100% 0,100% 100%,0 100%)" }}
                >
                    <h2 className="text-xl md:text-2xl font-bold">We’re Two Things in One</h2>
                    <p className="text-neutral-300 mt-3 leading-relaxed">
                        We’re both an <strong>online shop for local Australian bands</strong> and an{" "}
                        <strong>artist platform</strong> that helps those bands design, create, and sell their
                        own merch — all for free.
                    </p>
                    <p className="text-neutral-300 mt-3 leading-relaxed">
                        Fans can browse and buy merch from the best local and unsigned artists across
                        Australia. Every product sold supports the artist directly — no middlemen, no inflated
                        markups.
                    </p>
                </article>

                {/* Section: Artist platform */}
                <article
                    className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8"
                    style={{ clipPath: "polygon(1% 0,100% 0,100% 100%,0 100%)" }}
                >
                    <h2 className="text-xl md:text-2xl font-bold">Empowering Independent Artists</h2>
                    <p className="text-neutral-300 mt-3 leading-relaxed">
                        We built this platform to solve a real problem:{" "}
                        <strong>small bands can’t always afford bulk merch orders</strong>. We use{" "}
                        <strong>print-on-demand production</strong> — artists upload their artwork and designs,
                        and merch is printed and shipped only when someone orders.
                    </p>
                    <p className="text-neutral-300 mt-3 leading-relaxed">
                        That means no upfront costs, no leftover stock, and a much smaller environmental
                        footprint. Everything is{" "}
                        <strong>eco-friendly, made to order, and sustainably printed</strong>.
                    </p>
                    <p className="text-neutral-300 mt-3 leading-relaxed">
                        Artists can sign up for free, create their own store, design their merch, and list it
                        on the site within minutes. Every sale earns them a cut of the profits — automatically.
                    </p>
                </article>

                {/* Section: Dashboard features */}
                <article
                    className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8"
                    style={{ clipPath: "polygon(1% 0,100% 0,100% 100%,0 100%)" }}
                >
                    <h2 className="text-xl md:text-2xl font-bold">Artist Dashboard</h2>
                    <p className="text-neutral-300 mt-3 leading-relaxed">
                        We’ve built a dedicated <strong>artist dashboard</strong> to give full transparency and
                        control. Every artist can:
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-neutral-300 list-disc pl-5">
                        <li>Upload and manage their product designs and descriptions</li>
                        <li>View sales and engagement stats in real time</li>
                        <li>Track payouts and manage profit shares</li>
                        <li>Control stock availability and product visibility</li>
                        <li>See performance insights across their product line</li>
                    </ul>
                    <p className="text-neutral-300 mt-3 leading-relaxed">
                        The dashboard is built for simplicity — no setup fees, no contracts, just a clear way to
                        sell merch and get paid fairly.
                    </p>
                </article>

                {/* Section: Sustainability */}
                <article
                    className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8"
                    style={{ clipPath: "polygon(1% 0,100% 0,100% 100%,0 100%)" }}
                >
                    <h2 className="text-xl md:text-2xl font-bold">Sustainable by Design</h2>
                    <p className="text-neutral-300 mt-3 leading-relaxed">
                        All items are printed to order using eco-conscious materials and water-based inks.
                        We partner with local print providers who share our commitment to{" "}
                        <strong>reducing waste and supporting independent artists</strong>.
                    </p>
                    <p className="text-neutral-300 mt-3 leading-relaxed">
                        Every purchase helps an artist grow their career and keeps the scene alive — while
                        keeping sustainability at the core.
                    </p>
                </article>

                {/* CTA Section */}
                <section
                    className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6"
                    style={{ clipPath: "polygon(1% 0,100% 0,100% 100%,0 100%)" }}
                >
                    <div>
                        <h3 className="text-lg font-bold text-neutral-100">Want to Join as an Artist?</h3>
                        <p className="text-sm text-neutral-400 mt-1">
                            Sign up for free, upload your designs, and start selling your merch today.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            href="/auth/sign-up"
                            className="rounded-xl bg-red-600 text-white px-5 py-2.5 text-sm hover:bg-red-500"
                        >
                            Get Started
                        </Link>
                        <Link
                            href="/contact"
                            className="rounded-xl border border-neutral-700 px-5 py-2.5 text-sm hover:bg-neutral-800"
                        >
                            Contact Us
                        </Link>
                    </div>
                </section>
            </section>
        </main>
    );
}
