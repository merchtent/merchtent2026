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
        <main className="min-h-screen bg-neutral-950 px-4 py-10 text-neutral-100">
            <section className="mx-auto max-w-2xl">
                <p className="text-xs uppercase tracking-[0.25em] text-red-500">
                    Account setup
                </p>
                <h1 className="mt-2 text-3xl font-black leading-tight">
                    Choose how you want to use Merch Tent
                </h1>
                <p className="mt-2 text-sm text-neutral-400">
                    You can start as a fan or artist. The dashboard will adapt to the account you choose.
                </p>

                <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                    <AccountSetupForm initialEmail={user.email ?? null} />
                </div>
            </section>
        </main>
    );
}
