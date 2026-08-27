import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BundleBuilder from "@/components/shop/sections/MixtapeBundle";
import BundleBuilderForTwoTees from "@/components/shop/sections/MixtapeBundleForTwoTees";

export const metadata: Metadata = {
    title: "Mixtape Bundles | Merch Tent",
    description: "Build merch packs from live artist drops, including two-tee bundles and mixtape merch bundles.",
};

export default function BundlesPage() {
    return (
        <main className="bg-black text-white">
            <section className="border-b border-neutral-800 bg-black">
                <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 lg:px-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-neutral-400 hover:text-red-400"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to homepage
                    </Link>
                    <p className="mt-8 text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                        Mixtape bundles
                    </p>
                    <h1 className="mt-3 max-w-4xl text-5xl font-black uppercase leading-[0.9] md:text-7xl">
                        Build a merch pack without guessing stock.
                    </h1>
                    <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-400">
                        Two tees, hoodies, packs, and fan-credit friendly bundles live here. Pick the pieces, add the
                        bundle, and keep the drop moving.
                    </p>
                </div>
            </section>

            <section className="border-b border-neutral-800 py-10">
                <BundleBuilderForTwoTees />
            </section>
            <section className="border-b border-neutral-800 py-10">
                <BundleBuilder />
            </section>
        </main>
    );
}
