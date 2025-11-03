// app/sustainability/page.tsx
import { Leaf, Recycle, Droplets, Truck, Factory, Package, Shield, Sparkles, Info, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const revalidate = 60;

export default function SustainabilityPage() {
    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* angled banner */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">Our impact</p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">Sustainability</h1>
                            <p className="mt-2 text-sm md:text-base text-neutral-700 max-w-2xl">
                                Print-on-Demand lets us make exactly what you order—no dead stock, no bulk waste, and smarter shipping.
                            </p>
                        </div>
                        <span className="text-xs bg-neutral-900 text-white px-2 py-1 rounded rotate-[-2deg]">
                            RESPONSIBLE BY DESIGN
                        </span>
                    </div>
                </div>
            </section>

            {/* hero stats / promises */}
            <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
                <ul className="grid gap-4 md:grid-cols-3">
                    <PromiseCard
                        icon={<Leaf className="h-5 w-5" />}
                        title="Made to order"
                        body="We only produce when you purchase—cutting overproduction and landfill waste."
                        accent
                    />
                    <PromiseCard
                        icon={<Droplets className="h-5 w-5" />}
                        title="Water-based inks"
                        body="OEKO-TEX certified, toxin-free inks with efficient curing to reduce energy use."
                    />
                    <PromiseCard
                        icon={<Truck className="h-5 w-5" />}
                        title="Smart fulfilment"
                        body="Regional print partners to shorten routes, reduce emissions and deliver faster."
                    />
                </ul>
            </section>

            {/* what print-on-demand solves */}
            <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10">
                <div
                    className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8"
                    style={{ clipPath: "polygon(1% 0,100% 0,98% 100%,0 100%)" }}
                >
                    <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-neutral-300 mt-0.5" />
                        <div>
                            <h2 className="text-xl md:text-2xl font-black tracking-tight">Why Print-on-Demand?</h2>
                            <p className="mt-2 text-neutral-300 max-w-3xl">
                                Traditional merch requires large up-front orders, storage, and guesswork. We produce <em>after</em> you order,
                                so bands avoid risky bulk runs and unsold inventory—and you get fresh pieces made just for you.
                            </p>
                        </div>
                    </div>

                    <ul className="mt-6 grid gap-4 md:grid-cols-3">
                        <Bullet icon={<Recycle className="h-4 w-4" />} title="Less waste" body="No excess stock. Every unit has a home." />
                        <Bullet icon={<Factory className="h-4 w-4" />} title="Efficient production" body="Modern lines with QC at every step." />
                        <Bullet icon={<Package className="h-4 w-4" />} title="Thoughtful packaging" body="Recyclable mailers and right-size packs." />
                    </ul>
                </div>
            </section>

            {/* materials & inks */}
            <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10">
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8">
                        <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-red-400" /> Materials
                        </h3>
                        <ul className="mt-3 space-y-2 text-sm text-neutral-300">
                            <li>• 100% cotton tees from audited suppliers (mix of ringspun and heavyweight). </li>
                            <li>• Hoodies with durable blends for long-life wear.</li>
                            <li>• Blank selection prioritises quality, longevity and consistent sizing.</li>
                        </ul>
                        <div className="mt-4 text-xs text-neutral-400">
                            Availability of specific blanks may vary by region to minimise transport miles.
                        </div>
                    </div>

                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8">
                        <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
                            <Droplets className="h-5 w-5 text-red-400" /> Inks & printing
                        </h3>
                        <ul className="mt-3 space-y-2 text-sm text-neutral-300">
                            <li>• Water-based, eco-friendly inks—soft hand feel with vivid colour.</li>
                            <li>• OEKO-TEX® certified chemistry; free from heavy metals and APEOs.</li>
                            <li>• Profiled DTG/Screen processes to reduce reprints and energy use.</li>
                        </ul>
                        <div className="mt-4 text-xs text-neutral-400">We continually tune cure temps and dwell times for efficiency.</div>
                    </div>
                </div>
            </section>

            {/* localised production */}
            <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8">
                    <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
                        <Truck className="h-5 w-5 text-red-400" /> Local first fulfilment
                    </h3>
                    <p className="mt-2 text-neutral-300 max-w-3xl">
                        We route orders to trusted regional print partners where possible. Shorter routes mean lower emissions,
                        better delivery times and product that hasn’t crossed the globe to reach you.
                    </p>
                    <ul className="mt-4 grid gap-3 md:grid-cols-3 text-sm text-neutral-300">
                        <li className="border border-neutral-800 rounded-xl p-3">• Fewer transport miles</li>
                        <li className="border border-neutral-800 rounded-xl p-3">• Faster delivery windows</li>
                        <li className="border border-neutral-800 rounded-xl p-3">• Region-appropriate blanks</li>
                    </ul>
                </div>
            </section>

            {/* certifications & policies */}
            <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10">
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8">
                        <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
                            <Shield className="h-5 w-5 text-red-400" /> Standards we align to
                        </h3>
                        <ul className="mt-3 space-y-2 text-sm text-neutral-300">
                            <li>• OEKO-TEX® Standard 100 inks and consumables.</li>
                            <li>• Suppliers with published social & environmental audits.</li>
                            <li>• Preference for WRAP/FairWear compliant blanks where available.</li>
                        </ul>
                        <p className="mt-4 text-xs text-neutral-400">
                            We’re transparent about inputs—contact us for a current materials sheet per style and print method.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8">
                        <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
                            <Recycle className="h-5 w-5 text-red-400" /> Packaging
                        </h3>
                        <ul className="mt-3 space-y-2 text-sm text-neutral-300">
                            <li>• Recyclable mailers and minimal void fill.</li>
                            <li>• Right-sized packs to reduce dimensional weight.</li>
                            <li>• Paper dunnage and paper invoice where needed.</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* care guide */}
            <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10">
                <div
                    className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8"
                    style={{ clipPath: "polygon(1% 0,100% 0,98% 100%,0 100%)" }}
                >
                    <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-red-400" /> Care & longevity
                    </h3>
                    <p className="mt-2 text-neutral-300">A few simple steps help your merch last longer (and consume less):</p>
                    <ul className="mt-3 grid gap-3 md:grid-cols-3 text-sm text-neutral-300">
                        <li className="border border-neutral-800 rounded-xl p-3">• Cold wash, gentle cycle</li>
                        <li className="border border-neutral-800 rounded-xl p-3">• Wash inside-out</li>
                        <li className="border border-neutral-800 rounded-xl p-3">• Line dry where possible</li>
                    </ul>
                </div>
            </section>

            {/* FAQ */}
            <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
                <h2 className="text-xl md:text-2xl font-black tracking-tight mb-4">Sustainability FAQ</h2>
                <ul className="divide-y divide-neutral-800 rounded-2xl border border-neutral-800 bg-neutral-900">
                    <Faq q="Is Print-on-Demand lower impact than bulk?"
                        a="In most cases, yes. The biggest driver is eliminating overproduction. We also shorten logistics by using regional partners and efficient packaging." />
                    <Faq q="Are your inks safe?"
                        a="We use water-based, OEKO-TEX certified inks that are free from heavy metals and APEOs. They’re cured for durability without harsh solvents." />
                    <Faq q="Where are products made?"
                        a="Orders are routed to regional print partners where possible (AU first), balancing quality, lead-time and distance travelled." />
                    <Faq q="Can I recycle the packaging?"
                        a="Yes—mailers are recyclable where facilities exist. We keep packaging minimal while protecting the garment." />
                </ul>
            </section>

            {/* contact / transparency */}
            <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-12">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg md:text-xl font-bold">Want the full materials sheet?</h3>
                        <p className="text-sm text-neutral-300 mt-1">
                            We’ll share current blanks, inks and partner info for any product.
                        </p>
                    </div>
                    <Link
                        href="/contact"
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-500"
                    >
                        Contact us
                    </Link>
                </div>
            </section>
        </main>
    );
}

