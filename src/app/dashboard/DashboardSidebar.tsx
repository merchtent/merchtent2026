"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Activity,
    AudioLines,
    BadgePercent,
    BarChart3,
    Images,
    LayoutDashboard,
    Megaphone,
    Package,
    Receipt,
    Settings,
    ShoppingBag,
    Shirt,
    Trash2,
    UserRound,
    Wallet,
    type LucideIcon,
} from "lucide-react";

type DashboardSidebarProps = {
    displayName: string;
    isArtist: boolean;
    artistSlug: string | null;
    artistIsPublic: boolean;
};

type DashboardNavItem = {
    label: string;
    href?: string;
    aliases?: string[];
    icon: LucideIcon;
    badge?: string;
    disabled?: boolean;
};

const artistNav: DashboardNavItem[] = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "Profile", href: "/dashboard/artist", icon: UserRound },
    { label: "Products", href: "/dashboard/products", icon: Shirt },
    { label: "Launch kit", href: "/dashboard/launch-kit", icon: Megaphone },
    { label: "Amplify", icon: AudioLines, badge: "Preview", disabled: true },
    { label: "Order merch", href: "/dashboard/order-merch", icon: ShoppingBag },
    { label: "Sales", href: "/dashboard/sales", icon: BarChart3 },
    { label: "Payouts", href: "/dashboard/cash-out", aliases: ["/dashboard/cash-outs"], icon: Wallet },
    { label: "Orders", href: "/dashboard/orders", icon: Receipt },
    { label: "Credits", href: "/dashboard/credits", icon: BadgePercent },
    { label: "Saved", href: "/dashboard/saved", icon: Package },
    { label: "Artwork gallery", href: "/dashboard/images", icon: Images },
    { label: "Deleted products", href: "/dashboard/products/deleted", icon: Trash2 },
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
        if (candidate === "/dashboard/products" && pathname.startsWith("/dashboard/products/deleted")) return false;
        return pathname === candidate || pathname.startsWith(`${candidate}/`);
    });
}

export default function DashboardSidebar({ displayName, isArtist, artistSlug, artistIsPublic }: DashboardSidebarProps) {
    const pathname = usePathname();
    const nav = isArtist ? artistNav : fanNav;
    const isDesignerWorkspace = pathname.startsWith("/dashboard/products/designer/");

    return (
        <aside className={`shrink-0 border-b border-neutral-800 bg-black lg:sticky lg:flex lg:flex-col lg:border-b-0 lg:border-r ${
            isDesignerWorkspace ? "lg:top-0 lg:h-full" : "lg:top-0 lg:h-screen"
        }`}>
            <div className="border-b border-neutral-800 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-lime-300">Dashboard</p>
                <h2 className="mt-1 text-2xl font-bold">
                    {isArtist ? "Artist control" : "Fan account"}
                </h2>
                <p className="mt-2 truncate text-xs text-neutral-500">{displayName}</p>
            </div>

            <nav className="flex gap-2 overflow-x-auto p-3 lg:min-h-0 lg:flex-1 lg:block lg:space-y-1.5 lg:overflow-x-visible lg:overflow-y-auto">
                {nav.map((item) => {
                    const Icon = item.icon;
                    const active = item.href ? isActivePath(pathname, item.href, item.aliases) : false;

                    if (item.disabled || !item.href) {
                        return (
                            <div
                                key={item.label}
                                aria-disabled="true"
                                title="Merch Tent Amplify is being prepared and is not available yet."
                                className="inline-flex shrink-0 cursor-not-allowed items-center gap-3 border border-neutral-900 bg-neutral-950 px-3 py-2.5 text-sm font-semibold text-neutral-500 lg:flex"
                            >
                                <Icon className="h-4 w-4 text-neutral-600" />
                                <span>{item.label}</span>
                                {item.badge ? (
                                    <span className="ml-auto border border-neutral-700 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-neutral-400">
                                        {item.badge}
                                    </span>
                                ) : null}
                            </div>
                        );
                    }

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
                    href={isArtist ? (artistSlug && artistIsPublic ? `/artists/${artistSlug}` : "/dashboard/artist") : "/"}
                    className="inline-flex w-full items-center justify-center border border-neutral-800 bg-[#f3f1e8] px-4 py-3 text-sm font-black text-black hover:bg-lime-300"
                >
                    {isArtist ? (artistSlug && artistIsPublic ? "View storefront" : "Set up storefront") : "Browse store"}
                </Link>
            </div>
        </aside>
    );
}
