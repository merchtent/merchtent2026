"use server";

import { sendCashOutStripeTransfer } from "@/lib/cash-outs/stripe-transfer";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { checkDurableRateLimit } from "@/lib/rate-limit";
import { requireArtistAction } from "@/lib/auth/artist";

const CASH_OUT_CREATE_LIMIT = 5;
const CASH_OUT_CREATE_WINDOW_MS = 60 * 60 * 1000;

type CashOutResult = {
    cash_out_id: string;
    total_cents: number;
    item_count: number;
};

export async function createCashOut() {
    const { supabase, user, artist } = await requireArtistAction();

    const allowed = await checkDurableRateLimit(
        supabase,
        `cash_out_create:${user.id}`,
        CASH_OUT_CREATE_LIMIT,
        CASH_OUT_CREATE_WINDOW_MS,
        "check_public_rate_limit",
        { fallback: "deny" }
    );

    if (!allowed) {
        throw new Error("Too many cash-out attempts. Try again later.");
    }

    const { data: paymentAccount, error: paymentAccountError } = await supabase
        .from("artist_payment_accounts")
        .select("stripe_account_id, payouts_enabled, details_submitted")
        .eq("artist_id", artist.id)
        .maybeSingle();

    if (paymentAccountError) {
        logger.error("cash out payment account lookup failed", {
            artistId: artist.id,
            error: paymentAccountError.message,
        });
        throw new Error("Could not load Stripe payout account.");
    }

    if (!paymentAccount?.payouts_enabled || !paymentAccount?.details_submitted) {
        throw new Error("Stripe payouts must be connected before requesting a cash out.");
    }

    const { data, error } = await supabase.rpc("create_artist_cash_out", {
        p_artist_id: artist.id,
    });

    if (error) {
        logger.error("cash out rpc failed", {
            artistId: artist.id,
            error: error.message,
        });
        throw new Error("Could not create cash out.");
    }

    const result = Array.isArray(data)
        ? (data[0] as CashOutResult | undefined)
        : (data as CashOutResult | null);

    if (!result?.cash_out_id || !result.total_cents || result.total_cents <= 0) {
        revalidatePath("/dashboard/cash-out");
        return {
            ok: false,
            totalCents: 0,
            itemCount: 0,
            message: "No eligible items are available to cash out.",
        };
    }

    try {
        await sendCashOutStripeTransfer({
            cashOutId: result.cash_out_id,
            artistId: artist.id,
            amountCents: result.total_cents,
            destinationAccountId: paymentAccount.stripe_account_id,
        });
    } catch (error) {
        logger.error("cash out transfer failed", {
            artistId: artist.id,
            cashOutId: result.cash_out_id,
            error: error instanceof Error ? error.message : "Unknown cash out transfer error.",
        });
        throw new Error("Could not send cash out to Stripe.");
    }

    revalidatePath("/dashboard/cash-out");
    revalidatePath("/dashboard/cash-outs");

    return {
        ok: true,
        totalCents: result?.total_cents ?? 0,
        itemCount: result?.item_count ?? 0,
        message: "Cash out sent to Stripe.",
    };
}
