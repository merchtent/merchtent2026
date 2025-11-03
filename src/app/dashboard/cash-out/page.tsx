// app/dashboard/cash-out/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import CashOutButton from "./CashOutButton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, PiggyBank, AlertTriangle, BadgePercent } from "lucide-react";

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

export default async function CashOutPage() {
    const supabase = getServerSupabase();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                {/* angled banner */}
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">CASH OUT // ACCESS</h1>
                            <span className="text-xs bg-neutral-900 text-white px-2 py-1 rounded rotate-[-2deg]">SIGN IN REQUIRED</span>
                        </div>
                    </div>
                </section>

                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        <p className="text-neutral-300">
                            Please <Link href="/auth/sign-in" className="underline">sign in</Link> to view your payouts.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    const { data: artist } = await supabase
        .from("artists")
        .select("id, display_name")
        .eq("user_id", user.id)
        .maybeSingle();

    if (!artist) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">CASH OUT // SETUP</h1>
                            <span className="text-xs bg-red-600 text-white px-2 py-1 rounded rotate-[2deg]">ACTION NEEDED</span>
                        </div>
                    </div>
                </section>

                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        <p className="text-neutral-300">No artist record found.</p>
                        <div className="mt-4">
                            <Button asChild>
                                <Link href="/auth/sign-up">Create artist profile</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

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

    if (error) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">CASH OUT // ERROR</h1>
                        </div>
                    </div>
                </section>
                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-red-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Error: {error.message}
                    </div>
                </div>
            </main>
        );
    }

    const totalCents =
        items?.reduce((sum, i: any) => {
            const product = Array.isArray(i.products) ? i.products[0] : i.products;
            const artistCut = product?.artist_cut_cents ?? 0;
            return sum + ((i.qty ?? 0) * artistCut);
        }, 0) ?? 0;

    const total = totalCents / 100;

    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* angled banner */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">Artist Dashboard</p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">{artist.display_name} // CASH OUT</h1>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-white">LIVE</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* summary + action */}
            <section className="max-w-5xl mx-auto px-4 py-8">
                <div className="grid md:grid-cols-[1fr_auto] gap-4 items-stretch">
                    <Card
                        className="bg-neutral-900 border-neutral-800"
                        style={{ clipPath: "polygon(2% 0,100% 0,98% 100%,0 100%)" }}
                    >
                        <CardContent className="p-5 md:p-6">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-neutral-400">Available to withdraw</p>
                                <PiggyBank className="h-4 w-4 text-neutral-300" />
                            </div>
                            <p className="mt-2 text-3xl font-black text-red-400">
                                {formatCurrency(total)}
                            </p>
                            <p className="mt-1 text-xs text-neutral-500 inline-flex items-center gap-1">
                                <BadgePercent className="h-3.5 w-3.5" />
                                Artist share only (after split)
                            </p>
                        </CardContent>
                    </Card>

                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 grid">
                        <CashOutButton disabled={!items?.length} />
                        <p className="mt-2 text-[11px] text-neutral-400">
                            Payouts may take 1–3 business days depending on your bank.
                        </p>
                    </div>
                </div>
            </section>

            {/* table or empty */}
            <section className="max-w-5xl mx-auto px-4 pb-12">
                {items?.length ? (
                    <div className="rounded-2xl border border-neutral-800 overflow-hidden">
                        <div className="bg-neutral-900/70 border-b border-neutral-800 px-4 py-3 text-sm text-neutral-300">
                            Unpaid items
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-left text-neutral-400 bg-neutral-950/50">
                                    <tr>
                                        <th className="py-2 px-4 font-medium">Product</th>
                                        <th className="py-2 px-2 font-medium">Qty</th>
                                        <th className="py-2 px-4 font-medium text-right">Earnings</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((i: any) => {
                                        const product = Array.isArray(i.products) ? i.products[0] : i.products;
                                        const artistCut = product?.artist_cut_cents ?? 0;
                                        const earn = ((i.qty ?? 0) * artistCut) / 100;

                                        return (
                                            <tr key={i.id} className="border-t border-neutral-800 hover:bg-neutral-900/40">
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
                        <div className="bg-neutral-900/70 border-t border-neutral-800 px-4 py-3 text-xs text-neutral-400 flex items-center gap-2">
                            <DollarSign className="h-3.5 w-3.5" />
                            Earnings shown reflect your artist cut per item.
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-neutral-300">
                        No unpaid sales at the moment.
                    </div>
                )}
            </section>
        </main>
    );
}
