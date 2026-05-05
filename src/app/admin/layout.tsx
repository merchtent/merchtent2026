import { redirect } from "next/navigation";
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

    if (error) {
        console.error("Profile error:", error);
        redirect("/");
    }

    if (!profile) {
        console.error("No profile found");
        redirect("/");
    }

    if (profile.role !== "admin") {
        redirect("/");
    }

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <div
                style={{
                    width: 220,
                    borderRight: "1px solid #eee",
                    padding: 20,
                }}
            >
                <h3>Admin</h3>
                <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <a href="/admin">Dashboard</a>
                    <a href="/admin/orders">Orders</a>
                </nav>
            </div>

            <div style={{ flex: 1, padding: 24 }}>{children}</div>
        </div>
    );
}