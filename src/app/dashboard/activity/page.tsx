import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Activity, AlertTriangle, ArrowRight, BadgePercent, Package, Receipt, Shirt, Wallet } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const revalidate = 0;

type FeedItem = {
    id: string;
    title: string;
    body: string;
    createdAt: string;
    tone?: "neutral" | "good" | "warn" | "bad";
    href?: string;
    icon: ReactNode;
};

type ProductActivity = {
    id: string;
    title: string | null;
    created_at: string;
    is_published: boolean | null;
    production_status: string | null;
    moderation_status: string | null;
};

type ArtistSaleActivity = {
    id: string;
    title: string | null;
    qty: number | null;
    products: { artist_cut_cents: number | null } | { artist_cut_cents: number | null }[] | null;
    orders: { created_at: string | null; status: string | null } | { created_at: string | null; status: string | null }[] | null;
};

type FanCreditActivity = {
    id: string;
    points: number;
    reason: string;
    description: string | null;
    created_at: string;
};

type FanOrderActivity = {
    id: string;
    order_number: string | null;
    status: string | null;
    total_cents: number | null;
    created_at: string;
};

function firstJoined<T>(value: T | T[] | null | undefined): T | null {
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function formatMoney(cents: number, currency = "AUD") {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(cents / 100);
}

function formatDate(value: string) {
    return new Date(value).toLocaleString("en-AU", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default async function DashboardActivityPage() {
    const supabase = getServerSupabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/auth/sign-in");

    const { data: profile } = await supabase
        .from("profiles")
        .select("account_type, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

    if (!profile?.onboarding_completed) redirect("/account/setup");

    const feed = profile.account_type === "artist"
        ? await loadArtistFeed(user.id)
        : await loadFanFeed(user.id);

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 bg-black p-5 md:p-8">
                <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase text-[#b7ff3c]">
                    <Activity className="h-4 w-4" />
                    Activity feed
                </p>
                <h1 className="mt-3 text-3xl font-black uppercase leading-tight md:text-5xl">
                    What changed.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                    A confidence log for sales, products, payouts, credits, and account movement.
                </p>
            </section>

            <section className="p-5 md:p-8">
                {feed.length ? (
                    <div className="border border-neutral-800 bg-neutral-950">
                        {feed.map((item) => (
                            <FeedRow key={item.id} item={item} />
                        ))}
                    </div>
                ) : (
                    <div className="border border-neutral-800 bg-neutral-950 p-6">
                        <p className="text-2xl font-black uppercase">No activity yet.</p>
                        <p className="mt-2 text-sm text-neutral-400">
                            Once products, orders, credits, or payouts move, the important signals will show here.
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
}

async function loadArtistFeed(userId: string): Promise<FeedItem[]> {
    const supabase = getServerSupabase();
    const { data: artist } = await supabase
        .from("artists")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

    if (!artist) return [];

    const since = new Date();
    since.setDate(since.getDate() - 45);

    const [productsRes, salesRes, cashOutsRes, paymentRes] = await Promise.all([
        supabase
            .from("products")
            .select("id, title, created_at, is_published, production_status, moderation_status")
            .eq("artist_id", artist.id)
            .order("created_at", { ascending: false })
            .limit(20),
        supabase
            .from("order_items")
            .select("id, title, qty, products ( artist_cut_cents ), orders ( created_at, status )")
            .eq("artist_id", artist.id)
            .gte("orders.created_at", since.toISOString())
            .limit(30),
        supabase
            .from("cash_outs")
            .select("id, total_cents, status, created_at")
            .eq("artist_id", artist.id)
            .order("created_at", { ascending: false })
            .limit(10),
        supabase
            .from("artist_payment_accounts")
            .select("payouts_enabled, details_submitted, disabled_reason, updated_at")
            .eq("artist_id", artist.id)
            .maybeSingle(),
    ]);

    if (productsRes.error || salesRes.error || cashOutsRes.error) {
        logger.error("Artist activity feed failed to load", {
            artist_id: artist.id,
            products_error: productsRes.error?.message,
            sales_error: salesRes.error?.message,
            cash_outs_error: cashOutsRes.error?.message,
        });
    }

    const feed: FeedItem[] = [];

    ((productsRes.data ?? []) as ProductActivity[]).forEach((product) => {
        const blocked = product.moderation_status === "blocked";
        const published = Boolean(product.is_published);
        feed.push({
            id: `product-${product.id}`,
            title: blocked ? "Product needs attention" : published ? "Product live" : "Product draft created",
            body: `${product.title ?? "Untitled product"} · production ${product.production_status ?? "unknown"} · moderation ${product.moderation_status ?? "unknown"}`,
            createdAt: product.created_at,
            href: `/dashboard/products/${product.id}/edit`,
            tone: blocked ? "bad" : published ? "good" : "neutral",
            icon: <Shirt className="h-5 w-5" />,
        });
    });

    ((salesRes.data ?? []) as ArtistSaleActivity[]).forEach((sale) => {
        const order = firstJoined(sale.orders);
        if (!order?.created_at) return;
        const product = firstJoined(sale.products);
        const qty = sale.qty ?? 0;
        const artistCut = product?.artist_cut_cents ?? 0;
        feed.push({
            id: `sale-${sale.id}`,
            title: "Product sold",
            body: `${qty} x ${sale.title ?? "product"} · artist profit ${formatMoney(qty * artistCut)} · order ${order.status ?? "paid"}`,
            createdAt: order.created_at,
            href: "/dashboard/sales",
            tone: "good",
            icon: <Receipt className="h-5 w-5" />,
        });
    });

    (cashOutsRes.data ?? []).forEach((cashOut) => {
        feed.push({
            id: `cashout-${cashOut.id}`,
            title: "Payout requested",
            body: `${formatMoney(cashOut.total_cents ?? 0)} · ${cashOut.status ?? "pending"}`,
            createdAt: cashOut.created_at,
            href: "/dashboard/cash-outs",
            tone: cashOut.status === "paid" ? "good" : cashOut.status?.includes("failed") ? "bad" : "warn",
            icon: <Wallet className="h-5 w-5" />,
        });
    });

    const payment = paymentRes.data;
    if (payment && (!payment.payouts_enabled || !payment.details_submitted || payment.disabled_reason)) {
        feed.push({
            id: "stripe-action-needed",
            title: "Stripe needs attention",
            body: payment.disabled_reason ?? "Finish payout onboarding before cash-outs can move.",
            createdAt: payment.updated_at ?? new Date().toISOString(),
            href: "/dashboard/cash-out",
            tone: "warn",
            icon: <AlertTriangle className="h-5 w-5" />,
        });
    }

    return feed.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 40);
}

async function loadFanFeed(userId: string): Promise<FeedItem[]> {
    const supabase = getServerSupabase();
    const [ordersRes, creditsRes] = await Promise.all([
        supabase
            .from("orders")
            .select("id, order_number, status, total_cents, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(20),
        supabase
            .from("merch_credit_ledger")
            .select("id, points, reason, description, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(20),
    ]);

    if (ordersRes.error || creditsRes.error) {
        logger.error("Fan activity feed failed to load", {
            user_id: userId,
            orders_error: ordersRes.error?.message,
            credits_error: creditsRes.error?.message,
        });
    }

    const feed: FeedItem[] = [];

    ((ordersRes.data ?? []) as FanOrderActivity[]).forEach((order) => {
        feed.push({
            id: `order-${order.id}`,
            title: "Order updated",
            body: `${order.order_number ?? order.id.slice(0, 8)} · ${formatMoney(order.total_cents ?? 0)} · ${order.status ?? "paid"}`,
            createdAt: order.created_at,
            href: `/dashboard/orders/${order.id}`,
            tone: order.status === "shipped" ? "good" : "neutral",
            icon: <Package className="h-5 w-5" />,
        });
    });

    ((creditsRes.data ?? []) as FanCreditActivity[]).forEach((credit) => {
        feed.push({
            id: `credit-${credit.id}`,
            title: credit.points > 0 ? "Credits earned" : "Credits redeemed",
            body: `${credit.points > 0 ? "+" : ""}${credit.points} points · ${credit.description ?? credit.reason.replaceAll("_", " ")}`,
            createdAt: credit.created_at,
            tone: credit.points > 0 ? "good" : "warn",
            icon: <BadgePercent className="h-5 w-5" />,
        });
    });

    return feed.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 40);
}

function FeedRow({ item }: { item: FeedItem }) {
    const toneClass = {
        neutral: "border-neutral-800 text-neutral-300",
        good: "border-green-500/30 text-green-300",
        warn: "border-yellow-500/30 text-yellow-300",
        bad: "border-red-500/30 text-red-300",
    }[item.tone ?? "neutral"];

    const content = (
        <div className="grid gap-4 border-b border-neutral-800 p-4 last:border-b-0 md:grid-cols-[auto_1fr_auto] md:items-center">
            <div className={`grid h-11 w-11 place-items-center border ${toneClass}`}>{item.icon}</div>
            <div>
                <p className="font-black uppercase">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-neutral-400">{item.body}</p>
            </div>
            <div className="flex items-center gap-3 text-xs uppercase text-neutral-500">
                {formatDate(item.createdAt)}
                {item.href ? <ArrowRight className="h-4 w-4 text-[#b7ff3c]" /> : null}
            </div>
        </div>
    );

    return item.href ? (
        <Link href={item.href} className="block hover:bg-neutral-900">
            {content}
        </Link>
    ) : content;
}
