import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, BadgeCheck, ShieldCheck, UserRound } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import AccountSettingsClient from "./AccountSettingsClient";

export const revalidate = 0;

export default async function AccountSettingsPage() {
    const supabase = getServerSupabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/auth/sign-in");

    const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, account_type, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

    const displayName = profile?.display_name ?? user.email ?? "Merch Tent user";
    const accountType = profile?.account_type ?? "fan";

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 bg-black">
                <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 text-sm font-black text-neutral-300 hover:text-white"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to dashboard
                        </Link>
                        <p className="mt-8 text-[11px] font-black uppercase text-red-400">Account controls</p>
                        <h1 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-[0.86] md:text-7xl">
                            Keep your login clean.
                        </h1>
                        <p className="mt-5 max-w-2xl text-sm leading-6 text-neutral-400 md:text-base">
                            Manage identity, email, password access, active sessions, and closure requests from one
                            place.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 border-b border-neutral-800 lg:border-b-0 lg:grid-cols-1">
                        <AccountStat label="Email" value={user.email ?? "Missing"} sub="Primary sign-in address" icon={<UserRound className="h-5 w-5" />} />
                        <AccountStat label="Account type" value={accountType} sub={profile?.onboarding_completed ? "Setup complete" : "Setup incomplete"} icon={<BadgeCheck className="h-5 w-5" />} />
                        <AccountStat label="Security" value="Self-service" sub="Email, password, sessions" icon={<ShieldCheck className="h-5 w-5" />} />
                    </div>
                </div>
            </section>

            <section className="p-5 md:p-8">
                <AccountSettingsClient
                    initialEmail={user.email ?? ""}
                    initialDisplayName={displayName}
                />
            </section>
        </main>
    );
}

function AccountStat({
    label,
    value,
    sub,
    icon,
}: {
    label: string;
    value: string;
    sub: string;
    icon: ReactNode;
}) {
    return (
        <div className="border-b border-r border-neutral-800 bg-neutral-950 p-4 last:border-b-0 lg:border-r-0 md:p-6">
            <div className="flex items-center justify-between gap-4 text-red-400">
                <p className="text-[10px] font-black uppercase text-neutral-500">{label}</p>
                {icon}
            </div>
            <p className="mt-3 break-words text-2xl font-black uppercase leading-none text-white md:text-3xl">{value}</p>
            <p className="mt-2 text-xs uppercase text-neutral-500">{sub}</p>
        </div>
    );
}
