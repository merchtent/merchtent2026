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
                            <p className="text-xs text-neutral-600 mt-1">
                                Secure checkout – encrypted – powered by Stripe
                            </p>
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

            {/* Pass signed-in email if present; guests can type theirs */}
            <CheckoutShellClient userEmail={user?.email ?? ""} />
        </main>
    );
}
