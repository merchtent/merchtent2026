import "server-only";

import { logger } from "@/lib/logger";
import { getServiceSupabase } from "@/lib/supabase/service";

export const MERCH_CREDIT_REDEMPTION_POINTS = 20;
export const MERCH_CREDIT_RESERVATION_MINUTES = 60;

type ReservationResult = {
    ok: true;
    reservation_id: string;
    points: number;
    discount_cents: number;
    idempotent?: boolean;
};

function assertReservationResult(value: unknown): ReservationResult {
    if (!value || typeof value !== "object") {
        throw new Error("Credit reservation failed.");
    }

    const result = value as Partial<ReservationResult>;
    if (
        result.ok !== true ||
        !result.reservation_id ||
        !result.points ||
        !result.discount_cents
    ) {
        throw new Error("Credit reservation returned an invalid response.");
    }

    return result as ReservationResult;
}

function failMerchCreditOperation(
    message: string,
    details: Record<string, unknown>
): never {
    logger.error(message, details);
    throw new Error("Could not update merch credits.");
}

export function merchCreditReservationExpiry(now = new Date()) {
    return new Date(
        now.getTime() + MERCH_CREDIT_RESERVATION_MINUTES * 60 * 1000
    ).toISOString();
}

export async function reserveMerchCreditsForCheckout(input: {
    userId: string;
    discountCents: number;
    currency: string;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
}) {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.rpc("reserve_merch_credits", {
        p_user_id: input.userId,
        p_points: MERCH_CREDIT_REDEMPTION_POINTS,
        p_discount_cents: input.discountCents,
        p_currency: input.currency,
        p_idempotency_key: input.idempotencyKey,
        p_expires_at: merchCreditReservationExpiry(),
        p_metadata: input.metadata ?? {},
    });

    if (error) {
        failMerchCreditOperation("merch credit reservation rpc failed", {
            user_id: input.userId,
            discount_cents: input.discountCents,
            currency: input.currency,
            idempotency_key: input.idempotencyKey,
            error: error.message,
        });
    }
    return assertReservationResult(data);
}

export async function attachMerchCreditReservationToStripeSession(input: {
    reservationId: string;
    stripeSessionId: string;
}) {
    const supabase = getServiceSupabase();
    const { error } = await supabase.rpc("attach_merch_credit_reservation", {
        p_reservation_id: input.reservationId,
        p_stripe_session_id: input.stripeSessionId,
    });

    if (error) {
        failMerchCreditOperation("merch credit reservation attach rpc failed", {
            reservation_id: input.reservationId,
            stripe_session_id: input.stripeSessionId,
            error: error.message,
        });
    }
}

export async function releaseMerchCreditReservation(input: {
    reservationId: string;
    reason: string;
}) {
    const supabase = getServiceSupabase();
    const { error } = await supabase.rpc("release_merch_credit_reservation", {
        p_reservation_id: input.reservationId,
        p_reason: input.reason,
    });

    if (error) {
        failMerchCreditOperation("merch credit reservation release rpc failed", {
            reservation_id: input.reservationId,
            reason: input.reason,
            error: error.message,
        });
    }
}

export async function redeemMerchCreditReservation(input: {
    reservationId: string;
    orderId: string;
}) {
    const supabase = getServiceSupabase();
    const { error } = await supabase.rpc("redeem_merch_credit_reservation", {
        p_reservation_id: input.reservationId,
        p_order_id: input.orderId,
    });

    if (error) {
        failMerchCreditOperation("merch credit reservation redeem rpc failed", {
            reservation_id: input.reservationId,
            order_id: input.orderId,
            error: error.message,
        });
    }
}
