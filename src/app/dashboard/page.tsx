// app/dashboard/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowRight, BadgePercent, ClipboardCheck, DollarSign, Gift, Image as ImageIcon, Megaphone, Package, PenTool, Receipt, Settings, ShieldCheck, Shirt, ShoppingCart, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

type FanOrder = {
    id: string;
    created_at: string;
    status: string | null;
    total_cents: number | null;
    currency: string | null;
};

type MerchCreditBalance = {
    points_balance: number | null;
    lifetime_points: number | null;
};

type MerchCreditLedgerRow = {
    id: string;
    points: number | null;
    reason: string | null;
    description: string | null;
    created_at: string;
};

type MerchCreditReservationRow = {
    id: string;
    points: number | null;
    discount_cents: number | null;
    currency: string | null;
    status: string | null;
    expires_at: string | null;
    created_at: string;
};

export default async function DashboardPage() {
    const supabase = getServerSupabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return (
            <main className="min-h-screen bg-black text-white">
                <section className="border-b border-neutral-800 p-5 md:p-8">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-400">Backstage access</p>
                    <h1 className="mt-3 text-3xl font-black uppercase leading-tight md:text-5xl">Please sign in.</h1>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                        You need to be signed in to access the dashboard.
                    </p>
                </section>
                <div className="p-5 md:p-8">
                    <div className="border border-neutral-800 bg-neutral-950 p-6">
                        <Link href="/auth/sign-in" className="inline-flex bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-500">
                            Go to sign in
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("account_type, display_name, onboarding_completed, role")
        .eq("id", user.id)
        .maybeSingle();

    if (!profile?.account_type || !profile.onboarding_completed) {
        return (
            <main className="min-h-screen bg-black text-white">
                <section className="border-b border-neutral-800 p-5 md:p-8">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-400">Account setup</p>
                    <h1 className="mt-3 text-3xl font-black uppercase leading-tight md:text-5xl">Finish setup.</h1>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                        Choose whether you want to use Merch Tent as a fan or artist.
                    </p>
                </section>
                <div className="p-5 md:p-8">
                    <div className="border border-neutral-800 bg-neutral-950 p-6">
                        <Button asChild>
                            <Link href="/account/setup">Continue setup</Link>
                        </Button>
                    </div>
                </div>
            </main>
        );
    }

    // Find artist record
    const { data: artist } = await supabase
        .from("artists")
        .select("id, display_name")
        .eq("user_id", user.id)
        .maybeSingle();

    if (profile.account_type === "fan" || !artist) {
        const [
            { data: orders },
            { data: balance, error: balanceError },
            { data: creditLedger },
            { data: creditReservations },
        ] = await Promise.all([
            supabase
                .from("orders")
                .select("id, created_at, status, total_cents, currency")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(5),
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
                .limit(6),
            supabase
                .from("merch_credit_reservations")
                .select("id, points, discount_cents, currency, status, expires_at, created_at")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(4),
        ]);

        if (balanceError) {
            logger.error("Fan dashboard failed to load merch credit balance", {
                user_id: user.id,
                error: balanceError.message,
            });
        }

        return (
            <FanDashboard
                displayName={profile.display_name ?? user.email ?? "Fan"}
                isAdmin={profile.role === "admin"}
                orders={(orders ?? []) as FanOrder[]}
                balance={balance as MerchCreditBalance | null}
                balanceUnavailable={Boolean(balanceError)}
                creditLedger={(creditLedger ?? []) as MerchCreditLedgerRow[]}
                creditReservations={(creditReservations ?? []) as MerchCreditReservationRow[]}
            />
        );
    }

    // Helpers
    const fmtMoney = (cents: number, currency = "AUD") =>
        new Intl.NumberFormat("en-AU", { style: "currency", currency }).format((cents || 0) / 100);

    // Parallel queries
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const [
        // live products count
        liveProductsRes,
        // last 7d sales (units + profit)
        sales7dRes,
        // unpaid (payout ready)
        unpaidRes,
    ] = await Promise.all([
        supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("artist_id", artist.id)
            .eq("is_published", true),
        supabase
            .from("order_items")
            .select(
                `
        id,
        qty,
        products ( artist_cut_cents ),
        orders ( created_at )
      `
            )
            .eq("artist_id", artist.id)
            .gte("orders.created_at", since.toISOString()),
        supabase
            .from("order_items")
            .select(
                `
        id,
        qty,
        cashed_out,
        products ( artist_cut_cents )
      `
            )
            .eq("artist_id", artist.id)
            .eq("cashed_out", false),
    ]);

    const liveCount = liveProductsRes.count ?? 0;

    // Compute last 7d units + profit (artist cut)
    const sales7dRows = (sales7dRes.data ?? []) as Array<{
        qty: number | null;
        products: { artist_cut_cents: number | null } | { artist_cut_cents: number | null }[] | null;
    }>;
    const units7d =
        sales7dRows.reduce((sum, row) => sum + (row.qty ?? 0), 0) ?? 0;
    const profit7dCents =
        sales7dRows.reduce((sum, row) => {
            const prod = Array.isArray(row.products) ? row.products[0] : row.products;
            const cut = prod?.artist_cut_cents ?? 0;
            return sum + (row.qty ?? 0) * cut;
        }, 0) ?? 0;

    // Compute unpaid (payout ready)
    const unpaidRows = (unpaidRes.data ?? []) as Array<{
        qty: number | null;
        products: { artist_cut_cents: number | null } | { artist_cut_cents: number | null }[] | null;
    }>;
    const unpaidItems = unpaidRows.length;
    const unpaidCents =
        unpaidRows.reduce((sum, row) => {
            const prod = Array.isArray(row.products) ? row.products[0] : row.products;
            const cut = prod?.artist_cut_cents ?? 0;
            return sum + (row.qty ?? 0) * cut;
        }, 0) ?? 0;

    return (
        <main className="min-h-screen bg-black text-white">
            {profile.role === "admin" ? <AdminDashboardCallout /> : null}
            <section className="border-b border-neutral-800 bg-black">
                <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="border-b border-neutral-800 p-5 md:p-10 lg:border-b-0 lg:border-r">
                        <p className="inline-flex bg-lime-300 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-black">
                            Artist dashboard
                        </p>
                        <h1 className="mt-5 max-w-4xl text-5xl font-black uppercase leading-[0.86] md:text-7xl">
                            {artist.display_name} control room.
                        </h1>
                        <p className="mt-5 max-w-2xl text-base font-bold leading-7 text-neutral-300 md:text-lg">
                            Build products, publish drops, see what sold, and keep your artist page ready for fans.
                        </p>
                        <div className="mt-7 flex flex-wrap gap-3">
                            <Link
                                href="/dashboard/products/designer"
                                className="inline-flex items-center gap-2 bg-lime-300 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-black hover:bg-lime-200"
                            >
                                Open designer
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/dashboard/sales"
                                className="inline-flex items-center gap-2 border border-neutral-700 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] hover:border-lime-300 hover:text-lime-300"
                            >
                                Review sales
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 border-b border-neutral-800 lg:border-b-0 lg:grid-cols-1">
                        <StatCard
                            label="Live products"
                            value={String(liveCount)}
                            sub={liveCount === 0 ? "Add your first drop" : `${liveCount} live ${liveCount === 1 ? "item" : "items"}`}
                            icon={<Package className="h-5 w-5" />}
                        />
                        <StatCard
                            label="Sales this week"
                            value={fmtMoney(profit7dCents, "AUD")}
                            sub={units7d === 0 ? "No sales yet" : `${units7d} ${units7d === 1 ? "unit" : "units"}`}
                            icon={<BadgePercent className="h-5 w-5" />}
                        />
                        <StatCard
                            label="Payout ready"
                            value={fmtMoney(unpaidCents, "AUD")}
                            sub={unpaidItems === 0 ? "Connect sales first" : `${unpaidItems} unpaid ${unpaidItems === 1 ? "item" : "items"}`}
                            icon={<DollarSign className="h-5 w-5" />}
                        />
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-[#f3f1e8] text-black">
                <div className="grid md:grid-cols-2 xl:grid-cols-4">
                    <ActionCard
                        href="/dashboard/products/designer"
                        title="Design product"
                        body="Choose a blank, place your artwork, preview the mockup, then save or publish."
                        icon={<PenTool className="h-6 w-6" />}
                        pill="Best next move"
                    />
                    <ActionCard
                        href="/dashboard/products"
                        title="Your products"
                        body="See drafts and live drops, then check what is ready for the shop."
                        icon={<Shirt className="h-6 w-6" />}
                        pill="Inventory"
                    />
                    <ActionCard
                        href="/dashboard/sales"
                        title="Sales"
                        body="See what fans bought, quantities sold, and artist earnings."
                        icon={<ShoppingCart className="h-6 w-6" />}
                        pill="Revenue"
                    />
                    <ActionCard
                        href="/dashboard/cash-out"
                        title="Payouts"
                        body="Connect Stripe and manage money ready to be paid out."
                        icon={<DollarSign className="h-6 w-6" />}
                        pill="Money"
                    />
                    <ActionCard
                        href="/dashboard/account"
                        title="Account controls"
                        body="Change login details, password, account mode, and closure settings."
                        icon={<Settings className="h-6 w-6" />}
                        pill="Security"
                    />
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-black">
                <div className="grid lg:grid-cols-[0.75fr_1.25fr]">
                    <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">
                            Next best actions
                        </p>
                        <h2 className="mt-2 text-4xl font-black uppercase leading-[0.9] md:text-5xl">
                            Keep the drop moving without hunting around.
                        </h2>
                        <p className="mt-4 text-sm leading-6 text-neutral-400">
                            The usual artist jobs are gathered here: design, profile, sales, payouts, account.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2">
                        <ChecklistItem href="/dashboard/products/designer" title="Create the next product" body="Open the designer and launch from saved design data." icon={<Sparkles className="h-5 w-5" />} />
                        <ChecklistItem href="/dashboard/cash-outs" title="Review payout history" body="Audit what has already been requested or transferred." icon={<Receipt className="h-5 w-5" />} />
                        <ChecklistItem href="/dashboard/artist" title="Tune artist profile" body="Update image, name, and storefront presentation." icon={<UserRound className="h-5 w-5" />} />
                        <ChecklistItem href="/dashboard/images" title="Manage artwork" body="Check product image outputs and mockup assets." icon={<ImageIcon className="h-5 w-5" />} />
                        <ChecklistItem href="/dashboard/sales" title="Review recent sales" body="See what sold, how many units moved, and what fans are backing." icon={<ClipboardCheck className="h-5 w-5" />} />
                        <ChecklistItem href="/dashboard/account" title="Secure account access" body="Manage email, password, sessions, and closure requests." icon={<Settings className="h-5 w-5" />} />
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-red-600 text-white">
                <div className="grid lg:grid-cols-[1fr_auto]">
                    <div className="border-b border-black/20 p-5 md:p-7 lg:border-b-0 lg:border-r">
                        <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-black">
                            <Megaphone className="h-4 w-4" />
                            Artist note
                        </p>
                        <h2 className="mt-3 max-w-4xl text-3xl font-black uppercase leading-tight md:text-4xl">
                            Start small, keep the product clean, and make the next drop better.
                        </h2>
                    </div>
                    <div className="flex items-center p-5 md:p-7">
                        <Link
                            href="/dashboard/products/designer"
                            className="inline-flex items-center gap-2 bg-black px-5 py-3 text-sm font-black text-white hover:bg-neutral-900"
                        >
                            Start a product
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}

/* ---------- UI Bits ---------- */

function AdminDashboardCallout() {
    return (
        <section className="border-b border-red-500 bg-red-600 text-white">
            <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-black/20 bg-black text-lime-300">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black">
                            Admin access
                        </p>
                        <h2 className="mt-1 text-2xl font-black uppercase leading-tight md:text-3xl">
                            Open the backstage admin panel.
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm font-medium text-white/90">
                            Manage artists, catalogue imports, orders, fulfilment, operations and platform settings.
                        </p>
                    </div>
                </div>
                <Link
                    href="/admin"
                    className="inline-flex h-12 items-center justify-center gap-2 bg-lime-300 px-5 text-sm font-black uppercase text-black hover:bg-lime-200"
                >
                    Go to admin
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </section>
    );
}

function FanDashboard({
    displayName,
    isAdmin,
    orders,
    balance,
    balanceUnavailable,
    creditLedger,
    creditReservations,
}: {
    displayName: string;
    isAdmin: boolean;
    orders: FanOrder[];
    balance: MerchCreditBalance | null;
    balanceUnavailable: boolean;
    creditLedger: MerchCreditLedgerRow[];
    creditReservations: MerchCreditReservationRow[];
}) {
    const points = balance?.points_balance ?? 0;
    const lifetimePoints = balance?.lifetime_points ?? 0;
    const freeTeeProgress = Math.min(points, 20);
    const creditValue = balanceUnavailable ? "Unavailable" : `${points} pts`;
    const creditSub = balanceUnavailable
        ? "Credit balance could not be loaded right now"
        : `${freeTeeProgress}/20 toward a free tee`;

    const fmtMoney = (cents: number, currency = "AUD") =>
        new Intl.NumberFormat("en-AU", { style: "currency", currency }).format((cents || 0) / 100);

    return (
        <main className="min-h-screen bg-black text-white">
            {isAdmin ? <AdminDashboardCallout /> : null}
            <section className="border-b border-neutral-800 bg-black">
                <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="border-b border-neutral-800 p-5 md:p-10 lg:border-b-0 lg:border-r">
                        <p className="inline-flex bg-lime-300 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-black">
                            Fan dashboard
                        </p>
                        <h1 className="mt-5 max-w-4xl text-5xl font-black uppercase leading-[0.86] md:text-7xl">
                            {displayName} merch hub.
                        </h1>
                        <p className="mt-5 max-w-2xl text-base font-bold leading-7 text-neutral-300 md:text-lg">
                            Track orders, watch credits build, and keep close to the artists you backed early.
                        </p>
                        <div className="mt-7 flex flex-wrap gap-3">
                            <Link
                                href="/new"
                                className="inline-flex items-center gap-2 bg-lime-300 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-black hover:bg-lime-200"
                            >
                                Shop new drops
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/artists"
                                className="inline-flex items-center gap-2 border border-neutral-700 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] hover:border-lime-300 hover:text-lime-300"
                            >
                                Browse artists
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 border-b border-neutral-800 lg:border-b-0 lg:grid-cols-1">
                        <StatCard
                            label="Merch credits"
                            value={creditValue}
                            sub={creditSub}
                            icon={<Gift className="h-5 w-5" />}
                        />
                        <StatCard
                            label="Lifetime points"
                            value={`${lifetimePoints} pts`}
                            sub="Earn 3 points per tee"
                            icon={<BadgePercent className="h-5 w-5" />}
                        />
                        <StatCard
                            label="Recent orders"
                            value={String(orders.length)}
                            sub={orders.length ? "Purchases on file" : "No orders yet"}
                            icon={<Receipt className="h-5 w-5" />}
                        />
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-[#f3f1e8] text-black">
                <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
                    <div className="border-b border-neutral-300 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-600">
                                    Order history
                                </p>
                                <h2 className="mt-2 text-4xl font-black uppercase leading-none">
                                    Recent purchases.
                                </h2>
                            </div>
                            <Link href="/dashboard/orders" className="text-sm font-black text-red-600 hover:text-black">
                            View all
                        </Link>
                        </div>
                        {!orders.length ? (
                            <div className="mt-6 border border-neutral-300 bg-white p-6">
                                <p className="text-sm text-neutral-600">
                                    No orders yet. Find a new favourite artist and start earning credits.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-6 border border-neutral-300">
                                {orders.map((order) => (
                                    <Link
                                        key={order.id}
                                        href={`/dashboard/orders/${order.id}`}
                                        className="grid gap-3 border-b border-neutral-300 bg-white p-4 last:border-b-0 hover:bg-lime-50 md:grid-cols-[1fr_auto]"
                                    >
                                        <div>
                                            <p className="font-black">Order {order.id.slice(0, 8)}</p>
                                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                                                {new Date(order.created_at).toLocaleDateString("en-AU")}
                                            </p>
                                        </div>
                                        <div className="text-left md:text-right">
                                            <p className="font-black">
                                                {fmtMoney(order.total_cents ?? 0, order.currency ?? "AUD")}
                                            </p>
                                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-red-600">
                                                {order.status ?? "paid"}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-black p-5 text-white md:p-8">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">
                            Merch credits
                        </p>
                        <h2 className="mt-2 text-4xl font-black uppercase leading-none">
                            Back bands. Earn tees.
                        </h2>
                        <div className="mt-6 h-3 overflow-hidden bg-neutral-800">
                            <div
                                className="h-full bg-lime-300"
                                style={{ width: `${balanceUnavailable ? 0 : (freeTeeProgress / 20) * 100}%` }}
                            />
                        </div>
                        <p className="mt-4 text-sm leading-6 text-neutral-400">
                            {balanceUnavailable
                                ? "Your orders are available, but the credit balance could not be loaded right now."
                                : "Earn 3 points for every tee purchased. Every 20 points can be reserved at checkout for a free tee discount."}
                        </p>
                        <Button asChild className="mt-5 w-full bg-lime-300 font-black text-black hover:bg-lime-200">
                            <Link href="/artists">Browse artists</Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section id="merch-credits" className="border-b border-neutral-800 bg-black">
                <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                            Credit ledger
                        </p>
                        <h2 className="mt-2 text-4xl font-black uppercase leading-none">
                            Every point accounted for.
                        </h2>
                        <div className="mt-6 border border-neutral-800 bg-neutral-950">
                            {creditLedger.length ? (
                                creditLedger.map((entry) => (
                                    <div key={entry.id} className="grid gap-3 border-b border-neutral-800 p-4 last:border-b-0 md:grid-cols-[auto_1fr_auto] md:items-center">
                                        <p className={`text-2xl font-black ${Number(entry.points ?? 0) >= 0 ? "text-green-300" : "text-red-300"}`}>
                                            {Number(entry.points ?? 0) >= 0 ? "+" : ""}{entry.points ?? 0}
                                        </p>
                                        <div>
                                            <p className="font-black uppercase">{entry.reason?.replaceAll("_", " ") ?? "Credit movement"}</p>
                                            <p className="mt-1 text-sm text-neutral-400">{entry.description ?? "Merch credit account update"}</p>
                                        </div>
                                        <p className="text-xs uppercase text-neutral-500">
                                            {new Date(entry.created_at).toLocaleDateString("en-AU")}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="p-5 text-sm text-neutral-400">No credit ledger entries yet.</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-neutral-950 p-5 md:p-8">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                            Reward reservations
                        </p>
                        <h2 className="mt-2 text-4xl font-black uppercase leading-none">
                            Redemption history.
                        </h2>
                        <div className="mt-6 space-y-3">
                            {creditReservations.length ? (
                                creditReservations.map((reservation) => (
                                    <div key={reservation.id} className="border border-neutral-800 bg-black p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="font-black uppercase">
                                                    {reservation.points ?? 0} points reserved
                                                </p>
                                                <p className="mt-1 text-xs uppercase text-neutral-500">
                                                    {reservation.status ?? "pending"}
                                                </p>
                                            </div>
                                            <p className="font-black text-red-400">
                                                {fmtMoney(reservation.discount_cents ?? 0, reservation.currency ?? "AUD")}
                                            </p>
                                        </div>
                                        {reservation.expires_at ? (
                                            <p className="mt-3 text-xs text-neutral-500">
                                                Expires {new Date(reservation.expires_at).toLocaleString("en-AU")}
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
                </div>
            </section>

            <section id="saved-scene" className="border-b border-neutral-800 bg-[#f3f1e8] text-black">
                <div className="grid md:grid-cols-2 xl:grid-cols-4">
                    <FanAccountCard
                        title="Saved artists"
                        body="Keep the bands you care about in one place, so their next drops are easy to find."
                        action="View saved artists"
                        href="/dashboard/saved"
                    />
                    <FanAccountCard
                        title="Wishlist"
                        body="Save merch you want to come back to before payday, show night, or your next bundle."
                        action="Open wishlist"
                        href="/dashboard/saved"
                    />
                    <FanAccountCard
                        title="Addresses"
                        body="Set your usual delivery address once, then let checkout load it when you are signed in."
                        action="Update address"
                        href="/dashboard/saved#delivery-address"
                    />
                    <FanAccountCard
                        title="Help and preferences"
                        body="Get help with orders, rewards, account access, and the updates you want to receive."
                        action="Contact support"
                        href="/contact"
                    />
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-black p-5 md:p-8">
                <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">
                            Account controls
                        </p>
                        <h2 className="mt-2 text-4xl font-black uppercase leading-none">
                            Keep your login clean.
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
                            Change email, set a password, reset active sessions, or request account closure.
                        </p>
                    </div>
                    <Link
                        href="/dashboard/account"
                        className="inline-flex items-center justify-center gap-2 border border-neutral-700 px-5 py-3 text-sm font-black text-white hover:border-lime-300 hover:text-lime-300"
                    >
                        Open account settings
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>
        </main>
    );
}

function FanAccountCard({
    title,
    body,
    action,
    href,
}: {
    title: string;
    body: string;
    action: string;
    href: string;
}) {
    return (
        <div className="border-b border-r border-neutral-300 p-5 md:p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">{title}</p>
            <p className="mt-4 min-h-[4.5rem] text-sm leading-6 text-neutral-700">{body}</p>
            <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-black text-black hover:text-red-600">
                {action}
                <ArrowRight className="h-4 w-4" />
            </Link>
        </div>
    );
}

function ActionCard({
    href,
    title,
    body,
    icon,
    pill,
}: {
    href: string;
    title: string;
    body: string;
    icon: React.ReactNode;
    pill?: string;
}) {
    return (
        <Link
            href={href}
            className="group block min-h-[270px] border-b border-r border-neutral-300 bg-[#f3f1e8] p-5 text-black transition hover:bg-white md:p-6"
        >
            <div className="flex h-full flex-col justify-between">
                <div>
                    <div className="flex items-center justify-between gap-4">
                        {pill && (
                            <span className="bg-lime-300 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-black">
                                {pill}
                            </span>
                        )}
                        <span className="text-red-600">{icon}</span>
                    </div>
                    <h3 className="mt-8 text-3xl font-black uppercase leading-none">{title}</h3>
                    <p className="mt-4 text-sm leading-6 text-neutral-700">{body}</p>
                </div>
                <span className="mt-8 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-red-600">
                    Open
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
            </div>
        </Link>
    );
}

function ChecklistItem({
    href,
    title,
    body,
    icon,
}: {
    href: string;
    title: string;
    body: string;
    icon: React.ReactNode;
}) {
    return (
        <Link href={href} className="group border-b border-r border-neutral-800 bg-neutral-950 p-5 transition hover:bg-black">
            <div className="flex items-start justify-between gap-4">
                <div className="text-lime-300">{icon}</div>
                <ArrowRight className="h-4 w-4 text-neutral-600 transition group-hover:translate-x-1 group-hover:text-lime-300" />
            </div>
            <h3 className="mt-7 text-xl font-black uppercase leading-none">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-neutral-400">{body}</p>
        </Link>
    );
}

function StatCard({
    label,
    value,
    sub,
    icon,
}: {
    label: string;
    value: string;
    sub?: string;
    icon?: React.ReactNode;
}) {
    return (
        <div className="border-b border-r border-neutral-800 bg-[#f3f1e8] p-4 text-black md:p-6">
            <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">{label}</p>
                {icon && <div className="text-red-600">{icon}</div>}
            </div>
            <p className="mt-5 text-2xl font-black md:text-4xl">{value}</p>
            {sub && <p className="mt-2 text-xs leading-5 text-neutral-500">{sub}</p>}
        </div>
    );
}
