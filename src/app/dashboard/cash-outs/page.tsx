// app/dashboard/cash-outs/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    AlertTriangle,
    DollarSign,
    Wallet,
    Clock,
    CheckCircle2,
} from "lucide-react";

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

function StatusPill({ status }: { status?: string | null }) {
    const s = (status ?? "").toLowerCase();
    const styles =
        s === "paid"
            ? "bg-green-500/15 text-green-300 border-green-500/30"
            : s === "pending"
                ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
                : "bg-neutral-500/10 text-neutral-300 border-neutral-700";
    return (
        <span className={`px-2 py-0.5 text-[11px] rounded-full border ${styles}`}>
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : "—"}
        </span>
    );
}

export default async function CashOutsPage() {
    const supabase = getServerSupabase();

    // Auth
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
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                CASH OUTS // ACCESS
                            </h1>
                            <span className="text-xs bg-neutral-900 text-white px-2 py-1 rounded rotate-[-2deg]">
                                SIGN IN REQUIRED
                            </span>
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

    // Artist
    const { data: artist, error: artistErr } = await supabase
        .from("artists")
        .select("id, display_name")
        .eq("user_id", user.id)
        .maybeSingle();

    if (artistErr || !artist) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                CASH OUTS // SETUP
                            </h1>
                        </div>
                    </div>
                </section>
                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-red-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Could not load your artist profile.
                    </div>
                </div>
            </main>
        );
    }

    // Cash out records
    const { data: cashOuts, error } = await supabase
        .from("cash_outs")
        .select("id, total_cents, status, created_at, updated_at")
        .eq("artist_id", artist.id)
        .order("created_at", { ascending: false });

    if (error) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                CASH OUTS // ERROR
                            </h1>
                        </div>
                    </div>
                </section>
                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-red-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Error loading payouts: {error.message}
                    </div>
                </div>
            </main>
        );
    }

    const totalPaidCents =
        cashOuts?.filter((c: any) => c.status === "paid").reduce((sum: number, c: any) => sum + (c.total_cents ?? 0), 0) ?? 0;

    const totalPendingCents =
        cashOuts?.filter((c: any) => c.status === "pending").reduce((sum: number, c: any) => sum + (c.total_cents ?? 0), 0) ?? 0;

    const totalPaid = totalPaidCents / 100;
    const totalPending = totalPendingCents / 100;

    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* angled banner */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">Artist Dashboard</p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                {artist.display_name} // CASH OUTS
                            </h1>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-white">LIVE</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* summary cards */}
            <section className="max-w-5xl mx-auto px-4 py-8">
                <div className="grid md:grid-cols-2 gap-4">
                    <SummaryCard
                        label="Total Paid"
                        value={formatCurrency(totalPaid)}
                        icon={<CheckCircle2 className="h-4 w-4" />}
                    />
                    <SummaryCard
                        label="Pending Payouts"
                        value={formatCurrency(totalPending)}
                        icon={<Clock className="h-4 w-4" />}
                        accent
                    />
                </div>
            </section>

            {/* list / empty */}
            <section className="max-w-5xl mx-auto px-4 pb-12">
                {!cashOuts?.length ? (
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        <p className="text-neutral-300">No cash outs yet.</p>
                        <div className="mt-4">
                            <Button asChild variant="secondary">
                                <Link href="/dashboard/cash-out">Go to Cash Out</Link>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-neutral-800 overflow-hidden">
                        <div className="bg-neutral-900/70 border-b border-neutral-800 px-4 py-3 text-sm text-neutral-300">
                            Payout history
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-left text-neutral-400 bg-neutral-950/50">
                                    <tr>
                                        <th className="py-2 px-4 font-medium">Date</th>
                                        <th className="py-2 px-4 font-medium">Amount</th>
                                        <th className="py-2 px-4 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cashOuts.map((c: any) => (
                                        <tr key={c.id} className="border-t border-neutral-800 hover:bg-neutral-900/40">
                                            <td className="py-2 px-4">
                                                {new Date(c.created_at).toLocaleDateString("en-AU", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </td>
                                            <td className="py-2 px-4">
                                                {formatCurrency((c.total_cents ?? 0) / 100)}
                                            </td>
                                            <td className="py-2 px-4">
                                                <StatusPill status={c.status} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* bottom rail */}
                        <div className="bg-neutral-900/70 border-t border-neutral-800 px-4 py-3 text-xs text-neutral-400 flex items-center gap-2">
                            <Wallet className="h-3.5 w-3.5" />
                            Payouts are processed to your saved bank details.
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}

/* ---------- UI Bits ---------- */
function SummaryCard({
    label,
    value,
    icon,
    accent,
}: {
    label: string;
    value: string;
    icon?: React.ReactNode;
    accent?: boolean;
}) {
    return (
        <Card
            className="bg-neutral-900 border-neutral-800"
            style={{ clipPath: "polygon(6% 0,100% 0,94% 100%,0 100%)" }}
        >
            <CardContent className="p-5 md:p-6">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-neutral-400">{label}</p>
                    {icon && <div className="text-neutral-300">{icon}</div>}
                </div>
                <p
                    className={`mt-2 text-2xl font-black ${accent ? "text-red-400" : "text-neutral-100"
                        }`}
                >
                    {value}
                </p>
            </CardContent>
        </Card>
    );
}
