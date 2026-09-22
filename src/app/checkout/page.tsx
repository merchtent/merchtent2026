// app/checkout/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, Truck } from "lucide-react";
import CheckoutShellClient from "./CheckoutShellClient";

export const revalidate = 0;

export default async function CheckoutPage() {
    const supabase = getServerSupabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    const [{ data: creditBalance }, { data: defaultAddress }] = user
        ? await Promise.all([
            supabase
                .from("merch_credit_balances")
                .select("points_balance")
                .eq("user_id", user.id)
                .maybeSingle(),
            supabase
                .from("customer_addresses")
                .select("first_name, last_name, line1, line2, city, state, postal_code, country, phone")
                .eq("user_id", user.id)
                .eq("is_default", true)
                .maybeSingle(),
        ])
        : [{ data: null }, { data: null }];

    return (
        <main className="min-h-screen bg-[#060606] text-white">
            <section className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(180,255,55,0.14),transparent_28%),linear-gradient(180deg,#080808,#111)]">
                <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[1.2fr_0.8fr] md:px-8 md:py-16">
                    <div>
                        <Link
                            href="/cart"
                            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-white/55 hover:text-[#b6ff3f]"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" /> Back to cart
                        </Link>
                        <p className="mt-8 text-xs font-black uppercase tracking-[0.35em] text-[#b6ff3f]">
                            Checkout
                        </p>
                        <h1 className="mt-3 text-5xl font-black uppercase leading-[0.86] md:text-7xl">
                            Shipping and payment.
                        </h1>
                        <p className="mt-5 max-w-2xl text-sm leading-6 text-white/65">
                            Secure payment, made-to-order fulfilment, and delivery updates once your merch leaves production.
                        </p>
                    </div>
                    <div className="grid content-end border border-white/10 bg-black/45">
                        <div className="grid grid-cols-2 border-b border-white/10">
                            <div className="border-r border-white/10 p-5">
                                <LockKeyhole className="h-5 w-5 text-[#b6ff3f]" />
                                <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-white/45">
                                    Stripe secured
                                </p>
                            </div>
                            <div className="p-5">
                                <Truck className="h-5 w-5 text-red-500" />
                                <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-white/45">
                                    Tracked delivery
                                </p>
                            </div>
                        </div>
                        <div className="p-5">
                            <p className="text-2xl font-black uppercase leading-tight">
                                Printed after checkout. No stock guessing.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="mx-auto max-w-7xl px-4 pt-8 md:px-8">
                <div className="flex items-center gap-2 border-y border-white/10 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white/40">
                    <span className="text-[#b6ff3f]">Cart</span>
                    <span>→</span>
                    <span className="text-[#b6ff3f]">Details</span>
                    <span>→</span>
                    <span>Payment</span>
                </div>
            </div>

            {/* Pass signed-in email if present; guests can type theirs */}
            <CheckoutShellClient
                userEmail={user?.email ?? ""}
                defaultAddress={defaultAddress}
                merchCreditBalance={creditBalance?.points_balance ?? 0}
                canUseMerchCredits={Boolean(user)}
            />
        </main>
    );
}
