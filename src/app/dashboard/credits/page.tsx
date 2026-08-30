import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BadgePercent, Coins, Receipt, TicketPercent } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const revalidate = 0;

type MerchCreditBalance = {
    points_balance: number | null;
    lifetime_points: number | null;
};

type MerchCreditLedgerRow = {
    id: string;
    points: number;
    reason: string;
    description: string | null;
    created_at: string;
};

type MerchCreditReservationRow = {
    id: string;
    points: number;
    discount_cents: number;
    currency: string | null;
    status: string | null;
    expires_at: string | null;
    created_at: string;
};

function fmtMoney(cents: number, currency = "AUD") {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format((cents || 0) / 100);
}

function fmtDate(value: string | null) {
    if (!value) return "No date";
    return new Date(value).toLocaleString("en-AU", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default async function DashboardCreditsPage() {
    const supabase = getServerSupabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/auth/sign-in");

    const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

    if (!profile?.onboarding_completed) redirect("/account/setup");

    const [{ data: balance, error: balanceError }, { data: ledger }, { data: reservations }] = await Promise.all([
        supabase
            .from("merch_credit_balances")
            .select("points_balance, lifetime_points")
            .eq("user_id", user.id)
            .maybeSingle(),
        supabase
            .from("merch_credit_ledger")
            .select("id, points, reason, description, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(30),
        supabase
            .from("merch_credit_reservations")
            .select("id, points, discount_cents, currency, status, expires_at, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(12),
    ]);

    if (balanceError) {
        logger.error("Fan credits page failed to load merch credit balance", {
            user_id: user.id,
            error: balanceError.message,
        });
    }

    const typedBalance = balance as MerchCreditBalance | null;
    const typedLedger = (ledger ?? []) as MerchCreditLedgerRow[];
    const typedReservations = (reservations ?? []) as MerchCreditReservationRow[];
    const points = typedBalance?.points_balance ?? 0;
    const lifetimePoints = typedBalance?.lifetime_points ?? 0;
    const progress = Math.min(points, 20);

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 bg-black p-5 md:p-8">
                <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                    <BadgePercent className="h-4 w-4" />
                    Fan credits
                </p>
                <h1 className="mt-3 max-w-4xl text-3xl font-black uppercase leading-tight md:text-5xl">
                    Back bands. Earn tees.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                    Your merch credits live here: points earned, rewards reserved, and the trail behind every movement.
                </p>
            </section>

            <section className="grid border-b border-neutral-800 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                    <div className="grid gap-px border border-neutral-800 bg-neutral-800 md:grid-cols-3">
                        <CreditStat label="Current points" value={balanceError ? "Unavailable" : `${points} pts`} icon={<Coins className="h-5 w-5" />} />
                        <CreditStat label="Lifetime earned" value={`${lifetimePoints} pts`} icon={<BadgePercent className="h-5 w-5" />} />
                        <CreditStat label="Reward target" value={`${progress}/20`} icon={<TicketPercent className="h-5 w-5" />} />
                    </div>
                    <div className="mt-6 border border-neutral-800 bg-neutral-950 p-5">
                        <div className="h-3 bg-neutral-800">
                            <div className="h-full bg-red-600" style={{ width: `${(progress / 20) * 100}%` }} />
                        </div>
                        <p className="mt-4 text-sm leading-6 text-neutral-400">
                            Earn 3 points for every tee purchased. Every 20 points can be reserved at checkout for a free tee discount.
                        </p>
                        <Link
                            href="/artists"
                            className="mt-5 inline-flex items-center gap-2 bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-500"
                        >
                            Browse artists <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>

                <div className="bg-neutral-950 p-5 md:p-8">
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                        Reward reservations
                    </p>
                    <h2 className="mt-2 text-4xl font-black uppercase leading-none">Redemption history.</h2>
                    <div className="mt-6 space-y-3">
                        {typedReservations.length ? (
                            typedReservations.map((reservation) => (
                                <div key={reservation.id} className="border border-neutral-800 bg-black p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="font-black uppercase">{reservation.points ?? 0} points reserved</p>
                                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                                                {reservation.status ?? "pending"}
                                            </p>
                                        </div>
                                        <p className="font-black text-red-400">
                                            {fmtMoney(reservation.discount_cents ?? 0, reservation.currency ?? "AUD")}
                                        </p>
                                    </div>
                                    {reservation.expires_at ? (
                                        <p className="mt-3 text-xs text-neutral-500">
                                            Expires {fmtDate(reservation.expires_at)}
                                        </p>
                                    ) : null}
                                </div>
                            ))
                        ) : (
                            <div className="border border-neutral-800 bg-black p-5 text-sm text-neutral-400">
                                No reward reservations yet.
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="p-5 md:p-8">
                <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                    <Receipt className="h-4 w-4" />
                    Credit ledger
                </p>
                <h2 className="mt-2 text-4xl font-black uppercase leading-none">Every point accounted for.</h2>
                <div className="mt-6 border border-neutral-800 bg-neutral-950">
                    {typedLedger.length ? (
                        typedLedger.map((entry) => (
                            <div key={entry.id} className="grid gap-3 border-b border-neutral-800 p-4 last:border-b-0 md:grid-cols-[auto_1fr_auto] md:items-center">
                                <p className={`text-2xl font-black ${Number(entry.points ?? 0) >= 0 ? "text-green-300" : "text-red-300"}`}>
                                    {Number(entry.points ?? 0) >= 0 ? "+" : ""}{entry.points ?? 0}
                                </p>
                                <div>
                                    <p className="font-black uppercase">{entry.reason?.replaceAll("_", " ") ?? "Credit movement"}</p>
                                    <p className="mt-1 text-sm text-neutral-400">{entry.description ?? "Merch credit account update"}</p>
                                </div>
                                <p className="text-xs uppercase text-neutral-500">{fmtDate(entry.created_at)}</p>
                            </div>
                        ))
                    ) : (
                        <p className="p-5 text-sm text-neutral-400">No credit ledger entries yet.</p>
                    )}
                </div>
            </section>
        </main>
    );
}

function CreditStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
    return (
        <div className="bg-black p-5">
            <div className="flex items-center justify-between gap-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-500">{label}</p>
                <div className="text-red-400">{icon}</div>
            </div>
            <p className="mt-3 text-3xl font-black uppercase leading-none">{value}</p>
        </div>
    );
}
