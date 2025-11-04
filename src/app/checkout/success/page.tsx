// app/checkout/success/page.tsx
"use client";

import { useEffect } from "react";
import { useCart } from "@/components/CartProvider";
import Link from "next/link";
import { clearCartStorage } from "@/lib/cart/storage";
import { CheckCircle2, ArrowRight, Truck, Mail, Sparkles } from "lucide-react";
import ClearCheckoutDraft from "./ClearCheckoutDraft";

export default function SuccessPage() {
    const { clear, close } = useCart();

    useEffect(() => {
        // run once after mount
        clear();
        close();
        clearCartStorage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            <ClearCheckoutDraft />
            {/* angled banner */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-5xl mx-auto px-4 py-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-neutral-900 text-white grid place-items-center">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="uppercase tracking-[0.25em] text-[10px] text-red-600">Checkout</p>
                                <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">Order confirmed</h1>
                            </div>
                        </div>
                        <div
                            className="hidden md:block h-10 px-3 rounded-full border border-neutral-300 text-[12px]"
                            aria-hidden
                        >
                            A$ — Thank you!
                        </div>
                    </div>
                </div>
            </section>

            {/* body */}
            <section className="relative max-w-5xl mx-auto px-4 py-10">
                {/* subtle noise */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-soft-light"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle at 20% 10%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 30%, #fff 1px, transparent 1px)",
                        backgroundSize: "12px 12px, 14px 14px",
                    }}
                />

                <div className="relative grid md:grid-cols-3 gap-6">
                    {/* left: hero card */}
                    <div
                        className="md:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8"
                        style={{ clipPath: "polygon(6% 0,100% 0,100% 100%,0 100%)" }}
                    >
                        <div className="flex items-start gap-4">
                            <div className="shrink-0">
                                <div className="h-14 w-14 rounded-full grid place-items-center bg-emerald-600 text-white">
                                    <CheckCircle2 className="h-7 w-7" />
                                </div>
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl md:text-2xl font-black">Thanks! Your order is in.</h2>
                                <p className="mt-1 text-neutral-300">
                                    We’ve received your order and sent a receipt to your email.
                                </p>
                                <div className="mt-5 flex flex-wrap gap-3">
                                    <Link
                                        href="/"
                                        className="inline-flex items-center h-11 px-5 font-black tracking-wide bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 border border-red-500 rounded-xl"
                                        style={{ clipPath: "polygon(6% 0,100% 0,94% 100%,0 100%)" }}
                                    >
                                        Continue shopping <ArrowRight className="h-4 w-4 ml-2" />
                                    </Link>
                                    <Link
                                        href="/artists"
                                        className="inline-flex items-center h-11 px-4 rounded-xl border border-neutral-700 hover:bg-neutral-900"
                                    >
                                        Browse artists
                                    </Link>
                                    <Link
                                        href="/dashboard"
                                        className="inline-flex items-center h-11 px-4 rounded-xl border border-neutral-700 hover:bg-neutral-900"
                                    >
                                        Go to dashboard
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* what’s next */}
                        <div className="mt-8 grid sm:grid-cols-2 gap-4">
                            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                                <div className="flex items-center gap-2 text-neutral-300">
                                    <Mail className="h-4 w-4" />
                                    <p className="font-medium">Email receipt</p>
                                </div>
                                <p className="mt-1 text-sm text-neutral-400">
                                    Your confirmation email includes your order summary and a receipt.
                                </p>
                            </div>
                            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                                <div className="flex items-center gap-2 text-neutral-300">
                                    <Truck className="h-4 w-4" />
                                    <p className="font-medium">Shipping & tracking</p>
                                </div>
                                <p className="mt-1 text-sm text-neutral-400">
                                    You’ll get tracking as soon as your items leave the warehouse.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* right: recap card (generic) */}
                    <aside
                        className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 h-max"
                        style={{ clipPath: "polygon(6% 0,100% 0,94% 100%,0 100%)" }}
                    >
                        <h3 className="text-sm uppercase tracking-[0.25em] text-neutral-400">What’s next</h3>
                        <ul className="mt-4 space-y-3 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="mt-1 h-2 w-2 rounded-full bg-red-500" aria-hidden />
                                <div className="text-neutral-300">Check your inbox for the receipt</div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1 h-2 w-2 rounded-full bg-red-500" aria-hidden />
                                <div className="text-neutral-300">We’ll email tracking once it ships</div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1 h-2 w-2 rounded-full bg-red-500" aria-hidden />
                                <div className="text-neutral-300">Need help? Reply to your receipt email</div>
                            </li>
                        </ul>

                        <div className="mt-6 text-[11px] text-neutral-500">
                            Tip: Follow us on socials for drop alerts and tour exclusives.
                        </div>
                    </aside>
                </div>
            </section>
        </main>
    );
}
