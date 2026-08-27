import "server-only";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { serverEnv } from "@/lib/env.server";

export type StripeConnectSnapshot = {
    stripe_account_id: string;
    onboarding_status: "not_started" | "pending" | "complete" | "restricted";
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted: boolean;
    disabled_reason: string | null;
    last_synced_at: string;
};

export async function createArtistStripeAccount(email?: string | null) {
    return stripe.accounts.create({
        type: "express",
        country: "AU",
        email: email || undefined,
        capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
        },
        business_type: "individual",
    });
}

export async function createArtistOnboardingLink(accountId: string) {
    const siteUrl = serverEnv.siteUrl();

    return stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${siteUrl}/dashboard/cash-out?stripe_connect=refresh`,
        return_url: `${siteUrl}/dashboard/cash-out?stripe_connect=return`,
        type: "account_onboarding",
    });
}

export function snapshotStripeAccount(account: Stripe.Account): StripeConnectSnapshot {
    const disabledReason =
        account.requirements?.disabled_reason ||
        account.future_requirements?.disabled_reason ||
        null;
    const complete = Boolean(
        account.charges_enabled &&
        account.payouts_enabled &&
        account.details_submitted &&
        !disabledReason
    );

    return {
        stripe_account_id: account.id,
        onboarding_status: complete ? "complete" : disabledReason ? "restricted" : "pending",
        charges_enabled: Boolean(account.charges_enabled),
        payouts_enabled: Boolean(account.payouts_enabled),
        details_submitted: Boolean(account.details_submitted),
        disabled_reason: disabledReason,
        last_synced_at: new Date().toISOString(),
    };
}
