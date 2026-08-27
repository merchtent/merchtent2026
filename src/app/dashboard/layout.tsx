import Link from "next/link";
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
} from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DashboardLayoutProps = {
    children: React.ReactNode;
};

const artistNav = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "Products", href: "/dashboard/products", icon: Shirt },
    { label: "Sales", href: "/dashboard/sales", icon: BarChart3 },
    { label: "Activity", href: "/dashboard/activity", icon: Activity },
    { label: "Payouts", href: "/dashboard/cash-out", icon: Wallet },
    { label: "Profile", href: "/dashboard/artist", icon: UserRound },
    { label: "Account", href: "/dashboard/account", icon: Settings },
];

const fanNav = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "Orders", href: "/orders", icon: Receipt },
    { label: "Credits", href: "/dashboard#merch-credits", icon: BadgePercent },
    { label: "Activity", href: "/dashboard/activity", icon: Activity },
    { label: "Saved", href: "/dashboard#saved-scene", icon: Package },
    { label: "Account", href: "/dashboard/account", icon: Settings },
];

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
    const supabase = getServerSupabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = user
        ? await supabase
            .from("profiles")
            .select("account_type, display_name, onboarding_completed")
            .eq("id", user.id)
            .maybeSingle()
        : { data: null };

    const isArtist = profile?.account_type === "artist";
    const nav = isArtist ? artistNav : fanNav;
    const displayName = profile?.display_name ?? user?.email ?? "Guest";

    return (
        <div className="min-h-screen bg-black text-white lg:grid lg:grid-cols-[260px_1fr]">
            <aside className="border-b border-neutral-800 bg-neutral-950 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
                <div className="border-b border-neutral-800 p-4 md:p-5">
                    <p className="text-[10px] font-black uppercase text-red-400">Dashboard</p>
                    <h2 className="mt-2 text-2xl font-black uppercase leading-none">
                        {isArtist ? "Artist control" : "Fan account"}
                    </h2>
                    <p className="mt-2 truncate text-xs text-neutral-500">{displayName}</p>
                </div>

                <nav className="flex gap-2 overflow-x-auto p-3 lg:block lg:space-y-2 lg:overflow-visible">
                    {nav.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="inline-flex shrink-0 items-center gap-3 border border-neutral-800 bg-black px-4 py-3 text-sm font-black text-neutral-200 transition hover:border-red-500 hover:bg-red-600/10 hover:text-white lg:flex"
                            >
                                <Icon className="h-4 w-4 text-red-400" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="hidden border-t border-neutral-800 p-4 lg:block">
                    <Link
                        href="/"
                        className="inline-flex w-full items-center justify-center border border-neutral-800 px-4 py-3 text-sm font-black text-neutral-300 hover:border-red-500 hover:text-white"
                    >
                        View storefront
                    </Link>
                </div>
            </aside>

            <div className="min-w-0">{children}</div>
        </div>
    );
}
