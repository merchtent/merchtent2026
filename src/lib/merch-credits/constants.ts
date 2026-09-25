export const MERCH_CREDIT_REDEMPTION_POINTS = 20;
export const MERCH_CREDIT_REDEMPTION_CENTS = 2_000;
export const MERCH_CREDITS_EARNED_PER_ITEM = 3;

export function merchCreditDiscountCents(input: {
    subtotalCents: number;
    creditBalance: number;
}) {
    return input.creditBalance >= MERCH_CREDIT_REDEMPTION_POINTS &&
        input.subtotalCents >= MERCH_CREDIT_REDEMPTION_CENTS
        ? MERCH_CREDIT_REDEMPTION_CENTS
        : 0;
}
