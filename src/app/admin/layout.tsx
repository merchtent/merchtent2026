import Link from "next/link";
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
} from "lucide-react";

import { requireAdminPage } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user } = await requireAdminPage();

    const nav = [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
        { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/admin/artists", label: "Artists", icon: Users },
        { href: "/admin/products", label: "Products", icon: Package },
        { href: "/admin/fulfillment", label: "Fulfilment", icon: ClipboardList },
        { href: "/admin/supplier-catalog", label: "Supplier catalogue", icon: Database },
        { href: "/admin/operations", label: "Operations", icon: Activity },
        { href: "/admin/settings", label: "Settings", icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-black text-white lg:grid lg:grid-cols-[280px_1fr]">
            <aside className="border-b border-neutral-800 bg-black lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
                <div className="border-b border-neutral-800 p-4 md:p-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-lime-300">
                        Merch Tent
                    </p>

                    <h1 className="mt-2 text-3xl font-black uppercase leading-[0.9]">
                        Backstage
                    </h1>

                    <p className="mt-2 text-xs text-neutral-500">
                        Artist & store management
                    </p>
                </div>

                <nav className="flex gap-2 overflow-x-auto p-3 lg:block lg:space-y-2 lg:overflow-visible lg:p-4">
                    {nav.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="inline-flex shrink-0 items-center gap-3 border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm font-black text-neutral-200 transition hover:border-lime-300 hover:bg-lime-300 hover:text-black lg:flex"
                            >
                                <Icon className="h-4 w-4 text-red-500" />
                                {item.label}
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
