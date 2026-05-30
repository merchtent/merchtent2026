import { redirect } from "next/navigation";
import Link from "next/link";
import {
    LayoutDashboard,
    ShoppingBag,
    Users,
    Package,
    Settings,
} from "lucide-react";

import { getServerSupabase } from "@/lib/supabase/server";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = getServerSupabase();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (error || !profile) {
        redirect("/");
    }

    if (profile.role !== "admin") {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-black text-white flex">

            {/* SIDEBAR */}
            <aside className="w-72 shrink-0 border-r border-neutral-800 bg-neutral-950">

                {/* BRAND */}
                <div className="p-6 border-b border-neutral-800">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-red-500 font-black">
                        Merch Tent
                    </p>

                    <h1 className="mt-2 text-2xl font-black">
                        Backstage
                    </h1>

                    <p className="mt-1 text-sm text-neutral-500">
                        Artist & store management
                    </p>
                </div>

                {/* NAV */}
                <nav className="p-4 space-y-2">

                    <Link
                        href="/admin"
                        className="flex items-center gap-3 rounded-xl border border-neutral-800 px-4 py-3 hover:border-red-500 hover:bg-red-500/10 transition"
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                    </Link>

                    <Link
                        href="/admin/orders"
                        className="flex items-center gap-3 rounded-xl border border-neutral-800 px-4 py-3 hover:border-red-500 hover:bg-red-500/10 transition"
                    >
                        <ShoppingBag className="h-4 w-4" />
                        Orders
                    </Link>

                    <Link
                        href="/admin/artists"
                        className="flex items-center gap-3 rounded-xl border border-neutral-800 px-4 py-3 hover:border-red-500 hover:bg-red-500/10 transition"
                    >
                        <Users className="h-4 w-4" />
                        Artists
                    </Link>

                    <Link
                        href="/admin/products"
                        className="flex items-center gap-3 rounded-xl border border-neutral-800 px-4 py-3 hover:border-red-500 hover:bg-red-500/10 transition"
                    >
                        <Package className="h-4 w-4" />
                        Products
                    </Link>

                    <Link
                        href="/admin/settings"
                        className="flex items-center gap-3 rounded-xl border border-neutral-800 px-4 py-3 hover:border-red-500 hover:bg-red-500/10 transition"
                    >
                        <Settings className="h-4 w-4" />
                        Settings
                    </Link>
                </nav>

                {/* FOOTER */}
                <div className="mt-auto p-4 border-t border-neutral-800">
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                        <p className="text-xs uppercase tracking-widest text-neutral-500">
                            Logged In
                        </p>

                        <p className="mt-2 text-sm font-medium truncate">
                            {user.email}
                        </p>
                    </div>
                </div>
            </aside>

            {/* CONTENT */}
            <main className="flex-1 min-w-0">

                {/* <div className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
                    <div className="px-8 py-6">
                        <h2 className="text-3xl font-black">
                            Admin Panel
                        </h2>

                        <p className="text-neutral-500 mt-1">
                            Manage artists, merch, orders and storefront content.
                        </p>
                    </div>
                </div> */}

                <div>
                    {children}
                </div>

            </main>
        </div>
    );
}