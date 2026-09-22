"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Activity,
    BadgePercent,
    BarChart3,
    LayoutDashboard,
    Package,
    Receipt,
    Settings,
    Shirt,
    UserRound,
    Wallet,
    type LucideIcon,
} from "lucide-react";

type DashboardSidebarProps = {
    displayName: string;
    isArtist: boolean;
    artistSlug: string | null;
};

type DashboardNavItem = {
    label: string;
    href: string;
    aliases?: string[];
    icon: LucideIcon;
};

const artistNav: DashboardNavItem[] = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "Profile", href: "/dashboard/artist", icon: UserRound },
    { label: "Products", href: "/dashboard/products", icon: Shirt },
    { label: "Sales", href: "/dashboard/sales", icon: BarChart3 },
    { label: "Payouts", href: "/dashboard/cash-out", aliases: ["/dashboard/cash-outs"], icon: Wallet },
    { label: "Orders", href: "/dashboard/orders", icon: Receipt },
    { label: "Credits", href: "/dashboard/credits", icon: BadgePercent },
    { label: "Saved", href: "/dashboard/saved", icon: Package },
    { label: "Activity", href: "/dashboard/activity", icon: Activity },
    { label: "Account", href: "/dashboard/account", icon: Settings },
];

const fanNav: DashboardNavItem[] = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "Orders", href: "/dashboard/orders", icon: Receipt },
    { label: "Credits", href: "/dashboard/credits", icon: BadgePercent },
    { label: "Activity", href: "/dashboard/activity", icon: Activity },
    { label: "Saved", href: "/dashboard/saved", icon: Package },
    { label: "Account", href: "/dashboard/account", icon: Settings },
];

function isActivePath(pathname: string, href: string, aliases: string[] = []) {
    const candidates = [href, ...aliases];
    return candidates.some((candidate) => {
        if (candidate === "/dashboard") return pathname === "/dashboard";
        return pathname === candidate || pathname.startsWith(`${candidate}/`);
    });
}

export default function DashboardSidebar({ displayName, isArtist, artistSlug }: DashboardSidebarProps) {
    const pathname = usePathname();
    const nav = isArtist ? artistNav : fanNav;
    const isDesignerWorkspace = pathname.startsWith("/dashboard/products/designer/");

    return (
        <aside className={`shrink-0 border-b border-neutral-800 bg-black lg:sticky lg:border-b-0 lg:border-r ${
            isDesignerWorkspace ? "lg:top-0 lg:h-full" : "lg:top-0 lg:h-screen"
        }`}>
            <div className="border-b border-neutral-800 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-lime-300">Dashboard</p>
                <h2 className="mt-1 text-2xl font-bold">
                    {isArtist ? "Artist control" : "Fan account"}
                </h2>
                <p className="mt-2 truncate text-xs text-neutral-500">{displayName}</p>
            </div>

            <nav className="flex gap-2 overflow-x-auto p-3 lg:block lg:space-y-1.5 lg:overflow-visible">
                {nav.map((item) => {
                    const Icon = item.icon;
                    const active = isActivePath(pathname, item.href, item.aliases);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={`inline-flex shrink-0 items-center gap-3 border px-3 py-2.5 text-sm font-semibold transition lg:flex ${
                                active
                                    ? "border-lime-300 bg-lime-300 text-black"
                                    : "border-neutral-800 bg-neutral-950 text-neutral-200 hover:border-lime-300 hover:bg-lime-300 hover:text-black"
                            }`}
                        >
                            <Icon className={`h-4 w-4 ${active ? "text-black" : "text-red-500"}`} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="hidden border-t border-neutral-800 p-4 lg:block">
                <Link
                    href={isArtist ? (artistSlug ? `/artists/${artistSlug}` : "/dashboard/artist") : "/"}
                    className="inline-flex w-full items-center justify-center border border-neutral-800 bg-[#f3f1e8] px-4 py-3 text-sm font-black text-black hover:bg-lime-300"
                >
                    {isArtist ? (artistSlug ? "View storefront" : "Set up storefront") : "Browse store"}
                </Link>
            </div>
        </aside>
    );
}
