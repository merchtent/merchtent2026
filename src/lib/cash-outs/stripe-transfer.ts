import "server-only";
import Stripe from "stripe";
import { getServiceSupabase } from "@/lib/supabase/service";
import {
    cashOutTransferIdempotencyKey,
    createCashOutTransfer,
} from "@/lib/stripe/transfers";
import { logger } from "@/lib/logger";
import { recordPlatformEvent, type PlatformEventSeverity } from "@/lib/platform-events";

type SendCashOutStripeTransferInput = {
    cashOutId: string;
    artistId: string;
    amountCents: number;
    destinationAccountId: string;
};

type ExistingTransferRow = {
    status: string | null;
    stripe_transfer_id: string | null;
};

function errorContext(error: unknown) {
    return {
        error: error instanceof Error ? error.message : String(error),
    };
}

function failCashOutTransfer(
    message: string,
    details: Record<string, unknown>
): never {
    logger.error(message, details);
    throw new Error("Could not process cash-out transfer.");
}

async function logPayoutEvent(
    serviceSupabase: ReturnType<typeof getServiceSupabase>,
    input: {
        action: string;
        severity?: PlatformEventSeverity;
        artistId: string;
        cashOutId: string;
        message: string;
        metadata?: Record<string, unknown>;
    }
) {
    await recordPlatformEvent(
        {
            scope: "payouts",
            action: input.action,
            severity: input.severity ?? "info",
            artistId: input.artistId,
            externalId: input.cashOutId,
            message: input.message,
            metadata: input.metadata ?? {},
        },
        {
            supabase: serviceSupabase,
            failureLogMessage: "failed to write payout platform event",
            failureContext: {
                cash_out_id: input.cashOutId,
                artist_id: input.artistId,
            },
        }
    );
}