/* ---------------- components ---------------- */

function PromiseCard({
    icon,
    title,
    body,
    accent = false,
}: {
    icon: React.ReactNode;
    title: string;
    body: string;
    accent?: boolean;
}) {
    return (
        <li
            className={`rounded-2xl border p-5 md:p-6 ${accent ? "border-red-500/30 bg-red-500/10" : "border-neutral-800 bg-neutral-900"
                }`}
            style={{ clipPath: "polygon(0% 0,100% 0,100% 100%,0 100%)" }}
        >
            <div className="flex items-start gap-3">
                <div className={accent ? "text-red-300" : "text-neutral-300"}>{icon}</div>
                <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm text-neutral-300 mt-1">{body}</p>
                </div>
            </div>
        </li>
    );
}

function Bullet({
    icon,
    title,
    body,
}: {
    icon: React.ReactNode;
    title: string;
    body: string;
}) {
    return (
        <li className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
            <div className="flex items-start gap-2">
                <span className="text-neutral-300">{icon}</span>
                <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{body}</p>
                </div>
            </div>
        </li>
    );
}

function Faq({ q, a }: { q: string; a: string }) {
    return (
        <li className="p-5 md:p-6">
            <p className="font-semibold">{q}</p>
            <p className="text-sm text-neutral-300 mt-1">{a}</p>
        </li>
    );
}
