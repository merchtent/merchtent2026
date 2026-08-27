import "server-only";
import { stripe } from "@/lib/stripe/client";

type CreateCashOutTransferInput = {
    cashOutId: string;
    artistId: string;
    amountCents: number;
    destinationAccountId: string;
};

export function cashOutTransferIdempotencyKey(cashOutId: string) {
    return `cash_out:${cashOutId}`;
}

export async function createCashOutTransfer({
    cashOutId,
    artistId,
    amountCents,
    destinationAccountId,
}: CreateCashOutTransferInput) {
    return stripe.transfers.create(
        {
            amount: amountCents,
            currency: "aud",
            destination: destinationAccountId,
            transfer_group: `cash_out:${cashOutId}`,
            metadata: {
                cash_out_id: cashOutId,
                artist_id: artistId,
            },
        },
        {
            idempotencyKey: cashOutTransferIdempotencyKey(cashOutId),
        }
    );
}
