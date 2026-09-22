import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Mail, PackageCheck, RotateCcw, Truck } from "lucide-react";

export const revalidate = 60;

export const metadata: Metadata = {
    title: "Shipping and Returns",
    description: "Merch Tent shipping rates, delivery estimates, tracking guidance and made-to-order returns information for Australian band merch orders.",
    alternates: { canonical: "/shipping-and-returns" },
};

const deliveryRows = [
    ["Australia metro", "2-5 business days"],
    ["Australia regional", "3-8 business days"],
    ["New Zealand", "5-10 business days"],
    ["US / Canada", "7-14 business days"],
    ["EU / UK", "7-14 business days"],
];

const faqs = [
    ["My order is late. What should I do?", "Check tracking first. If it has not moved for 5+ business days, contact us with your order number."],
    ["Can I return the wrong size?", "Because items are printed on demand, change-of-mind and size-change returns are not available. Please check the size guide before buying."],
    ["What if the item is damaged or incorrect?", "Email support@merchtent.com.au within 7 days of delivery with your order number and clear photos. We will review it for replacement or refund."],
    ["Can I change my address?", "If production or shipping has not started, we will do our best. Contact us as soon as possible."],
];

export default function ShippingAndReturnsPage() {
    return (
        <main className="min-h-screen bg-[#060606] text-white">
            <section className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(180,255,55,0.14),transparent_30%),linear-gradient(180deg,#080808,#111)]">
                <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-[#b6ff3f]">Support</p>
                    <h1 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-[0.86] md:text-7xl">
                        Shipping and returns.
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-7 text-white/68">
                        Made-to-order merch means every item starts moving after checkout. Here is what to expect before it reaches your door.
                    </p>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3 md:px-8 md:py-16">
                <article className="border border-white/10 bg-black p-6">
                    <Truck className="h-8 w-8 text-[#b6ff3f]" />
                    <h2 className="mt-5 text-3xl font-black uppercase leading-none">Shipping</h2>
                    <p className="mt-4 text-sm leading-6 text-white/62">
                        Shipping rates are calculated at checkout based on the items, destination and available delivery services.
                    </p>
                </article>
                <article className="border border-white/10 bg-black p-6">
                    <PackageCheck className="h-8 w-8 text-[#b6ff3f]" />
                    <h2 className="mt-5 text-3xl font-black uppercase leading-none">Tracking</h2>
                    <p className="mt-4 text-sm leading-6 text-white/62">
                        You will receive tracking once the order ships. Tracking can take 24-48 hours to activate after dispatch.
                    </p>
                </article>
                <article className="border border-white/10 bg-black p-6">
                    <RotateCcw className="h-8 w-8 text-[#b6ff3f]" />
                    <h2 className="mt-5 text-3xl font-black uppercase leading-none">Returns</h2>
                    <p className="mt-4 text-sm leading-6 text-white/62">
                        Printed-on-demand items are final sale unless they arrive damaged, misprinted or incorrect.
                    </p>
                </article>
            </section>

            <section className="border-y border-white/10 bg-[#f4f1e8] text-black">
                <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[0.85fr_1.15fr] md:px-8 md:py-16">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#477a00]">Delivery guide</p>
                        <h2 className="mt-3 text-4xl font-black uppercase leading-[0.9] md:text-6xl">
                            Estimate the wait before the drop lands.
                        </h2>
                    </div>
                    <div className="border border-black/10 bg-white">
                        {deliveryRows.map(([region, time]) => (
                            <div key={region} className="grid grid-cols-[1fr_auto] gap-4 border-b border-black/10 p-4 last:border-b-0">
                                <span className="font-black uppercase">{region}</span>
                                <span className="text-sm font-black text-[#477a00]">{time}</span>
                            </div>
                        ))}
                        <p className="border-t border-black/10 p-4 text-xs uppercase tracking-[0.12em] text-black/45">
                            Estimates exclude production time, weekends, holidays and customs delays.
                        </p>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.35em] text-red-500">FAQ</p>
                        <h2 className="mt-3 text-4xl font-black uppercase leading-none">Before you email.</h2>
                    </div>
                    <Link href="/dashboard/orders" className="inline-flex items-center gap-2 text-sm font-black uppercase text-[#b6ff3f]">
                        View my orders <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
                <div className="grid gap-px border border-white/10 bg-white/10 md:grid-cols-2">
                    {faqs.map(([q, a]) => (
                        <article key={q} className="bg-black p-6">
                            <h3 className="text-xl font-black uppercase leading-tight">{q}</h3>
                            <p className="mt-3 text-sm leading-6 text-white/62">{a}</p>
                        </article>
                    ))}
                </div>
                <div className="mt-8 flex flex-col gap-4 border border-white/10 bg-black p-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                        <Mail className="mt-1 h-5 w-5 text-[#b6ff3f]" />
                        <div>
                            <p className="font-black uppercase">Still need help?</p>
                            <p className="mt-1 text-sm text-white/55">Send us your order number and what went wrong.</p>
                        </div>
                    </div>
                    <Link href="/contact" className="inline-flex items-center gap-2 bg-[#b6ff3f] px-5 py-3 text-sm font-black uppercase text-black">
                        Contact us <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>
        </main>
    );
}
