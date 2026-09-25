import Link from "next/link";
import type { Metadata } from "next";
import {
    LayoutDashboard,
    ShoppingBag,
    Users,
    Package,
    Settings,
    ClipboardList,
    Activity,
    BarChart3,
    Database,
    AudioLines,
    type LucideIcon,
} from "lucide-react";

import { requireAdminPage } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

type AdminNavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
    badge?: number;
    badgeLabel?: string;
};

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { supabase, user } = await requireAdminPage();
    const [
        { count: pendingProductCount, error: pendingProductCountError },
        { count: pendingAmplifyCount, error: pendingAmplifyCountError },
    ] = await Promise.all([
        supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("moderation_status", "pending_review")
            .is("artist_archived_at", null),
        supabase
            .from("artist_promotion_requests")
            .select("id", { count: "exact", head: true })
            .eq("status", "submitted"),
    ]);

    if (pendingProductCountError) {
        logger.error("admin navigation pending product count failed", {
            error: pendingProductCountError.message,
        });
    }
    if (pendingAmplifyCountError) {
        logger.error("admin navigation Amplify request count failed", {
            error: pendingAmplifyCountError.message,
        });
    }

    const nav: AdminNavItem[] = [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
        { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/admin/artists", label: "Artists", icon: Users },
        { href: "/admin/products", label: "Products", icon: Package, badge: pendingProductCount ?? 0 },
        { href: "/admin/amplify", label: "Amplify", icon: AudioLines, badge: pendingAmplifyCount ?? 0, badgeLabel: "promotion requests pending" },
        { href: "/admin/fulfillment", label: "Fulfilment", icon: ClipboardList },
        { href: "/admin/supplier-catalog", label: "Supplier catalogue", icon: Database },
        { href: "/admin/operations", label: "Operations", icon: Activity },
        { href: "/admin/settings", label: "Settings", icon: Settings },
    ];

    return (
        <div className="operational-surface min-h-screen bg-black text-white lg:grid lg:grid-cols-[248px_1fr]">
            <aside className="border-b border-neutral-800 bg-black lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
                <div className="border-b border-neutral-800 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-lime-300">
                        Merch Tent
                    </p>

                    <h1 className="mt-1 text-2xl font-bold">
                        Backstage
                    </h1>

                    <p className="mt-2 text-xs text-neutral-500">
                        Artist & store management
                    </p>
                </div>

                <nav className="flex gap-2 overflow-x-auto p-3 lg:block lg:space-y-1.5 lg:overflow-visible">
                    {nav.map((item) => {
                        const Icon = item.icon;
                        const badge = item.badge ?? 0;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="inline-flex shrink-0 items-center gap-3 border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm font-semibold text-neutral-200 transition hover:border-lime-300 hover:bg-lime-300 hover:text-black lg:flex"
                            >
                                <Icon className="h-4 w-4 text-red-500" />
                                <span className="flex-1">{item.label}</span>
                                {badge > 0 ? (
                                    <span
                                        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black leading-none text-white"
                                        aria-label={`${badge} ${item.badgeLabel ?? "products pending review"}`}
                                    >
                                        {badge > 99 ? "99+" : badge}
                                    </span>
                                ) : null}
                            </Link>
                        );
                    })}
                </nav>

                <div className="hidden border-t border-neutral-800 p-4 lg:block">
                    <div className="border border-neutral-800 bg-neutral-950 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500">
                            Logged In
                        </p>

                        <p className="mt-2 text-sm font-medium truncate">
                            {user.email}
                        </p>
                    </div>
                </div>
            </aside>

            <main className="min-w-0">{children}</main>
        </div>
    );
}
