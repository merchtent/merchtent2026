import Link from "next/link";
import { ArrowRight, Leaf, Package, Recycle, Shirt, Truck, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Made-to-Order Merch and Sustainability",
    description: "How Merch Tent’s made-to-order model reduces speculative production and unsold band merch stock.",
    alternates: { canonical: "/sustainability" },
};

export const revalidate = 60;

const points: Array<{ title: string; body: string; icon: LucideIcon }> = [
    { title: "Made to order", body: "Products are created after checkout, so artists do not need to guess quantities or sit on unsold stock.", icon: Shirt },
    { title: "Less dead stock", body: "The model reduces excess inventory by connecting each product to an actual fan order.", icon: Recycle },
    { title: "Regional fulfilment", body: "Orders can be routed through suitable fulfilment partners based on product and destination.", icon: Truck },
    { title: "Right-sized packaging", body: "Packaging is selected for the order so the parcel is protected without unnecessary bulk.", icon: Package },
];

export default function SustainabilityPage() {
    return (
        <main className="min-h-screen bg-[#060606] text-white">
            <section className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(180,255,55,0.16),transparent_30%),linear-gradient(180deg,#080808,#111)]">
                <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-[#b6ff3f]">Our impact</p>
                    <h1 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-[0.86] md:text-7xl">
                        Built after checkout.
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-7 text-white/68">
                        Merch Tent is built around made-to-order merch: fewer speculative runs, less leftover stock, and a cleaner path from fan order to fulfilment.
                    </p>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[0.75fr_1.25fr] md:px-8 md:py-16">
                <aside className="border border-white/10 bg-black p-6">
                    <Leaf className="h-9 w-9 text-[#b6ff3f]" />
                    <h2 className="mt-5 text-4xl font-black uppercase leading-[0.9] md:text-5xl">
                        The most sustainable merch is merch someone actually wants.
                    </h2>
                    <p className="mt-5 text-sm leading-6 text-white/62">
                        We are not claiming perfection. The practical win is simple: artists can test and sell without overproducing.
                    </p>
                </aside>
                <div className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2">
                    {points.map(({ title, body, icon: IconComponent }) => {
                        return (
                            <article key={title} className="bg-[#f4f1e8] p-6 text-black">
                                <IconComponent className="h-7 w-7 text-[#477a00]" />
                                <h3 className="mt-5 text-2xl font-black uppercase leading-none">{title}</h3>
                                <p className="mt-3 text-sm leading-6 text-black/65">{body}</p>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="border-y border-white/10 bg-[#f4f1e8] text-black">
                <div className="mx-auto grid max-w-7xl gap-px border-x border-black/10 bg-black/10 md:grid-cols-3">
                    {[
                        ["Cold wash", "Wash inside-out on a gentle cycle."],
                        ["Line dry", "Air drying helps prints and garments last longer."],
                        ["Buy intentionally", "Pick pieces you will wear again and again."],
                    ].map(([title, body]) => (
                        <article key={title} className="bg-[#f4f1e8] p-6">
                            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#477a00]">Care</p>
                            <h3 className="mt-4 text-2xl font-black uppercase leading-none">{title}</h3>
                            <p className="mt-3 text-sm leading-6 text-black/62">{body}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-12 md:flex-row md:items-center md:justify-between md:px-8">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-red-500">Learn more</p>
                    <h2 className="mt-3 text-4xl font-black uppercase leading-none">Questions about a product?</h2>
                </div>
                <Link href="/contact" className="inline-flex items-center gap-2 bg-[#b6ff3f] px-5 py-4 text-sm font-black uppercase text-black">
                    Contact us <ArrowRight className="h-4 w-4" />
                </Link>
            </section>
        </main>
    );
}
