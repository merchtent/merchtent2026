import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import DashboardSidebar from "./DashboardSidebar";
import DashboardShell from "./DashboardShell";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

type DashboardLayoutProps = {
    children: React.ReactNode;
};

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
    const displayName = profile?.display_name ?? user?.email ?? "Guest";
    const { data: artist } = isArtist && user
        ? await supabase
            .from("artists")
            .select("slug")
            .eq("user_id", user.id)
            .maybeSingle()
        : { data: null };

    return (
        <DashboardShell sidebar={<DashboardSidebar displayName={displayName} isArtist={isArtist} artistSlug={artist?.slug ?? null} />}>
            {children}
        </DashboardShell>
    );
}
