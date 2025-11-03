// app/terms/page.tsx
import Link from "next/link";

export const revalidate = 60;

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            <nav className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-4 text-xs text-neutral-400">
                <Link href="/" className="hover:underline">Home</Link> /{" "}
                <span className="text-neutral-200">Terms & Conditions</span>
            </nav>

            {/* Header */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-6xl mx-auto px-4 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">Legal</p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">Terms & Conditions</h1>
                        </div>
                        <span className="text-xs bg-neutral-900 text-white px-2 py-1 rounded rotate-[-2deg]">
                            TERMS
                        </span>
                    </div>
                </div>
            </section>

            {/* Content */}
            <section className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-10 space-y-8">
                <p className="text-neutral-300 leading-relaxed">
                    These Terms and Conditions govern your use of our website and services, including purchasing
                    products, creating artist accounts, and uploading artwork. By using our site, you agree to
                    these terms.
                </p>

                <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4"
                    style={{ clipPath: "polygon(1% 0,100% 0,98% 100%,0 100%)" }}>
                    <h2 className="text-lg font-bold">1. Overview</h2>
                    <p className="text-sm text-neutral-300">
                        Our platform acts as both a marketplace for music merch and a service for artists to
                        design and sell products. We facilitate printing, fulfilment, and payment on behalf of
                        the artist.
                    </p>
                </article>

                <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4"
                    style={{ clipPath: "polygon(1% 0,100% 0,94% 100%,0 100%)" }}>
                    <h2 className="text-lg font-bold">2. Artist Accounts</h2>
                    <ul className="text-sm text-neutral-300 list-disc pl-5 space-y-1">
                        <li>Artists must provide accurate information when creating their account.</li>
                        <li>Uploaded content (images, artwork, etc.) must be original and not infringe on any third-party rights.</li>
                        <li>We reserve the right to remove content or suspend accounts that violate these terms.</li>
                    </ul>
                </article>

                <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4"
                    style={{ clipPath: "polygon(1% 0,100% 0,98% 100%,0 100%)" }}>
                    <h2 className="text-lg font-bold">3. Orders & Payments</h2>
                    <p className="text-sm text-neutral-300">
                        All products are printed on demand. Once an order is placed, it cannot be modified or
                        cancelled. Prices include applicable taxes. Artists receive a commission per sale, as
                        outlined in their dashboard.
                    </p>
                </article>

                <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4"
                    style={{ clipPath: "polygon(1% 0,100% 0,94% 100%,0 100%)" }}>
                    <h2 className="text-lg font-bold">4. Intellectual Property</h2>
                    <p className="text-sm text-neutral-300">
                        Artists retain full ownership of their designs. By uploading, they grant us a
                        non-exclusive license to display, print, and sell their designs through the platform.
                    </p>
                </article>

                <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4"
                    style={{ clipPath: "polygon(1% 0,100% 0,98% 100%,0 100%)" }}>
                    <h2 className="text-lg font-bold">5. Limitation of Liability</h2>
                    <p className="text-sm text-neutral-300">
                        We are not liable for indirect, incidental, or consequential damages. Our total liability
                        for any claim shall not exceed the total amount paid for the order or service in
                        question.
                    </p>
                </article>

                <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4"
                    style={{ clipPath: "polygon(1% 0,100% 0,94% 100%,0 100%)" }}>
                    <h2 className="text-lg font-bold">6. Termination</h2>
                    <p className="text-sm text-neutral-300">
                        We reserve the right to suspend or terminate user access if these terms are violated,
                        or if activity poses a legal or reputational risk to the platform.
                    </p>
                </article>

                <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4"
                    style={{ clipPath: "polygon(1% 0,100% 0,98% 100%,0 100%)" }}>
                    <h2 className="text-lg font-bold">7. Changes to Terms</h2>
                    <p className="text-sm text-neutral-300">
                        We may update these terms periodically. Continued use of the platform after changes means
                        you accept the new terms.
                    </p>
                </article>

                <p className="text-sm text-neutral-500">Last updated: October 2025</p>
            </section>
        </main>
    );
}
