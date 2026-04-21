// app/checkout/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CheckoutShellClient from "./CheckoutShellClient";

export const revalidate = 0;

export default async function CheckoutPage() {
    const supabase = getServerSupabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* angled banner */}
            <section className="relative py-0 mb-6">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">
                                Checkout
                            </p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                Shipping &amp; Payment
                            </h1>
                            <div className="text-[12px] text-neutral-400 mt-2 space-y-1">
                                <p>• Secure payment powered by Stripe</p>
                                <p>• Printed locally in Australia</p>
                                <p>• Tracked delivery on all orders</p>
                            </div>
                        </div>
                        <Link
                            href="/cart"
                            className="inline-flex items-center gap-2 text-xs border px-3 py-1 rounded-lg"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" /> Back to cart
                        </Link>
                    </div>
                </div>
            </section>

            <div className="max-w-5xl mx-auto px-4 mt-6 mb-4">
                <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                    <span className="text-white">Cart</span>
                    <span>→</span>
                    <span className="text-white">Details</span>
                    <span>→</span>
                    <span className="text-neutral-500">Payment</span>
                </div>
            </div>

            {/* Pass signed-in email if present; guests can type theirs */}
            <CheckoutShellClient userEmail={user?.email ?? ""} />
        </main>
    );
}
