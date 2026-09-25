import { AudioLines, BadgeDollarSign, Megaphone, Sparkles } from "lucide-react";
import { getAmplifyRuntimeConfig } from "@/lib/amplify/config";
import { requireArtistPage } from "@/lib/auth/artist";
import AmplifyBillingActions from "./AmplifyBillingActions";
import PromotionRequestForm from "./PromotionRequestForm";

type SubscriptionRow = {
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    stripe_customer_id: string;
};

type EntitlementRow = {
    active: boolean;
    monthly_promotion_credits: number;
};

export default async function AmplifyPage() {
    const { supabase, artist } = await requireArtistPage();
    const config = getAmplifyRuntimeConfig();
    const [subscriptionResult, entitlementResult, promotionsResult, productsResult] = await Promise.all([
        supabase
            .from("artist_subscriptions")
            .select("status, current_period_end, cancel_at_period_end, stripe_customer_id")
            .eq("artist_id", artist.id)
            .maybeSingle(),
        supabase
            .from("artist_plan_entitlements")
            .select("active, monthly_promotion_credits")
            .eq("artist_id", artist.id)
            .maybeSingle(),
        supabase
            .from("artist_promotion_requests")
            .select("id, status, channel, period_start")
            .eq("artist_id", artist.id)
            .order("created_at", { ascending: false }),
        supabase
            .from("products")
            .select("id, title")
            .eq("artist_id", artist.id)
            .is("archived_at", null)
            .order("title"),
    ]);
    const subscription = subscriptionResult.data as SubscriptionRow | null;
    const entitlement = entitlementResult.data as EntitlementRow | null;
    const monthStart = new Date().toISOString().slice(0, 7) + "-01";
    const usedPromotions = (promotionsResult.data ?? []).filter((request) =>
        request.period_start === monthStart && !["declined", "canceled"].includes(request.status)
    ).length;
    const isActive = Boolean(config.launched && entitlement?.active);

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 p-5 md:p-8">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-lime-300">Artist growth</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                    <h1 className="text-4xl font-black md:text-6xl">Merch Tent Amplify</h1>
                    {!config.launched ? <span className="border border-yellow-500 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-yellow-300">Preview</span> : null}
                </div>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-400">
                    Earn more from each eligible sale, get stronger placement and request extra promotion through Merch Tent channels.
                </p>
            </section>

            <section className="grid border-b border-neutral-800 md:grid-cols-3">
                {[
                    { icon: BadgeDollarSign, title: "Higher earnings", body: "A configured boost is snapshotted onto every eligible sale." },
                    { icon: AudioLines, title: "Better placement", body: "Active artists receive priority within eligible homepage product positions." },
                    { icon: Megaphone, title: "More promotion", body: "Included monthly requests help put your drops in front of more fans." },
                ].map(({ icon: Icon, title, body }) => (
                    <div key={title} className="border-b border-neutral-800 p-5 md:border-b-0 md:border-r md:p-7">
                        <Icon className="h-5 w-5 text-red-500" />
                        <h2 className="mt-4 text-xl font-black">{title}</h2>
                        <p className="mt-2 text-sm leading-6 text-neutral-400">{body}</p>
                    </div>
                ))}
            </section>

            {!config.launched ? (
                <section className="p-5 md:p-8">
                    <div className="max-w-3xl border border-neutral-800 bg-neutral-950 p-6">
                        <Sparkles className="h-5 w-5 text-lime-300" />
                        <h2 className="mt-4 text-2xl font-black">Not open yet.</h2>
                        <p className="mt-3 text-sm leading-6 text-neutral-400">
                            The billing, earnings, placement and promotion systems are prepared, but Amplify cannot be purchased or applied while it remains in preview.
                        </p>
                    </div>
                </section>
            ) : (
                <section className="space-y-8 p-5 md:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-5 border border-neutral-800 p-5">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">Membership</p>
                            <p className="mt-2 text-xl font-black capitalize">{subscription?.status ?? "Not active"}</p>
                            {subscription?.current_period_end ? (
                                <p className="mt-1 text-xs text-neutral-400">
                                    {subscription.cancel_at_period_end ? "Access ends" : "Next billing period"} {new Date(subscription.current_period_end).toLocaleDateString("en-AU")}
                                </p>
                            ) : null}
                        </div>
                        <AmplifyBillingActions hasBilling={Boolean(subscription?.stripe_customer_id)} />
                    </div>

                    {isActive ? (
                        <div>
                            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-lime-300">Promotion allowance</p>
                                    <h2 className="mt-2 text-2xl font-black">Request a push.</h2>
                                </div>
                                <p className="text-sm font-bold text-neutral-300">
                                    {usedPromotions} of {entitlement?.monthly_promotion_credits ?? 0} used this month
                                </p>
                            </div>
                            <PromotionRequestForm products={(productsResult.data ?? []).map((product) => ({ id: product.id, title: product.title }))} />
                        </div>
                    ) : null}
                </section>
            )}
        </main>
    );
}
