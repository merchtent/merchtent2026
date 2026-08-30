// app/dashboard/cash-out/page.tsx
import Link from "next/link";
import { Suspense } from "react";
import CashOutButton from "./CashOutButton";
import StripeConnectButton from "./StripeConnectButton";
import StripeConnectReturnSync from "./StripeConnectReturnSync";
import { DollarSign, PiggyBank, AlertTriangle, BadgePercent, CreditCard, ArrowRight } from "lucide-react";
import { requireArtistPage } from "@/lib/auth/artist";
import { logger } from "@/lib/logger";

export const revalidate = 0;

function formatCurrency(amount: number, currency = "AUD") {
    try {
        return new Intl.NumberFormat("en-AU", {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `$${amount.toFixed(2)}`;
    }
}

type CashOutItem = {
    id: string;
    qty: number | null;
    title: string | null;
    product_id: string | null;
    products:
    | { artist_cut_cents: number | null }
    | { artist_cut_cents: number | null }[]
    | null;
};

export default async function CashOutPage() {
    const { supabase, artist } = await requireArtistPage();

    const { data: items, error } = await supabase
        .from("order_items")
        .select(`
      id,
      qty,
      title,
      product_id,
      cashed_out,
      products ( artist_cut_cents )
    `)
        .eq("artist_id", artist.id)
        .eq("cashed_out", false);

    const { data: paymentAccount } = await supabase
        .from("artist_payment_accounts")
        .select("onboarding_status, charges_enabled, payouts_enabled, details_submitted, disabled_reason, last_synced_at")
        .eq("artist_id", artist.id)
        .maybeSingle();

    if (error) {
        logger.error("Cash-out page failed to load unpaid items", {
            artist_id: artist.id,
            error: error.message,
        });

        return (
            <main className="min-h-screen bg-black text-white">
                <section className="border-b border-neutral-800 p-5 md:p-8">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-400">Artist dashboard</p>
                    <h1 className="mt-3 text-3xl font-black uppercase leading-tight md:text-5xl">Cash out error.</h1>
                </section>
                <div className="p-5 md:p-8">
                    <div className="border border-neutral-800 bg-neutral-950 p-6 text-red-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Could not load unpaid sales right now.
                    </div>
                </div>
            </main>
        );
    }

    const cashOutItems = (items ?? []) as CashOutItem[];
    const totalCents =
        cashOutItems.reduce((sum, i) => {
            const product = Array.isArray(i.products) ? i.products[0] : i.products;
            const artistCut = product?.artist_cut_cents ?? 0;
            return sum + ((i.qty ?? 0) * artistCut);
        }, 0) ?? 0;

    const total = totalCents / 100;
    const payoutsReady = Boolean(paymentAccount?.payouts_enabled && paymentAccount?.details_submitted);

    return (
        <main className="min-h-screen bg-black text-white">
            <Suspense fallback={null}>
                <StripeConnectReturnSync />
            </Suspense>
            <section className="border-b border-neutral-800 bg-black">
                <div className="grid lg:grid-cols-[1fr_auto]">
                    <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#b7ff3c]">Payout desk</p>
                        <h1 className="mt-3 text-3xl font-black uppercase leading-tight md:text-5xl">
                            {artist.display_name} cash out.
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                            Review unpaid artist earnings, confirm Stripe readiness, and request payout without losing the audit trail.
                        </p>
                    </div>
                    <div className="flex items-end p-5 md:p-8">
                        <Link
                            href="/dashboard/cash-outs"
                            className="inline-flex items-center gap-2 border border-neutral-700 px-5 py-3 text-sm font-black hover:border-red-500"
                        >
                            Payout history <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800">
                <div className="grid md:grid-cols-[1fr_360px]">
                    <div className="border-b border-r border-neutral-800 bg-neutral-950 p-5 md:p-8">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">Available to withdraw</p>
                            <PiggyBank className="h-5 w-5 text-[#b7ff3c]" />
                        </div>
                        <p className="mt-5 text-4xl font-black text-[#b7ff3c] md:text-5xl">
                            {formatCurrency(total)}
                        </p>
                        <p className="mt-3 text-xs text-neutral-500 inline-flex items-center gap-1">
                            <BadgePercent className="h-3.5 w-3.5" />
                            Artist share only after split
                        </p>
                    </div>

                    <div className="grid border-b border-neutral-800 bg-neutral-950 p-5 md:p-8">
                        <CashOutButton disabled={!cashOutItems.length || !payoutsReady} />
                        <p className="mt-2 text-[11px] text-neutral-400">
                            Stripe payouts must be connected before cash-out requests can be processed.
                        </p>
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800 p-5 md:p-8">
                <div className="border border-neutral-800 bg-neutral-950 p-5 md:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-neutral-300" />
                            <h2 className="text-lg font-black uppercase tracking-tight">Stripe payout account</h2>
                            </div>
                            <p className="mt-2 text-sm text-neutral-400">
                                {payoutsReady
                                    ? "Your Stripe account is payout-ready."
                                    : "Connect Stripe so Merch Tent can pay artist earnings without manual bank handling."}
                            </p>
                            {paymentAccount?.disabled_reason ? (
                                <p className="mt-2 text-xs text-red-300">
                                    Stripe restriction: {paymentAccount.disabled_reason}
                                </p>
                            ) : null}
                            {paymentAccount?.last_synced_at ? (
                                <p className="mt-2 text-[11px] text-neutral-500">
                                    Last checked {new Date(paymentAccount.last_synced_at).toLocaleString("en-AU")}
                                </p>
                            ) : null}
                        </div>
                        <div className="w-full md:w-72">
                            <StripeConnectButton connected={Boolean(paymentAccount)} />
                        </div>
                    </div>
                </div>
            </section>

            <section className="p-5 md:p-8">
                {cashOutItems.length ? (
                    <div className="overflow-hidden border border-neutral-800">
                        <div className="border-b border-neutral-800 bg-neutral-950 px-4 py-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#b7ff3c]">Unpaid items</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-black text-left text-neutral-400">
                                    <tr>
                                        <th className="py-2 px-4 font-medium">Product</th>
                                        <th className="py-2 px-2 font-medium">Qty</th>
                                        <th className="py-2 px-4 font-medium text-right">Earnings</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cashOutItems.map((i) => {
                                        const product = Array.isArray(i.products) ? i.products[0] : i.products;
                                        const artistCut = product?.artist_cut_cents ?? 0;
                                        const earn = ((i.qty ?? 0) * artistCut) / 100;

                                        return (
                                            <tr key={i.id} className="border-t border-neutral-800 bg-neutral-950 hover:bg-neutral-900">
                                                <td className="py-2 px-4">
                                                    {i.product_id ? (
                                                        <Link href={`/product/${i.product_id}`} className="underline">
                                                            {i.title}
                                                        </Link>
                                                    ) : (
                                                        i.title
                                                    )}
                                                </td>
                                                <td className="py-2 px-2">{i.qty}</td>
                                                <td className="py-2 px-4 text-right">
                                                    {formatCurrency(earn)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="border-t border-neutral-800 bg-black px-4 py-3 text-xs text-neutral-400 flex items-center gap-2">
                            <DollarSign className="h-3.5 w-3.5" />
                            Earnings shown reflect your artist cut per item.
                        </div>
                    </div>
                ) : (
                    <div className="border border-neutral-800 bg-neutral-950 p-6 text-neutral-300">
                        No unpaid sales at the moment.
                    </div>
                )}
            </section>
        </main>
    );
}
