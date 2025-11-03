// app/privacy/page.tsx
import Link from "next/link";

export const revalidate = 60;

export default function PrivacyPolicyPage() {
    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            <nav className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-4 text-xs text-neutral-400">
                <Link href="/" className="hover:underline">Home</Link> /{" "}
                <span className="text-neutral-200">Privacy Policy</span>
            </nav>

            {/* Header */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-6xl mx-auto px-4 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">Legal</p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">Privacy Policy</h1>
                        </div>
                        <span className="text-xs bg-neutral-900 text-white px-2 py-1 rounded rotate-[-2deg]">
                            TRUST
                        </span>
                    </div>
                </div>
            </section>

            {/* Content */}
            <section className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-10 space-y-8">
                <p className="text-neutral-300 leading-relaxed">
                    This Privacy Policy explains how we collect, use, and protect your personal information when
                    you use our website, shop with us, or sign up as an artist. We’re committed to respecting
                    your privacy and keeping your data safe.
                </p>

                <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4"
                    style={{ clipPath: "polygon(1% 0,100% 0,98% 100%,0 100%)" }}>
                    <h2 className="text-lg font-bold">1. Information We Collect</h2>
                    <ul className="text-sm text-neutral-300 list-disc pl-5 space-y-1">
                        <li>Account details (name, email, password) when you sign up or log in</li>
                        <li>Payment and shipping details when you make a purchase</li>
                        <li>Artist profile information (display name, artwork, merch details)</li>
                        <li>Analytics data (cookies, device info, usage patterns)</li>
                    </ul>
                </article>

                <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4"
                    style={{ clipPath: "polygon(1% 0,100% 0,98% 100%,0 100%)" }}>
                    <h2 className="text-lg font-bold">2. How We Use Your Information</h2>
                    <p className="text-sm text-neutral-300">
                        We use your information to:
                    </p>
                    <ul className="text-sm text-neutral-300 list-disc pl-5 space-y-1">
                        <li>Process orders, payments, and deliveries</li>
                        <li>Enable artist product creation, payouts, and reporting</li>
                        <li>Improve our platform, services, and recommendations</li>
                        <li>Send updates or marketing (only if you’ve opted in)</li>
                    </ul>
                </article>

                <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4"
                    style={{ clipPath: "polygon(1% 0,100% 0,98% 100%,0 100%)" }}>
                    <h2 className="text-lg font-bold">3. Sharing and Security</h2>
                    <p className="text-sm text-neutral-300">
                        We never sell your data. We only share information with trusted third parties needed to
                        operate our service — like payment providers, printing partners, or analytics tools.
                    </p>
                    <p className="text-sm text-neutral-300 mt-2">
                        All personal data is encrypted in transit and stored securely. You can request deletion or
                        correction of your data anytime by emailing{" "}
                        <a href="mailto:privacy@merchtent.example" className="underline">privacy@merchtent.example</a>.
                    </p>
                </article>

                <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4"
                    style={{ clipPath: "polygon(1% 0,100% 0,98% 100%,0 100%)" }}>
                    <h2 className="text-lg font-bold">4. Cookies</h2>
                    <p className="text-sm text-neutral-300">
                        We use cookies to personalize your experience and analyze site traffic. You can disable
                        cookies in your browser settings, but some features may not work as intended.
                    </p>
                </article>

                <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4"
                    style={{ clipPath: "polygon(1% 0,100% 0,98% 100%,0 100%)" }}>
                    <h2 className="text-lg font-bold">5. Updates</h2>
                    <p className="text-sm text-neutral-300">
                        We may update this Privacy Policy to reflect platform or legal changes. Any updates will
                        be posted here with a revised date.
                    </p>
                </article>

                <p className="text-sm text-neutral-500">Last updated: October 2025</p>
            </section>
        </main>
    );
}
