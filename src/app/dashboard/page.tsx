// app/dashboard/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import { BadgePercent, Megaphone, Shirt, Package, DollarSign, ShoppingCart, Plus, Ticket, ChevronRight, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function DashboardPage() {
    const supabase = getServerSupabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <div className="max-w-3xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        <h1 className="text-xl md:text-2xl font-black">Please sign in</h1>
                        <p className="mt-2 text-neutral-400">
                            You need to be signed in to access the artist dashboard.
                        </p>
                        <div className="mt-4">
                            <Link href="/auth/sign-in" className="underline">
                                Go to sign in
                            </Link>
                        </div>
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

    if (!artist) {
        return (
            <main className="p-6 max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold mb-4">Welcome</h1>
                <p>You’re signed in, but you haven’t created your artist profile yet.</p>
                <p>
                    Go to <Link href="/auth/sign-up" className="underline">Sign up</Link> to set your artist name.
                </p>
            </main>
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

    if (!artist) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                {/* angled strip */}
                <div className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                WELCOME // ARTIST SETUP
                            </h1>
                            <span className="text-xs bg-neutral-900 text-white px-2 py-1 rounded rotate-[-2deg]">
                                LIMITED ACCESS
                            </span>
                        </div>
                    </div>
                </div>

                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8">
                        <h2 className="text-xl md:text-2xl font-black">Create your artist profile</h2>
                        <p className="mt-2 text-neutral-400">
                            You’re signed in, but you haven’t created your artist profile yet.
                        </p>
                        <p className="mt-1 text-neutral-400">
                            Set your display name to unlock the dashboard.
                        </p>
                        <div className="mt-6 flex gap-3">
                            <Button asChild>
                                <Link href="/auth/sign-up">Start setup</Link>
                            </Button>
                            <Button asChild variant="secondary">
                                <Link href="/">Back to site</Link>
                            </Button>
                        </div>
                    </div>

                    {/* sticker strip */}
                    <div className="mt-8 flex flex-wrap gap-2">
                        {["HAND-NUMBERED", "DIY FOREVER", "WORLD TOUR", "SCREENPRINTED"].map(
                            (s, i) => (
                                <span
                                    key={s}
                                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${i % 2
                                        ? "bg-white text-neutral-900 border-neutral-200 rotate-2"
                                        : "bg-neutral-900 text-white border-neutral-800 -rotate-2"
                                        }`}
                                >
                                    {s}
                                </span>
                            )
                        )}
                    </div>
                </div>
            </main>
        );
    }

    // Artist exists → main dashboard
    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* angled “dashboard” banner */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">
                                Artist Dashboard
                            </p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                {artist.display_name} // CONTROL ROOM
                            </h1>
                        </div>
                        <span className="text-xs bg-red-600 text-white px-2 py-1 rounded rotate-[2deg]">
                            LIVE
                        </span>
                    </div>
                </div>
            </section>

            {/* quick actions */}
            <section className="max-w-5xl mx-auto px-4 py-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <ActionCard
                        href="/dashboard/products/new"
                        title="Add product"
                        icon={<Plus className="h-4 w-4" />}
                        pill="FRESH DROP"
                    />
                    <ActionCard
                        href="/dashboard/products"
                        title="My products"
                        icon={<Shirt className="h-4 w-4" />}
                        pill="ALL PRODUCTS"
                    />
                    <ActionCard
                        href="/dashboard/sales"
                        title="My sales"
                        icon={<ShoppingCart className="h-4 w-4" />}
                        pill="ALL SALES"
                    />
                    <ActionCard
                        href="/dashboard/cash-out"
                        title="Cash Out"
                        icon={<DollarSign className="h-4 w-4" />}
                        pill="GET YOUR DOLLAR BUCKS"
                    />
                    <ActionCard
                        href="/dashboard/images"
                        title="Images"
                        icon={<Image className="h-4 w-4" />}
                        pill="YOUR GRAPHICS"
                    />
                    <ActionCard
                        href="/dashboard/artist"
                        title="Artist profile"
                        icon={<BadgePercent className="h-4 w-4" />}
                        pill="HERO IMAGE"
                    />
                </div>
            </section>

            {/* stats + links */}
            <section className="max-w-5xl mx-auto px-4 pb-10 space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                    {/* <StatCard
                        label="Live products"
                        value="—"
                        sub="Add your first drop"
                        icon={<Package className="h-4 w-4" />}
                    />
                    <StatCard
                        label="Sales (7d)"
                        value="—"
                        sub="No sales yet"
                        icon={<BadgePercent className="h-4 w-4" />}
                    />
                    <StatCard
                        label="Payout ready"
                        value="—"
                        sub="Connect sales first"
                        icon={<DollarSign className="h-4 w-4" />}
                    /> */}
                    <StatCard
                        label="Live products"
                        value={String(liveCount)}
                        sub={liveCount === 0 ? "Add your first drop" : `${liveCount} live ${liveCount === 1 ? "item" : "items"}`}
                        icon={<Package className="h-4 w-4" />}
                    />
                    <StatCard
                        label="Sales (7d)"
                        value={fmtMoney(profit7dCents, "AUD")}
                        sub={units7d === 0 ? "No sales yet" : `${units7d} ${units7d === 1 ? "unit" : "units"}`}
                        icon={<BadgePercent className="h-4 w-4" />}
                    />
                    <StatCard
                        label="Payout ready"
                        value={fmtMoney(unpaidCents, "AUD")}
                        sub={unpaidItems === 0 ? "Connect sales first" : `${unpaidItems} unpaid ${unpaidItems === 1 ? "item" : "items"}`}
                        icon={<DollarSign className="h-4 w-4" />}
                    />
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 md:p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg md:text-xl font-black">Next steps</h2>
                        <span className="text-[11px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-full">
                            Checklist
                        </span>
                    </div>
                    <ul className="mt-4 grid md:grid-cols-2 gap-2 text-sm">
                        <li className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2">
                            <span className="text-neutral-300">Create your next product</span>
                            <Link
                                href="/dashboard/products/new"
                                className="inline-flex items-center text-neutral-200 hover:text-white"
                            >
                                Start <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                        </li>
                        <li className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2">
                            <span className="text-neutral-300">Review sales</span>
                            <Link
                                href="/dashboard/sales"
                                className="inline-flex items-center text-neutral-200 hover:text-white"
                            >
                                View <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                        </li>
                        <li className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2">
                            <span className="text-neutral-300">Request a payout</span>
                            <Link
                                href="/dashboard/cash-out"
                                className="inline-flex items-center text-neutral-200 hover:text-white"
                            >
                                Go <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                        </li>
                        <li className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2">
                            <span className="text-neutral-300">See payout history</span>
                            <Link
                                href="/dashboard/cash-outs"
                                className="inline-flex items-center text-neutral-200 hover:text-white"
                            >
                                Open <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                        </li>
                    </ul>
                </div>
            </section>

            {/* tiny promo rail */}
            <section className="relative py-0">
                <div className="-skew-y-1 bg-neutral-100 text-neutral-900 border-y border-neutral-200">
                    <div className="skew-y-1 max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Megaphone className="h-4 w-4" />
                            <p className="text-sm font-medium">
                                Tip: Great designs sell tees — use high-quality graphics for your products!
                            </p>
                        </div>
                        <Button asChild size="sm">
                            <Link href="/dashboard/products/new">Add product</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* sticker strip */}
            <section className="max-w-5xl mx-auto px-4 py-6">
                <div className="flex flex-wrap gap-2">
                    {["MERCH TENT", "LOCAL", "FANS", "GIGS"].map(
                        (s, i) => (
                            <span
                                key={s}
                                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${i % 2
                                    ? "bg-white text-neutral-900 border-neutral-200 rotate-1"
                                    : "bg-neutral-900 text-white border-neutral-800 -rotate-1"
                                    }`}
                            >
                                {s}
                            </span>
                        )
                    )}
                </div>
            </section>
        </main>
    );
}

/* ---------- UI Bits ---------- */

function ActionCard({
    href,
    title,
    icon,
    pill,
}: {
    href: string;
    title: string;
    icon: React.ReactNode;
    pill?: string;
}) {
    return (
        <Link
            href={href}
            className="group block rounded-2xl border border-neutral-800 bg-neutral-900 hover:border-neutral-700 transition-colors"
            style={{ clipPath: "polygon(0% 0,100% 0,100% 100%,0 100%)" }}
        >
            <Card className="bg-transparent border-none">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-300">{title}</span>
                        <span className="text-neutral-200">{icon}</span>
                    </div>
                    {pill && (
                        <div className="mt-3 -rotate-2 inline-block text-[10px] font-black tracking-wide bg-red-600 text-white px-2 py-1 rounded">
                            {pill}
                        </div>
                    )}
                </CardContent>
            </Card>
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
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 md:p-6">
            <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-400">{label}</p>
                {icon && <div className="text-neutral-300">{icon}</div>}
            </div>
            <p className="mt-2 text-2xl font-black">{value}</p>
            {sub && <p className="mt-1 text-xs text-neutral-500">{sub}</p>}
        </div>
    );
}