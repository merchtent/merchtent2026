// app/size-guide/page.tsx
import Link from "next/link";

export const revalidate = 60;

export default function SizeGuidePage() {
    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* Breadcrumbs */}
            <nav className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-4 text-xs text-neutral-400">
                <Link href="/" className="hover:underline">Home</Link> /{" "}
                <Link href="/#grid" className="hover:underline">Shop</Link> /{" "}
                <span className="text-neutral-200">Size Guide</span>
            </nav>

            {/* Angled banner */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">Support</p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">Size Guide</h1>
                        </div>
                        <span className="text-xs bg-neutral-900 text-white px-2 py-1 rounded rotate-[-2deg]">FIT</span>
                    </div>
                </div>
            </section>

            <section className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-8">
                {/* TEES */}
                <article
                    className="rounded-2xl border border-neutral-800 bg-neutral-900"
                    style={{ clipPath: "polygon(1% 0,100% 0,100% 100%,0 100%)" }}
                >
                    <header className="px-5 md:px-6 py-5 border-b border-neutral-800">
                        <h2 className="text-lg md:text-xl font-bold">Tee Shirts — Unisex</h2>
                        <p className="text-sm text-neutral-400 mt-1">
                            Measurements are taken garment-flat. For best results, compare to a tee you already own.
                        </p>
                    </header>

                    {/* Table */}
                    <div className="px-5 md:px-6 py-5 overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="text-neutral-400 border-b border-neutral-800">
                                    <th className="py-2 pr-3 text-left">Measurement (cm)</th>
                                    <th className="py-2 px-3 text-right">S</th>
                                    <th className="py-2 px-3 text-right">M</th>
                                    <th className="py-2 px-3 text-right">L</th>
                                    <th className="py-2 px-3 text-right">XL</th>
                                    <th className="py-2 pl-3 text-right">2XL</th>
                                </tr>
                            </thead>
                            <tbody className="text-neutral-200">
                                <tr className="border-t border-neutral-800">
                                    <td className="py-2 pr-3 text-neutral-300">Width</td>
                                    <td className="py-2 px-3 text-right">45.72</td>
                                    <td className="py-2 px-3 text-right">50.80</td>
                                    <td className="py-2 px-3 text-right">55.88</td>
                                    <td className="py-2 px-3 text-right">60.96</td>
                                    <td className="py-2 pl-3 text-right">66.04</td>
                                </tr>
                                <tr className="border-t border-neutral-800">
                                    <td className="py-2 pr-3 text-neutral-300">Length</td>
                                    <td className="py-2 px-3 text-right">71.12</td>
                                    <td className="py-2 px-3 text-right">73.66</td>
                                    <td className="py-2 px-3 text-right">76.20</td>
                                    <td className="py-2 px-3 text-right">78.74</td>
                                    <td className="py-2 pl-3 text-right">81.28</td>
                                </tr>
                                <tr className="border-t border-neutral-800">
                                    <td className="py-2 pr-3 text-neutral-300">Sleeve length</td>
                                    <td className="py-2 px-3 text-right">20.90</td>
                                    <td className="py-2 px-3 text-right">21.60</td>
                                    <td className="py-2 px-3 text-right">22.20</td>
                                    <td className="py-2 px-3 text-right">22.90</td>
                                    <td className="py-2 pl-3 text-right">23.50</td>
                                </tr>
                                <tr className="border-t border-neutral-800">
                                    <td className="py-2 pr-3 text-neutral-300">Size tolerance</td>
                                    <td className="py-2 px-3 text-right">± 3.81</td>
                                    <td className="py-2 px-3 text-right">± 3.81</td>
                                    <td className="py-2 px-3 text-right">± 3.81</td>
                                    <td className="py-2 px-3 text-right">± 3.81</td>
                                    <td className="py-2 pl-3 text-right">± 3.81</td>
                                </tr>
                            </tbody>
                        </table>

                        <p className="text-xs text-neutral-500 mt-3">
                            <span className="font-medium text-neutral-400">Width</span> = armpit to armpit (half-chest).{" "}
                            <span className="font-medium text-neutral-400">Length</span> = shoulder to hem.{" "}
                            <span className="font-medium text-neutral-400">Sleeve</span> = shoulder seam to sleeve hem.{" "}
                            Tolerance reflects normal manufacturing variance.
                        </p>
                    </div>

                    {/* Fit tips rail */}
                    <div className="px-5 md:px-6 py-5 border-t border-neutral-800 bg-neutral-900/70 grid md:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-neutral-800 p-4">
                            <p className="text-sm text-neutral-300">
                                Between sizes? For a relaxed/boxy fit, size up. For a closer fit, choose your usual size.
                            </p>
                        </div>
                        <div className="rounded-xl border border-neutral-800 p-4">
                            <p className="text-sm text-neutral-300">
                                Still unsure? <Link href="/contact" className="underline">Contact us</Link> and we’ll help with fit.
                            </p>
                        </div>
                    </div>
                </article>

                {/* Placeholder for Hoodies (add later) */}
                <article
                    className="rounded-2xl border border-neutral-800 bg-neutral-900 opacity-70"
                    style={{ clipPath: "polygon(1% 0,100% 0,100% 100%,0 100%)" }}
                >
                    <div className="px-5 md:px-6 py-5">
                        <h2 className="text-lg md:text-xl font-bold">Hoodies</h2>
                        <p className="text-neutral-400 text-sm mt-1">
                            Measurements are taken garment-flat. For best results, compare to a tee you already own.
                        </p>
                    </div>

                    <div className="px-5 md:px-6 py-5 overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="text-neutral-400 border-b border-neutral-800">
                                    <th className="py-2 pr-3 text-left">Measurement (in)</th>
                                    <th className="py-2 px-3 text-right">S</th>
                                    <th className="py-2 px-3 text-right">M</th>
                                    <th className="py-2 px-3 text-right">L</th>
                                    <th className="py-2 px-3 text-right">XL</th>
                                    <th className="py-2 px-3 text-right">2XL</th>
                                    <th className="py-2 pl-3 text-right">3XL</th>
                                </tr>
                            </thead>
                            <tbody className="text-neutral-200">
                                <tr className="border-t border-neutral-800">
                                    <td className="py-2 pr-3 text-neutral-300">Width</td>
                                    <td className="py-2 px-3 text-right">20.08</td>
                                    <td className="py-2 px-3 text-right">22.05</td>
                                    <td className="py-2 px-3 text-right">24.02</td>
                                    <td className="py-2 px-3 text-right">25.98</td>
                                    <td className="py-2 px-3 text-right">27.99</td>
                                    <td className="py-2 pl-3 text-right">29.92</td>
                                </tr>
                                <tr className="border-t border-neutral-800">
                                    <td className="py-2 pr-3 text-neutral-300">Length</td>
                                    <td className="py-2 px-3 text-right">27.17</td>
                                    <td className="py-2 px-3 text-right">27.95</td>
                                    <td className="py-2 px-3 text-right">29.13</td>
                                    <td className="py-2 px-3 text-right">29.92</td>
                                    <td className="py-2 px-3 text-right">31.10</td>
                                    <td className="py-2 pl-3 text-right">31.89</td>
                                </tr>
                                <tr className="border-t border-neutral-800">
                                    <td className="py-2 pr-3 text-neutral-300">Sleeve length (center back)</td>
                                    <td className="py-2 px-3 text-right">33.50</td>
                                    <td className="py-2 px-3 text-right">34.50</td>
                                    <td className="py-2 px-3 text-right">35.50</td>
                                    <td className="py-2 px-3 text-right">36.50</td>
                                    <td className="py-2 px-3 text-right">37.50</td>
                                    <td className="py-2 pl-3 text-right">38.50</td>
                                </tr>
                                <tr className="border-t border-neutral-800">
                                    <td className="py-2 pr-3 text-neutral-300">Size tolerance</td>
                                    <td className="py-2 px-3 text-right">± 1.50</td>
                                    <td className="py-2 px-3 text-right">± 1.50</td>
                                    <td className="py-2 px-3 text-right">± 1.50</td>
                                    <td className="py-2 px-3 text-right">± 1.50</td>
                                    <td className="py-2 px-3 text-right">± 1.50</td>
                                    <td className="py-2 pl-3 text-right">± 1.50</td>
                                </tr>
                            </tbody>
                        </table>

                        <p className="text-xs text-neutral-500 mt-3">
                            <span className="font-medium text-neutral-400">Width</span> = armpit to armpit (half-chest).{" "}
                            <span className="font-medium text-neutral-400">Length</span> = shoulder to hem.{" "}
                            <span className="font-medium text-neutral-400">Sleeve</span> = from center back of neck to sleeve hem.{" "}
                            Tolerance reflects normal manufacturing variance.{" "}
                            <span className="font-medium text-neutral-400">Units</span>: inches.
                        </p>
                    </div>

                </article>

                {/* Help rail */}
                <section
                    className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 flex items-center justify-between"
                    style={{ clipPath: "polygon(1% 0,100% 0,100% 100%,0 100%)" }}
                >
                    <div>
                        <p className="text-sm text-neutral-300">Need help choosing a size?</p>
                        <p className="font-semibold">Our team can recommend the best fit.</p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/contact" className="rounded-xl border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800">
                            Contact Us
                        </Link>
                        <Link href="/shipping-and-returns" className="rounded-xl bg-red-600 text-white px-4 py-2 text-sm hover:bg-red-500">
                            Shipping & Returns
                        </Link>
                    </div>
                </section>
            </section>
        </main>
    );
}
