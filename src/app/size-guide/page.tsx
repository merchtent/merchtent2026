import Link from "next/link";
import { ArrowRight, Ruler, Shirt } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Band Merch Size Guide",
    description: "Compare tee and hoodie measurements before ordering made-to-order band merch from Merch Tent.",
    alternates: { canonical: "/size-guide" },
};

export const revalidate = 60;

const teeRows = [
    ["Width", "45.72", "50.80", "55.88", "60.96", "66.04"],
    ["Length", "71.12", "73.66", "76.20", "78.74", "81.28"],
    ["Sleeve", "20.90", "21.60", "22.20", "22.90", "23.50"],
    ["Tolerance", "+/- 3.81", "+/- 3.81", "+/- 3.81", "+/- 3.81", "+/- 3.81"],
];

const hoodieRows = [
    ["Width", "20.08", "22.05", "24.02", "25.98", "27.99", "29.92"],
    ["Length", "27.17", "27.95", "29.13", "29.92", "31.10", "31.89"],
    ["Sleeve", "33.50", "34.50", "35.50", "36.50", "37.50", "38.50"],
    ["Tolerance", "+/- 1.50", "+/- 1.50", "+/- 1.50", "+/- 1.50", "+/- 1.50", "+/- 1.50"],
];

export default function SizeGuidePage() {
    return (
        <main className="min-h-screen bg-[#060606] text-white">
            <section className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(180,255,55,0.14),transparent_30%),linear-gradient(180deg,#080808,#111)]">
                <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-[#b6ff3f]">Support</p>
                    <h1 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-[0.86] md:text-7xl">
                        Size guide.
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-7 text-white/68">
                        Compare these measurements against something you already wear. Made-to-order pieces cannot be swapped for size changes.
                    </p>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[0.75fr_1.25fr] md:px-8 md:py-16">
                <aside className="border border-white/10 bg-black p-6">
                    <Ruler className="h-9 w-9 text-[#b6ff3f]" />
                    <h2 className="mt-5 text-4xl font-black uppercase leading-[0.9]">
                        Measure flat. Choose once.
                    </h2>
                    <p className="mt-4 text-sm leading-6 text-white/60">
                        Width is armpit to armpit. Length is shoulder to hem. Sleeve is shoulder seam to hem unless noted.
                    </p>
                    <Link href="/shipping-and-returns" className="mt-6 inline-flex items-center gap-2 text-sm font-black uppercase text-[#b6ff3f]">
                        Read return rules <ArrowRight className="h-4 w-4" />
                    </Link>
                </aside>
                <div className="space-y-8">
                    <SizeTable title="Tee shirts - unisex" unit="cm" sizes={["S", "M", "L", "XL", "2XL"]} rows={teeRows} />
                    <SizeTable title="Hoodies" unit="in" sizes={["S", "M", "L", "XL", "2XL", "3XL"]} rows={hoodieRows} />
                </div>
            </section>

            <section className="border-y border-white/10 bg-[#f4f1e8] text-black">
                <div className="mx-auto grid max-w-7xl gap-px border-x border-black/10 bg-black/10 md:grid-cols-3">
                    {[
                        ["Relaxed fit", "Size up if you like a loose merch-table fit."],
                        ["Closer fit", "Choose your usual size if you prefer a standard shape."],
                        ["Still unsure", "Use the measurements above before ordering."],
                    ].map(([title, body]) => (
                        <article key={title} className="bg-[#f4f1e8] p-6">
                            <Shirt className="h-6 w-6 text-[#477a00]" />
                            <h3 className="mt-4 text-2xl font-black uppercase leading-none">{title}</h3>
                            <p className="mt-3 text-sm leading-6 text-black/62">{body}</p>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}

function SizeTable({
    title,
    unit,
    sizes,
    rows,
}: {
    title: string;
    unit: string;
    sizes: string[];
    rows: string[][];
}) {
    return (
        <article className="border border-white/10 bg-black">
            <header className="border-b border-white/10 p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">{unit}</p>
                <h2 className="mt-2 text-3xl font-black uppercase leading-none">{title}</h2>
            </header>
            <div className="overflow-x-auto p-5">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-white/10 text-white/45">
                            <th className="py-3 pr-3 text-left font-black uppercase tracking-[0.16em]">Measure</th>
                            {sizes.map((size) => (
                                <th key={size} className="px-3 py-3 text-right font-black uppercase tracking-[0.16em]">{size}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(([label, ...values]) => (
                            <tr key={label} className="border-b border-white/10 last:border-b-0">
                                <td className="py-3 pr-3 font-black uppercase text-[#b6ff3f]">{label}</td>
                                {values.map((value, index) => (
                                    <td key={`${label}-${index}`} className="px-3 py-3 text-right text-white/75">{value}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </article>
    );
}
