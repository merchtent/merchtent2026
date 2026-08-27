// app/dashboard/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowRight, BadgePercent, ClipboardCheck, DollarSign, Gift, Image as ImageIcon, Megaphone, Package, PenTool, Plus, Receipt, Settings, Shirt, ShoppingCart, Sparkles, UserRound } from "lucide-react";
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
                    <h1 className="mt-3 text-5xl font-black uppercase leading-none md:text-7xl">Please sign in.</h1>
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
        .select("account_type, display_name, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

    if (!profile?.account_type || !profile.onboarding_completed) {
        return (
            <main className="min-h-screen bg-black text-white">
                <section className="border-b border-neutral-800 p-5 md:p-8">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-400">Account setup</p>
                    <h1 className="mt-3 text-5xl font-black uppercase leading-none md:text-7xl">Finish setup.</h1>
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
            <section className="border-b border-neutral-800 bg-black">
                <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-400">
                            Artist backstage
                        </p>
                        <h1 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-[0.86] md:text-7xl">
                            {artist.display_name} control room.
                        </h1>
                        <p className="mt-5 max-w-2xl text-sm leading-6 text-neutral-400 md:text-base">
                            Launch products, watch sales, manage payout readiness, and keep the boring operational
                            pieces close enough that nothing gets missed.
                        </p>
                        <div className="mt-7 flex flex-wrap gap-3">
                            <Link
                                href="/dashboard/products/designer"
                                className="inline-flex items-center gap-2 bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-500"
                            >
                                Open designer
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/dashboard/sales"
                                className="inline-flex items-center gap-2 border border-neutral-700 px-5 py-3 text-sm font-black hover:border-red-500"
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

            <section className="border-b border-neutral-800">
                <div className="grid md:grid-cols-2 xl:grid-cols-4">
                    <ActionCard
                        href="/dashboard/products/designer"
                        title="Design product"
                        body="Use the product designer to create mockups and save production-ready design data."
                        icon={<PenTool className="h-6 w-6" />}
                        pill="Best next move"
                    />
                    <ActionCard
                        href="/dashboard/products"
                        title="Product floor"
                        body="Review live, draft, and manual products before fans see the next drop."
                        icon={<Shirt className="h-6 w-6" />}
                        pill="Inventory"
                    />
                    <ActionCard
                        href="/dashboard/sales"
                        title="Orders and sales"
                        body="Track what sold, what fans paid, and what needs operational attention."
                        icon={<ShoppingCart className="h-6 w-6" />}
                        pill="Revenue"
                    />
                    <ActionCard
                        href="/dashboard/cash-out"
                        title="Payouts"
                        body="Connect Stripe, review unpaid sales, and request artist cash-outs."
                        icon={<DollarSign className="h-6 w-6" />}
                        pill="Money"
                    />
                    <ActionCard
                        href="/dashboard/account"
                        title="Account controls"
                        body="Change email, set a password, reset sessions, or request account closure."
                        icon={<Settings className="h-6 w-6" />}
                        pill="Security"
                    />
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-neutral-950">
                <div className="grid lg:grid-cols-[0.75fr_1.25fr]">
                    <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                            Next best actions
                        </p>
                        <h2 className="mt-2 text-4xl font-black uppercase leading-none md:text-5xl">
                            Keep the drop moving.
                        </h2>
                        <p className="mt-4 text-sm leading-6 text-neutral-400">
                            This is the short list for avoiding surprises: product, orders, payout, profile.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2">
                        <ChecklistItem href="/dashboard/products/designer" title="Create the next product" body="Open the designer and launch from saved design data." icon={<Sparkles className="h-5 w-5" />} />
                        <ChecklistItem href="/dashboard/products/new" title="Add a manual product" body="Keep the original creator for stock or imported merch." icon={<Plus className="h-5 w-5" />} />
                        <ChecklistItem href="/dashboard/cash-outs" title="Review payout history" body="Audit what has already been requested or transferred." icon={<Receipt className="h-5 w-5" />} />
                        <ChecklistItem href="/dashboard/artist" title="Tune artist profile" body="Update image, name, and storefront presentation." icon={<UserRound className="h-5 w-5" />} />
                        <ChecklistItem href="/dashboard/images" title="Manage artwork" body="Check product image outputs and mockup assets." icon={<ImageIcon className="h-5 w-5" />} />
                        <ChecklistItem href="/dashboard/sales" title="Check fulfilment pressure" body="Review recent orders before they become support tickets." icon={<ClipboardCheck className="h-5 w-5" />} />
                        <ChecklistItem href="/dashboard/account" title="Secure account access" body="Manage email, password, sessions, and closure requests." icon={<Settings className="h-5 w-5" />} />
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-red-600 text-white">
                <div className="grid lg:grid-cols-[1fr_auto]">
                    <div className="border-b border-black/20 p-5 md:p-7 lg:border-b-0 lg:border-r">
                        <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-black">
                            <Megaphone className="h-4 w-4" />
                            Backstage note
                        </p>
                        <h2 className="mt-3 max-w-4xl text-3xl font-black uppercase leading-none md:text-5xl">
                            Great drops need clean artwork and boring follow-through.
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

function FanDashboard({
    displayName,
    orders,
    balance,
    balanceUnavailable,
    creditLedger,
    creditReservations,
}: {
    displayName: string;
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
            <section className="border-b border-neutral-800 bg-black">
                <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-400">
                            Fan backstage
                        </p>
                        <h1 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-[0.86] md:text-7xl">
                            {displayName} merch HQ.
                        </h1>
                        <p className="mt-5 max-w-2xl text-sm leading-6 text-neutral-400 md:text-base">
                            Track orders, watch credits build, and keep close to the artists you backed early.
                        </p>
                        <div className="mt-7 flex flex-wrap gap-3">
                            <Link
                                href="/new"
                                className="inline-flex items-center gap-2 bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-500"
                            >
                                Shop new drops
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/artists"
                                className="inline-flex items-center gap-2 border border-neutral-700 px-5 py-3 text-sm font-black hover:border-red-500"
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

            <section className="border-b border-neutral-800">
                <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
                    <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                                    Order history
                                </p>
                                <h2 className="mt-2 text-4xl font-black uppercase leading-none">
                                    Recent purchases.
                                </h2>
                            </div>
                            <Link href="/dashboard/orders" className="text-sm font-black text-red-400 hover:text-red-300">
                            View all
                        </Link>
                        </div>
                        {!orders.length ? (
                            <div className="mt-6 border border-neutral-800 bg-neutral-950 p-6">
                                <p className="text-sm text-neutral-400">
                                    No orders yet. Find a new favourite artist and start earning credits.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-6 border border-neutral-800">
                                {orders.map((order) => (
                                    <Link
                                        key={order.id}
                                        href={`/dashboard/orders/${order.id}`}
                                        className="grid gap-3 border-b border-neutral-800 bg-neutral-950 p-4 last:border-b-0 md:grid-cols-[1fr_auto]"
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
                                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-red-400">
                                                {order.status ?? "paid"}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-neutral-950 p-5 md:p-8">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                            Merch credits
                        </p>
                        <h2 className="mt-2 text-4xl font-black uppercase leading-none">
                            Back bands. Earn tees.
                        </h2>
                        <div className="mt-6 h-3 overflow-hidden bg-neutral-800">
                            <div
                                className="h-full bg-red-600"
                                style={{ width: `${balanceUnavailable ? 0 : (freeTeeProgress / 20) * 100}%` }}
                            />
                        </div>
                        <p className="mt-4 text-sm leading-6 text-neutral-400">
                            {balanceUnavailable
                                ? "Your orders are available, but the credit balance could not be loaded right now."
                                : "Earn 3 points for every tee purchased. Every 20 points can be reserved at checkout for a free tee discount."}
                        </p>
                        <Button asChild className="mt-5 w-full bg-red-600 hover:bg-red-500">
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

            <section id="saved-scene" className="border-b border-neutral-800 bg-neutral-950">
                <div className="grid md:grid-cols-2 xl:grid-cols-4">
                    <FanAccountCard
                        title="Saved artists"
                        body="Wishlist and saved-scene tracking belongs here once favourite buttons are wired across artist and product pages."
                        action="Browse artists"
                        href="/artists"
                    />
                    <FanAccountCard
                        title="Wishlist"
                        body="A fan should be able to hold drops for later, especially before payday or show night."
                        action="Shop new drops"
                        href="/new"
                    />
                    <FanAccountCard
                        title="Addresses"
                        body="Saved shipping addresses should be added before repeat customer volume grows."
                        action="Use checkout"
                        href="/checkout"
                    />
                    <FanAccountCard
                        title="Help and preferences"
                        body="Returns, notification choices, and support should be reachable from the fan account."
                        action="Contact support"
                        href="/contact"
                    />
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-neutral-950 p-5 md:p-8">
                <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
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
                        className="inline-flex items-center justify-center gap-2 border border-neutral-700 px-5 py-3 text-sm font-black text-white hover:border-red-500"
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
        <div className="border-b border-r border-neutral-800 p-5 md:p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-400">{title}</p>
            <p className="mt-4 min-h-[4.5rem] text-sm leading-6 text-neutral-400">{body}</p>
            <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-black text-white hover:text-red-300">
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
            className="group block min-h-[270px] border-b border-r border-neutral-800 bg-neutral-950 p-5 transition hover:bg-neutral-900 md:p-6"
        >
            <div className="flex h-full flex-col justify-between">
                <div>
                    <div className="flex items-center justify-between gap-4">
                        {pill && (
                            <span className="bg-red-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                                {pill}
                            </span>
                        )}
                        <span className="text-red-400">{icon}</span>
                    </div>
                    <h3 className="mt-8 text-3xl font-black uppercase leading-none">{title}</h3>
                    <p className="mt-4 text-sm leading-6 text-neutral-400">{body}</p>
                </div>
                <span className="mt-8 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-red-400">
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
        <Link href={href} className="group border-b border-r border-neutral-800 bg-black p-5 transition hover:bg-neutral-950">
            <div className="flex items-start justify-between gap-4">
                <div className="text-red-400">{icon}</div>
                <ArrowRight className="h-4 w-4 text-neutral-600 transition group-hover:translate-x-1 group-hover:text-red-400" />
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
        <div className="border-b border-r border-neutral-800 bg-neutral-950 p-4 md:p-6">
            <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">{label}</p>
                {icon && <div className="text-red-400">{icon}</div>}
            </div>
            <p className="mt-5 text-2xl font-black md:text-4xl">{value}</p>
            {sub && <p className="mt-2 text-xs leading-5 text-neutral-500">{sub}</p>}
        </div>
    );
}
