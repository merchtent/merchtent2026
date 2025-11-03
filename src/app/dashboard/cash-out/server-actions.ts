"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createCashOut() {
    const supabase = getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: artist } = await supabase
        .from("artists")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
    if (!artist) return;

    const { data: unpaid } = await supabase
        .from("order_items")
        .select("id, qty, products(artist_cut_cents)")
        .eq("artist_id", artist.id)
        .eq("cashed_out", false);

    if (!unpaid?.length) return;

    const totalCents =
        unpaid.reduce((sum, i) => {
            const product = Array.isArray(i.products) ? i.products[0] : i.products;
            const artistCut = product?.artist_cut_cents ?? 0;
            return sum + ((i.qty ?? 0) * artistCut);
        }, 0) ?? 0;

    const { data: cashOut, error: cashErr } = await supabase
        .from("cash_outs")
        .insert({
            artist_id: artist.id,
            total_cents: totalCents,
            status: "pending",
        })
        .select("id")
        .single();

    if (cashErr || !cashOut) return;

    const inserts = unpaid.map((i) => {
        const product = Array.isArray(i.products) ? i.products[0] : i.products;
        const artistCut = product?.artist_cut_cents ?? 0;
        return {
            cash_out_id: cashOut.id,
            order_item_id: i.id,
            artist_id: artist.id,
            amount_cents: (i.qty ?? 0) * artistCut,
        };
    });

    await supabase.from("cash_out_items").insert(inserts);

    const { error: updateErr } = await supabase
        .from("order_items")
        .update({ cashed_out: true })
        .eq("artist_id", artist.id)
        .eq("cashed_out", false);

    if (updateErr) {
        console.error("[CashOut] Update failed:", updateErr);
        throw updateErr;
    }

    // ✅ Revalidate the cache — but don't redirect
    revalidatePath("/dashboard/cash-out");

    return { ok: true, totalCents }; // send something back to client
}
