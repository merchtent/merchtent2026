import { AudioLines } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAmplifyRuntimeConfig } from "@/lib/amplify/config";
import { updateAmplifyPromotionRequest } from "./actions";

export default async function AdminAmplifyPage() {
    const { supabase } = await requireAdminPage();
    const config = getAmplifyRuntimeConfig();
    const [subscriptionsResult, requestsResult] = await Promise.all([
        supabase
            .from("artist_subscriptions")
            .select("id, status, current_period_end, cancel_at_period_end, artists(display_name)")
            .order("updated_at", { ascending: false }),
        supabase
            .from("artist_promotion_requests")
            .select("id, channel, status, requested_for, brief, published_url, created_at, artists(display_name), products(title)")
            .order("created_at", { ascending: false }),
    ]);
    const subscriptions = subscriptionsResult.data ?? [];
    const requests = requestsResult.data ?? [];

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 p-5 md:p-8">
                <div className="flex items-center gap-3 text-lime-300">
                    <AudioLines className="h-5 w-5" />
                    <p className="text-[11px] font-black uppercase tracking-[0.24em]">Artist plans</p>
                </div>
                <h1 className="mt-3 text-4xl font-black md:text-6xl">Amplify operations</h1>
                <p className="mt-4 text-sm text-neutral-400">
                    {config.launched ? "Amplify is accepting memberships." : "Preview mode: checkout, earnings boosts and placement are off."}
                </p>
            </section>

            <section className="grid border-b border-neutral-800 md:grid-cols-3">
                <div className="border-b border-neutral-800 p-5 md:border-b-0 md:border-r">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">Subscriptions</p>
                    <p className="mt-2 text-3xl font-black">{subscriptions.length}</p>
                </div>
                <div className="border-b border-neutral-800 p-5 md:border-b-0 md:border-r">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">Active</p>
                    <p className="mt-2 text-3xl font-black text-lime-300">{subscriptions.filter((row) => ["active", "trialing"].includes(row.status)).length}</p>
                </div>
                <div className="p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">Promotion queue</p>
                    <p className="mt-2 text-3xl font-black text-yellow-300">{requests.filter((row) => row.status === "submitted").length}</p>
                </div>
            </section>

            <section className="p-5 md:p-8">
                <h2 className="text-2xl font-black">Promotion requests</h2>
                <div className="mt-5 space-y-3">
                    {requests.length ? requests.map((request) => {
                        const artist = Array.isArray(request.artists) ? request.artists[0] : request.artists;
                        const product = Array.isArray(request.products) ? request.products[0] : request.products;
                        return (
                            <article key={request.id} className="grid gap-4 border border-neutral-800 p-5 xl:grid-cols-[1fr_420px]">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-black">{artist?.display_name ?? "Artist"}</h3>
                                        <span className="border border-neutral-700 px-2 py-1 text-[9px] font-black uppercase text-neutral-300">{request.channel}</span>
                                        <span className="border border-yellow-700 px-2 py-1 text-[9px] font-black uppercase text-yellow-300">{request.status}</span>
                                    </div>
                                    <p className="mt-2 text-sm text-neutral-400">{product?.title ?? "Artist campaign"}</p>
                                    {request.requested_for ? <p className="mt-1 text-xs text-neutral-500">Preferred {request.requested_for}</p> : null}
                                    {request.brief ? <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-300">{request.brief}</p> : null}
                                </div>
                                <form action={updateAmplifyPromotionRequest} className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
                                    <input type="hidden" name="request_id" value={request.id} />
                                    <select name="status" defaultValue={request.status} className="border border-neutral-700 bg-black p-3 text-sm">
                                        <option value="submitted">Submitted</option>
                                        <option value="scheduled">Scheduled</option>
                                        <option value="published">Published</option>
                                        <option value="declined">Declined</option>
                                        <option value="canceled">Canceled</option>
                                    </select>
                                    <input name="published_url" type="url" defaultValue={request.published_url ?? ""} placeholder="Published URL" className="min-w-0 border border-neutral-700 bg-black p-3 text-sm" />
                                    <button className="bg-lime-300 px-4 py-3 text-sm font-black text-black">Save</button>
                                </form>
                            </article>
                        );
                    }) : <p className="border border-neutral-800 p-5 text-sm text-neutral-500">No promotion requests yet.</p>}
                </div>
            </section>
        </main>
    );
}
