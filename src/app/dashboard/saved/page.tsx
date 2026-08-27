import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bell, Heart, MapPin, Package, Search, Star } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";

export const revalidate = 0;

export default async function DashboardSavedPage() {
    const supabase = getServerSupabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/auth/sign-in");

    const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

    if (!profile?.onboarding_completed) redirect("/account/setup");

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 bg-black p-5 md:p-8">
                <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                    <Heart className="h-4 w-4" />
                    Saved scene
                </p>
                <h1 className="mt-3 max-w-4xl text-5xl font-black uppercase leading-[0.86] md:text-7xl">
                    Hold the drops you want next.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                    This is the fan shelf for saved artists, wishlist merch, alerts, addresses, and support shortcuts.
                </p>
            </section>

            <section className="grid border-b border-neutral-800 md:grid-cols-2 xl:grid-cols-4">
                <SavedCard
                    icon={<Star className="h-5 w-5" />}
                    title="Saved artists"
                    body="Favourite buttons will land artists here so fans can follow drops without hunting through the shop."
                    action="Browse artists"
                    href="/artists"
                />
                <SavedCard
                    icon={<Package className="h-5 w-5" />}
                    title="Wishlist"
                    body="Fans should be able to park products for payday, show night, or a future bundle."
                    action="Shop new drops"
                    href="/new"
                />
                <SavedCard
                    icon={<MapPin className="h-5 w-5" />}
                    title="Addresses"
                    body="Saved shipping addresses will make repeat orders quicker once customer volume grows."
                    action="Use checkout"
                    href="/checkout"
                />
                <SavedCard
                    icon={<Bell className="h-5 w-5" />}
                    title="Alerts"
                    body="Drop alerts, artist updates, and credit reminders belong here as notification preferences mature."
                    action="Account settings"
                    href="/dashboard/account"
                />
            </section>

            <section className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-8">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">Coming next</p>
                    <h2 className="mt-2 text-4xl font-black uppercase leading-none">Real saved data, not placeholders.</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
                        The page is now in the dashboard nav. The next product step is wiring favourite buttons on artists
                        and products into a saved-items table, then showing those records here.
                    </p>
                </div>
                <Link
                    href="/artists"
                    className="inline-flex items-center justify-center gap-2 bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-500"
                >
                    Find artists <Search className="h-4 w-4" />
                </Link>
            </section>
        </main>
    );
}

function SavedCard({
    icon,
    title,
    body,
    action,
    href,
}: {
    icon: React.ReactNode;
    title: string;
    body: string;
    action: string;
    href: string;
}) {
    return (
        <div className="border-b border-neutral-800 bg-neutral-950 p-5 md:p-6 xl:border-b-0 xl:border-r xl:last:border-r-0">
            <div className="text-red-400">{icon}</div>
            <h2 className="mt-5 text-3xl font-black uppercase leading-none">{title}</h2>
            <p className="mt-4 min-h-24 text-sm leading-6 text-neutral-400">{body}</p>
            <Link href={href} className="mt-6 inline-flex items-center gap-2 text-sm font-black text-red-400 hover:text-red-300">
                {action} <ArrowRight className="h-4 w-4" />
            </Link>
        </div>
    );
}
