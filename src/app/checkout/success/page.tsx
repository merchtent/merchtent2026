// app/checkout/success/page.tsx
"use client";

import { useEffect } from "react";
import { useCart } from "@/components/CartProvider";
import Link from "next/link";
import { clearCartStorage } from "@/lib/cart/storage";
import { CheckCircle2, ArrowRight, Truck, Mail, Sparkles } from "lucide-react";
import ClearCheckoutDraft from "./ClearCheckoutDraft";
import { useSearchParams } from "next/navigation";
import { trackMarketingEvent } from "@/lib/marketing/events";

export default function SuccessPage() {
    const { clear, close } = useCart();
    const searchParams = useSearchParams();

    useEffect(() => {
        clear();
        close();
        clearCartStorage();
    }, [clear, close]);

    useEffect(() => {
        const sessionId = searchParams.get("session_id");
        if (!sessionId) return;
        let cancelled = false;
        let attempt = 0;

        async function verifyPurchase() {
            attempt += 1;
            const response = await fetch(`/api/checkout/success?session_id=${encodeURIComponent(sessionId!)}`, {
                cache: "no-store",
            });
            const purchase = await response.json();
            if (cancelled) return;

            if (response.ok && purchase.status === "paid" && purchase.transaction_id) {
                const dedupeKey = `mt_purchase_tracked:${purchase.transaction_id}`;
                if (!sessionStorage.getItem(dedupeKey)) {
                    trackMarketingEvent("purchase", purchase);
                    sessionStorage.setItem(dedupeKey, "1");
                }
                return;
            }

            if (attempt < 6) window.setTimeout(verifyPurchase, attempt * 1500);
        }

        verifyPurchase().catch(() => undefined);
        return () => { cancelled = true; };
    }, [searchParams]);

    return (
        <main className="min-h-screen bg-[#060606] text-white">
            <ClearCheckoutDraft />
            <section className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(180,255,55,0.16),transparent_28%),linear-gradient(180deg,#080808,#111)]">
                <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-12 md:flex-row md:items-end md:justify-between md:px-8 md:py-16">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#b6ff3f]">Checkout</p>
                        <h1 className="mt-3 text-5xl font-black uppercase leading-[0.86] md:text-7xl">Order confirmed.</h1>
                        <p className="mt-5 max-w-2xl text-sm leading-6 text-white/65">
                            The order is in. We’ll send the receipt and tracking updates to your inbox.
                        </p>
                    </div>
                    <div className="hidden border border-white/10 bg-black/55 p-5 md:block">
                        <Sparkles className="h-8 w-8 text-[#b6ff3f]" />
                        <p className="mt-4 text-2xl font-black uppercase leading-tight">Thanks for backing the drop.</p>
                    </div>
                </div>
            </section>

            {/* body */}
            <section className="relative mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
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
                        className="md:col-span-2 border border-white/10 bg-[#f4f1e8] p-6 text-black md:p-8"
                    >
                        <div className="flex items-start gap-4">
                            <div className="shrink-0">
                                <div className="grid h-14 w-14 place-items-center bg-[#b6ff3f] text-black">
                                    <CheckCircle2 className="h-7 w-7" />
                                </div>
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-2xl font-black uppercase leading-tight md:text-3xl">Thanks. Your order is in.</h2>
                                <p className="mt-2 text-black/65">
                                    We’ve received your order and sent a receipt to your email.
                                </p>
                                <div className="mt-5 flex flex-wrap gap-3">
                                    <Link
                                        href="/"
                                        className="inline-flex h-11 items-center bg-red-600 px-5 font-black uppercase tracking-wide text-white hover:bg-red-500"
                                    >
                                        Continue shopping <ArrowRight className="h-4 w-4 ml-2" />
                                    </Link>
                                    <Link
                                        href="/artists"
                                        className="inline-flex h-11 items-center border border-black/15 px-4 font-black uppercase hover:bg-black hover:text-white"
                                    >
                                        Browse artists
                                    </Link>
                                    <Link
                                        href="/dashboard"
                                        className="inline-flex h-11 items-center border border-black/15 px-4 font-black uppercase hover:bg-black hover:text-white"
                                    >
                                        Go to dashboard
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* what’s next */}
                        <div className="mt-8 grid sm:grid-cols-2 gap-4">
                            <div className="border border-black/10 bg-white p-4">
                                <div className="flex items-center gap-2 text-black">
                                    <Mail className="h-4 w-4" />
                                    <p className="font-medium">Email receipt</p>
                                </div>
                                <p className="mt-1 text-sm text-black/60">
                                    Your confirmation email includes your order summary and a receipt.
                                </p>
                            </div>
                            <div className="border border-black/10 bg-white p-4">
                                <div className="flex items-center gap-2 text-black">
                                    <Truck className="h-4 w-4" />
                                    <p className="font-medium">Shipping & tracking</p>
                                </div>
                                <p className="mt-1 text-sm text-black/60">
                                    You’ll get tracking as soon as your items leave the warehouse.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* right: recap card (generic) */}
                    <aside
                        className="h-max border border-white/10 bg-black p-6"
                    >
                        <h3 className="text-xs font-black uppercase tracking-[0.28em] text-[#b6ff3f]">What’s next</h3>
                        <ul className="mt-4 space-y-3 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="mt-1 h-2 w-2 bg-red-500" aria-hidden />
                                <div className="text-white/70">Check your inbox for the order confirmation</div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1 h-2 w-2 bg-red-500" aria-hidden />
                                <div className="text-white/70">Your order will be sent to production (2 - 3 days to be made)</div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1 h-2 w-2 bg-red-500" aria-hidden />
                                <div className="text-white/70">We’ll email tracking once it ships</div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1 h-2 w-2 bg-red-500" aria-hidden />
                                <div className="text-white/70">Need help? Reply to your confirmation email</div>
                            </li>
                        </ul>

                        <div className="mt-6 text-[11px] uppercase tracking-[0.12em] text-white/40">
                            Tip: Follow us on socials for drop alerts and tour exclusives.
                        </div>
                    </aside>
                </div>
            </section>
        </main>
    );
}
