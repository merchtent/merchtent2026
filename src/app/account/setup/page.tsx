import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import AccountSetupForm from "./AccountSetupForm";

export const revalidate = 0;

export default async function AccountSetupPage() {
    const supabase = getServerSupabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/auth/sign-in");

    const { data: profile } = await supabase
        .from("profiles")
        .select("account_type, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

    if (profile?.onboarding_completed && profile?.account_type) {
        redirect("/dashboard");
    }

    return (
        <main className="min-h-screen bg-[#060606] px-4 py-12 text-white md:py-16">
            <section className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[0.85fr_1.15fr] md:items-start">
                <div className="border border-white/10 bg-black p-6 md:p-8">
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-[#b6ff3f]">
                    Account setup
                    </p>
                    <h1 className="mt-4 text-5xl font-black uppercase leading-[0.86]">
                        Pick your side of the table.
                    </h1>
                    <p className="mt-5 text-sm leading-6 text-white/62">
                        Choose fan or artist. Your dashboard will unlock the right self-service tools from there.
                    </p>
                </div>

                <div className="border border-white/10 bg-[#f4f1e8] p-5 text-black md:p-6">
                    <AccountSetupForm initialEmail={user.email ?? null} />
                </div>
            </section>
        </main>
    );
}
