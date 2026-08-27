"use server";

import { sendCashOutStripeTransfer } from "@/lib/cash-outs/stripe-transfer";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { checkDurableRateLimit } from "@/lib/rate-limit";
import { requireArtistAction } from "@/lib/auth/artist";

const CASH_OUT_RETRY_LIMIT = 10;
const CASH_OUT_RETRY_WINDOW_MS = 60 * 60 * 1000;

type CashOutRow = {
    id: string;
    artist_id: string;
    total_cents: number;
    status: string | null;
};

export async function retryCashOutTransfer(cashOutId: string) {
    const { supabase, user, artist } = await requireArtistAction();

    const allowed = await checkDurableRateLimit(
        supabase,
        `cash_out_retry:${user.id}`,
        CASH_OUT_RETRY_LIMIT,
        CASH_OUT_RETRY_WINDOW_MS,
        "check_public_rate_limit",
        { fallback: "deny" }
    );

    if (!allowed) {
        throw new Error("Too many cash-out retry attempts. Try again later.");
    }

    const { data: cashOut, error: cashOutError } = await supabase
        .from("cash_outs")
        .select("id, artist_id, total_cents, status")
        .eq("id", cashOutId)
        .eq("artist_id", artist.id)
        .maybeSingle();

    if (cashOutError) {
        logger.error("cash out retry lookup failed", {
            user_id: user.id,
            artist_id: artist.id,
            cash_out_id: cashOutId,
            error: cashOutError.message,
        });
        throw new Error("Could not load cash out.");
    }

    if (!cashOut) {
        throw new Error("Cash out not found.");
    }

    const typedCashOut = cashOut as CashOutRow;
    if (typedCashOut.status === "paid") {
        return { ok: true, message: "This cash out has already been paid." };
    }

    if ((typedCashOut.total_cents ?? 0) <= 0) {
        throw new Error("Cash out amount is invalid.");
    }

    const { data: transfer } = await supabase
        .from("artist_transfers")
        .select("status")
        .eq("cash_out_id", typedCashOut.id)
        .maybeSingle();

    if (transfer?.status === "succeeded") {
        return { ok: true, message: "This transfer has already succeeded." };
    }

    const { data: paymentAccount, error: paymentAccountError } = await supabase
        .from("artist_payment_accounts")
        .select("stripe_account_id, payouts_enabled, details_submitted")
        .eq("artist_id", artist.id)
        .maybeSingle();

    if (paymentAccountError) {
        logger.error("cash out retry payment account lookup failed", {
            user_id: user.id,
            artist_id: artist.id,
            cash_out_id: typedCashOut.id,
            error: paymentAccountError.message,
        });
        throw new Error("Could not load Stripe payout account.");
    }

    if (!paymentAccount) {
        throw new Error("Stripe payout account not found.");
    }

    if (!paymentAccount.payouts_enabled || !paymentAccount.details_submitted) {
        throw new Error("Stripe payouts must be connected before retrying this cash out.");
    }

    try {
        await sendCashOutStripeTransfer({
            cashOutId: typedCashOut.id,
            artistId: artist.id,
            amountCents: typedCashOut.total_cents,
            destinationAccountId: paymentAccount.stripe_account_id,
        });
    } catch (error) {
        logger.error("cash out retry transfer failed", {
            user_id: user.id,
            artist_id: artist.id,
            cash_out_id: typedCashOut.id,
            error: error instanceof Error ? error.message : "Unknown transfer retry error.",
        });
        throw new Error("Could not retry cash out transfer.");
    }

    revalidatePath("/dashboard/cash-outs");
    revalidatePath("/dashboard/cash-out");

    return { ok: true, message: "Cash out transfer retried." };
}
