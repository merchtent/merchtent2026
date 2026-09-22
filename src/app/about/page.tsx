import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BadgeDollarSign, PackageCheck, Shirt, Users } from "lucide-react";

export const revalidate = 60;

export const metadata: Metadata = {
    title: "About",
    description: "Merch Tent is an Australian self-service merch marketplace where local and unsigned artists launch products and earn from every sale.",
    alternates: { canonical: "/about" },
};

const principles = [
    {
        title: "Artists launch themselves",
        body: "Merch Tent gives bands the account, product tools, artist page and sales dashboard. The setup is self-service.",
        icon: Shirt,
    },
    {
        title: "Fans buy real merch",
        body: "Products stay connected to the artist, so every purchase feels like backing the scene rather than browsing a faceless catalogue.",
        icon: Users,
    },
    {
        title: "Products move after sale",
        body: "Orders are routed into fulfilment after checkout, reducing stock risk and keeping the merch table flexible.",
        icon: PackageCheck,
    },
    {
        title: "Payouts stay visible",
        body: "Artists can track sales and cash-out activity from their dashboard as the store grows.",
        icon: BadgeDollarSign,
    },
];

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-[#060606] text-white">
            <section className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(180,255,55,0.15),transparent_30%),linear-gradient(180deg,#080808,#111)]">
                <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-[#b6ff3f]">
                        About Merch Tent
                    </p>
                    <h1 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-[0.86] md:text-7xl">
                        Build the drop. Back the band.
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-7 text-white/68">
                        Merch Tent is a self-service merch platform for artists who want to launch products without buying boxes of stock first.
                    </p>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:py-16">
                <div className="border border-white/10 bg-black p-6 md:p-8">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">What this is</p>
                    <h2 className="mt-4 text-4xl font-black uppercase leading-[0.9] md:text-5xl">
                        A merch table that can go live before the boxes exist.
                    </h2>
                    <p className="mt-5 text-sm leading-6 text-white/62">
                        Artists create products, publish them to their store, and let fans buy direct. The platform keeps product pages, orders, credits and payout visibility together.
                    </p>
                </div>

                <div className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2">
                    {principles.map((item) => {
                        const Icon = item.icon;
                        return (
                            <article key={item.title} className="bg-[#f4f1e8] p-6 text-black">
                                <Icon className="h-7 w-7 text-[#477a00]" />
                                <h3 className="mt-5 text-2xl font-black uppercase leading-none">
                                    {item.title}
                                </h3>
                                <p className="mt-3 text-sm leading-6 text-black/62">{item.body}</p>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="border-y border-white/10 bg-[#f4f1e8] text-black">
                <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[1fr_auto] md:items-end md:px-8">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#477a00]">Start simple</p>
                        <h2 className="mt-3 max-w-3xl text-4xl font-black uppercase leading-[0.9] md:text-6xl">
                            No warehouse. No bulk order. No stock gamble.
                        </h2>
                        <p className="mt-5 max-w-2xl text-sm leading-6 text-black/65">
                            Upload your artwork, build the product, publish the listing, and track what happens next from your artist account.
                        </p>
                    </div>
                    <Link href="/start" className="inline-flex items-center gap-2 bg-[#b6ff3f] px-5 py-4 text-sm font-black uppercase text-black">
                        See the artist pathway <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>
        </main>
    );
}
