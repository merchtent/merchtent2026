// app/shipping-and-returns/page.tsx
import Link from "next/link";

export const revalidate = 60;

export default function ShippingAndReturnsPage() {
    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* Angled banner */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-6xl mx-auto px-4 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">Support</p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">Shipping & Returns</h1>
                        </div>
                        <span className="text-xs bg-neutral-900 text-white px-2 py-1 rounded rotate-[-2deg]">
                            POLICY
                        </span>
                    </div>
                </div>
            </section>

            {/* Content */}
            <section className="max-w-6xl mx-auto px-4 py-8 space-y-8">
                {/* Quick index */}
                <nav className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm"
                    style={{ clipPath: "polygon(1% 0,100% 0,98% 100%,0 100%)" }}>
                    <p className="text-neutral-300 mb-2">Jump to:</p>
                    <ul className="flex flex-wrap gap-3">
                        <li><a className="underline text-neutral-200" href="#shipping">Shipping</a></li>
                        <li><a className="underline text-neutral-200" href="#delivery-times">Delivery Times</a></li>
                        <li><a className="underline text-neutral-200" href="#tracking">Tracking</a></li>
                        <li><a className="underline text-neutral-200" href="#international">International & Customs</a></li>
                        <li><a className="underline text-neutral-200" href="#returns">Returns & Exchanges</a></li>
                        <li><a className="underline text-neutral-200" href="#refunds">Refunds</a></li>
                        <li><a className="underline text-neutral-200" href="#faq">FAQ</a></li>
                    </ul>
                </nav>

                {/* Shipping */}
                <section id="shipping" className="grid md:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
                        style={{ clipPath: "polygon(1% 0,100% 0,98% 100%,0 100%)" }}>
                        <h2 className="text-lg font-bold">Shipping</h2>
                        <p className="text-neutral-300 mt-2">
                            We ship worldwide from regional partners. Rates are calculated at checkout based on
                            weight, destination, and service level.
                        </p>
                        <ul className="mt-4 space-y-2 text-sm text-neutral-300 list-disc pl-5">
                            <li>Free AU shipping on orders over A$100.</li>
                            <li>Carrier options shown at checkout (standard / express where available).</li>
                            <li>Some items may ship separately to speed up delivery.</li>
                        </ul>
                    </div>

                    <div id="delivery-times" className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
                        style={{ clipPath: "polygon(2% 0,100% 0,98% 100%,0 100%)" }}>
                        <h2 className="text-lg font-bold">Estimated Delivery Times</h2>
                        <ul className="mt-3 grid grid-cols-1 gap-2 text-sm">
                            <li className="flex items-center justify-between border border-neutral-800 rounded-xl px-3 py-2">
                                <span className="text-neutral-300">Australia (metro)</span>
                                <span className="text-neutral-200 font-medium">2–5 business days</span>
                            </li>
                            <li className="flex items-center justify-between border border-neutral-800 rounded-xl px-3 py-2">
                                <span className="text-neutral-300">Australia (regional)</span>
                                <span className="text-neutral-200 font-medium">3–8 business days</span>
                            </li>
                            <li className="flex items-center justify-between border border-neutral-800 rounded-xl px-3 py-2">
                                <span className="text-neutral-300">New Zealand</span>
                                <span className="text-neutral-200 font-medium">5–10 business days</span>
                            </li>
                            <li className="flex items-center justify-between border border-neutral-800 rounded-xl px-3 py-2">
                                <span className="text-neutral-300">US / Canada</span>
                                <span className="text-neutral-200 font-medium">7–14 business days</span>
                            </li>
                            <li className="flex items-center justify-between border border-neutral-800 rounded-xl px-3 py-2">
                                <span className="text-neutral-300">EU / UK</span>
                                <span className="text-neutral-200 font-medium">7–14 business days</span>
                            </li>
                        </ul>
                        <p className="text-xs text-neutral-500 mt-2">
                            Estimates exclude weekends/holidays and may vary during peak periods.
                        </p>
                    </div>
                </section>

                {/* Tracking & International */}
                <section className="grid md:grid-cols-2 gap-6">
                    <div id="tracking" className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
                        style={{ clipPath: "polygon(2% 0,100% 0,98% 100%,0 100%)" }}>
                        <h2 className="text-lg font-bold">Order Tracking</h2>
                        <p className="text-neutral-300 mt-2">
                            You’ll receive a tracking link as soon as your order ships. Tracking can take up to
                            24–48 hours to activate.
                        </p>
                        <ul className="mt-4 space-y-2 text-sm text-neutral-300 list-disc pl-5">
                            <li>Didn’t get an email? Check spam or your <Link href="/orders" className="underline">Orders</Link> page.</li>
                            <li>Tracking shows delivered but no package? Check with neighbours/building manager first.</li>
                        </ul>
                    </div>

                    <div id="international" className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
                        style={{ clipPath: "polygon(2% 0,100% 0,98% 100%,0 100%)" }}>
                        <h2 className="text-lg font-bold">International & Customs</h2>
                        <p className="text-neutral-300 mt-2">
                            International orders may be subject to customs duties, taxes, and fees, which are the
                            recipient’s responsibility.
                        </p>
                        <ul className="mt-4 space-y-2 text-sm text-neutral-300 list-disc pl-5">
                            <li>Delays at customs are outside our control.</li>
                            <li>We can’t declare items as gifts or reduce declared values.</li>
                        </ul>
                    </div>
                </section>

                {/* Returns & Refunds */}
                <section id="returns" className="grid md:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
                        style={{ clipPath: "polygon(2% 0,100% 0,98% 100%,0 100%)" }}>
                        <h2 className="text-lg font-bold">Returns & Exchanges</h2>
                        <p className="text-neutral-300 mt-2">
                            We accept returns within <strong>30 days</strong> of delivery for unworn, unwashed
                            items in original packaging with tags attached.
                        </p>
                        <ul className="mt-4 space-y-2 text-sm text-neutral-300 list-disc pl-5">
                            <li>To start a return, email <a className="underline" href="mailto:support@merchtent.example">support@merchtent.example</a> with your order #.</li>
                            <li>Exchanges are processed as a return + new order to ensure stock availability.</li>
                            <li>Final-sale items (e.g., digital, custom, or clearance) are not returnable.</li>
                        </ul>
                        <p className="text-xs text-neutral-500 mt-2">
                            For hygiene reasons, headwear and opened media (vinyl/cassette) can only be returned if defective.
                        </p>
                    </div>

                    <div id="refunds" className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
                        style={{ clipPath: "polygon(2% 0,100% 0,98% 100%,0 100%)" }}>
                        <h2 className="text-lg font-bold">Refunds</h2>
                        <p className="text-neutral-300 mt-2">
                            Once your return is received and inspected, we’ll issue a refund to your original
                            payment method within 3–7 business days.
                        </p>
                        <ul className="mt-4 space-y-2 text-sm text-neutral-300 list-disc pl-5">
                            <li>Original shipping fees are non-refundable unless we made an error.</li>
                            <li>Return shipping is the customer’s responsibility unless the item arrived damaged/incorrect.</li>
                            <li>If approved, you’ll receive a confirmation email when your refund is issued.</li>
                        </ul>
                    </div>
                </section>

                {/* FAQ */}
                <section id="faq" className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4"
                    style={{ clipPath: "polygon(1% 0,100% 0,98% 100%,0 100%)" }}>
                    <h2 className="text-lg font-bold">FAQ</h2>

                    <details className="group border border-neutral-800 rounded-xl">
                        <summary className="cursor-pointer px-4 py-3 flex items-center justify-between">
                            <span className="text-sm">My order is late—what should I do?</span>
                            <span className="text-neutral-500 group-open:rotate-180 transition">⌄</span>
                        </summary>
                        <div className="px-4 pb-4 text-sm text-neutral-300">
                            Check tracking first. If it hasn’t updated in 5+ business days, contact us at{" "}
                            <a className="underline" href="mailto:support@merchtent.example">support@merchtent.example</a> with your order #.
                        </div>
                    </details>

                    <details className="group border border-neutral-800 rounded-xl">
                        <summary className="cursor-pointer px-4 py-3 flex items-center justify-between">
                            <span className="text-sm">I received a damaged or incorrect item.</span>
                            <span className="text-neutral-500 group-open:rotate-180 transition">⌄</span>
                        </summary>
                        <div className="px-4 pb-4 text-sm text-neutral-300">
                            We’ll fix it. Email photos and your order # to{" "}
                            <a className="underline" href="mailto:support@merchtent.example">support@merchtent.example</a> within 7 days of delivery.
                        </div>
                    </details>

                    <details className="group border border-neutral-800 rounded-xl">
                        <summary className="cursor-pointer px-4 py-3 flex items-center justify-between">
                            <span className="text-sm">Can I change my address after ordering?</span>
                            <span className="text-neutral-500 group-open:rotate-180 transition">⌄</span>
                        </summary>
                        <div className="px-4 pb-4 text-sm text-neutral-300">
                            If your order hasn’t shipped, we’ll do our best. Contact us ASAP with the correct address.
                        </div>
                    </details>

                    <details className="group border border-neutral-800 rounded-xl">
                        <summary className="cursor-pointer px-4 py-3 flex items-center justify-between">
                            <span className="text-sm">Which items are final sale?</span>
                            <span className="text-neutral-500 group-open:rotate-180 transition">⌄</span>
                        </summary>
                        <div className="px-4 pb-4 text-sm text-neutral-300">
                            Digital downloads, custom/personalized products, and marked clearance items are final sale
                            unless faulty on arrival.
                        </div>
                    </details>
                </section>

                {/* Contact rail */}
                <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 flex items-center justify-between"
                    style={{ clipPath: "polygon(1% 0,100% 0,98% 100%,0 100%)" }}>
                    <div>
                        <p className="text-sm text-neutral-300">Still need help?</p>
                        <p className="font-semibold">Our team is here for you.</p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/contact" className="rounded-xl border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800">
                            Contact Us
                        </Link>
                        <Link href="/orders" className="rounded-xl bg-red-600 text-white px-4 py-2 text-sm hover:bg-red-500">
                            View My Orders
                        </Link>
                    </div>
                </section>
            </section>
        </main>
    );
}