export async function sendCashOutStripeTransfer({
    cashOutId,
    artistId,
    amountCents,
    destinationAccountId,
}: SendCashOutStripeTransferInput) {
    const serviceSupabase = getServiceSupabase();
    const idempotencyKey = cashOutTransferIdempotencyKey(cashOutId);
    const attemptedAt = new Date().toISOString();

    const { data: existingTransfer, error: existingTransferError } = await serviceSupabase
        .from("artist_transfers")
        .select("status, stripe_transfer_id")
        .eq("cash_out_id", cashOutId)
        .maybeSingle();

    if (existingTransferError) {
        failCashOutTransfer("Cash-out transfer ledger lookup failed", {
            cash_out_id: cashOutId,
            artist_id: artistId,
            ...errorContext(existingTransferError),
        });
    }

    const typedExistingTransfer = existingTransfer as ExistingTransferRow | null;
    if (typedExistingTransfer?.status === "succeeded") {
        if (!typedExistingTransfer.stripe_transfer_id) {
            logger.error("Cash-out transfer ledger is succeeded without a Stripe transfer id", {
                cash_out_id: cashOutId,
                artist_id: artistId,
            });
            throw new Error("Cash-out transfer ledger is missing the Stripe transfer id.");
        }

        const { error: cashOutRepairError } = await serviceSupabase
            .from("cash_outs")
            .update({ status: "paid" })
            .eq("id", cashOutId)
            .eq("artist_id", artistId);

        if (cashOutRepairError) {
            failCashOutTransfer("Cash-out paid status repair failed for already-succeeded transfer", {
                cash_out_id: cashOutId,
                artist_id: artistId,
                ...errorContext(cashOutRepairError),
            });
        }

        await logPayoutEvent(serviceSupabase, {
            action: "cash_out_transfer_already_succeeded",
            severity: "info",
            artistId,
            cashOutId,
            message: "Artist cash-out transfer was already succeeded; payout retry skipped.",
            metadata: {
                amount_cents: amountCents,
                stripe_transfer_id: typedExistingTransfer.stripe_transfer_id,
                idempotency_key: idempotencyKey,
            },
        });

        return { id: typedExistingTransfer.stripe_transfer_id };
    }

    const { error: ledgerError } = await serviceSupabase
        .from("artist_transfers")
        .upsert(
            {
                cash_out_id: cashOutId,
                artist_id: artistId,
                amount_cents: amountCents,
                currency: "AUD",
                destination_account_id: destinationAccountId,
                idempotency_key: idempotencyKey,
                status: "processing",
                failure_code: null,
                failure_message: null,
                attempted_at: attemptedAt,
            },
            { onConflict: "cash_out_id" }
        );

    if (ledgerError) {
        failCashOutTransfer("Cash-out transfer ledger write failed", {
            cash_out_id: cashOutId,
            artist_id: artistId,
            ...errorContext(ledgerError),
        });
    }

    await logPayoutEvent(serviceSupabase, {
        action: "cash_out_transfer_attempted",
        artistId,
        cashOutId,
        message: "Artist cash-out transfer attempt started.",
        metadata: {
            amount_cents: amountCents,
            destination_account_id: destinationAccountId,
            idempotency_key: idempotencyKey,
        },
    });

    try {
        const transfer = await createCashOutTransfer({
            cashOutId,
            artistId,
            amountCents,
            destinationAccountId,
        });

        const completedAt = new Date().toISOString();
        const { error: transferUpdateError } = await serviceSupabase
            .from("artist_transfers")
            .update({
                status: "succeeded",
                stripe_transfer_id: transfer.id,
                failure_code: null,
                failure_message: null,
                succeeded_at: completedAt,
            })
            .eq("cash_out_id", cashOutId);

        if (transferUpdateError) {
            logger.error("Cash-out transfer success ledger update failed", {
                cash_out_id: cashOutId,
                artist_id: artistId,
                ...errorContext(transferUpdateError),
            });
            throw new Error("Could not update cash-out transfer ledger.");
        }

        const { error: cashOutUpdateError } = await serviceSupabase
            .from("cash_outs")
            .update({ status: "paid" })
            .eq("id", cashOutId)
            .eq("artist_id", artistId);

        if (cashOutUpdateError) {
            logger.error("Cash-out status update failed after Stripe transfer", {
                cash_out_id: cashOutId,
                artist_id: artistId,
                ...errorContext(cashOutUpdateError),
            });
            throw new Error("Could not update cash-out status.");
        }

        await logPayoutEvent(serviceSupabase, {
            action: "cash_out_transfer_succeeded",
            artistId,
            cashOutId,
            message: "Artist cash-out transfer succeeded.",
            metadata: {
                amount_cents: amountCents,
                stripe_transfer_id: transfer.id,
            },
        });

        return transfer;
    } catch (error) {
        const stripeError = error instanceof Stripe.errors.StripeError ? error : null;
        const failedAt = new Date().toISOString();

        const { error: transferFailureUpdateError } = await serviceSupabase
            .from("artist_transfers")
            .update({
                status: "failed",
                failure_code: stripeError?.code ?? stripeError?.type ?? null,
                failure_message:
                    stripeError?.message ??
                    (error instanceof Error ? error.message : "Stripe transfer failed"),
                failed_at: failedAt,
            })
            .eq("cash_out_id", cashOutId);

        if (transferFailureUpdateError) {
            logger.error("Cash-out transfer failure ledger update failed", {
                cash_out_id: cashOutId,
                artist_id: artistId,
                ...errorContext(transferFailureUpdateError),
            });
        }

        const { error: cashOutFailureUpdateError } = await serviceSupabase
            .from("cash_outs")
            .update({ status: "transfer_failed" })
            .eq("id", cashOutId)
            .eq("artist_id", artistId);

        if (cashOutFailureUpdateError) {
            logger.error("Cash-out failure status update failed", {
                cash_out_id: cashOutId,
                artist_id: artistId,
                ...errorContext(cashOutFailureUpdateError),
            });
        }

        logger.error("Stripe cash-out transfer failed", {
            cash_out_id: cashOutId,
            artist_id: artistId,
            failure_code: stripeError?.code ?? stripeError?.type ?? null,
            ...errorContext(error),
        });
        await logPayoutEvent(serviceSupabase, {
            action: "cash_out_transfer_failed",
            severity: "critical",
            artistId,
            cashOutId,
            message: "Artist cash-out transfer failed.",
            metadata: {
                amount_cents: amountCents,
                failure_code: stripeError?.code ?? stripeError?.type ?? null,
                error: error instanceof Error ? error.message : String(error),
            },
        });
        throw new Error("Could not process cash-out transfer.");
    }
}
