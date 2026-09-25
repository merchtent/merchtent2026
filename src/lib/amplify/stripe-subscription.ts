import "server-only";

import Stripe from "stripe";
import { getAmplifyRuntimeConfig } from "@/lib/amplify/config";
import { getServiceSupabase } from "@/lib/supabase/service";
import { recordPlatformEvent } from "@/lib/platform-events";
import { logger } from "@/lib/logger";

const AMPLIFY_SUBSCRIPTION_EVENTS = new Set([
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.subscription.paused",
    "customer.subscription.resumed",
]);

function stripeId(value: string | { id: string } | null | undefined) {
    if (!value) return null;
    return typeof value === "string" ? value : value.id;
}

function stripeTimestamp(value: number | null | undefined) {
    return value ? new Date(value * 1000).toISOString() : null;
}

export function isAmplifySubscriptionEvent(event: Stripe.Event) {
    return AMPLIFY_SUBSCRIPTION_EVENTS.has(event.type);
}

export async function syncAmplifyStripeSubscription(
    subscription: Stripe.Subscription,
    eventId: string
) {
    const config = getAmplifyRuntimeConfig();
    const supabase = getServiceSupabase();
    const firstItem = subscription.items.data[0];
    const customerId = stripeId(subscription.customer);
    let artistId = subscription.metadata?.artist_id ?? null;

    if (!artistId) {
        const { data: existing, error } = await supabase
            .from("artist_subscriptions")
            .select("artist_id")
            .eq("stripe_subscription_id", subscription.id)
            .maybeSingle();
        if (error) throw new Error("Could not find the Amplify subscription owner.");
        artistId = existing?.artist_id ?? null;
    }

    if (!artistId || !customerId || !firstItem?.price?.id || !config.entitlements) {
        throw new Error("Amplify subscription metadata or commercial configuration is incomplete.");
    }
    if (firstItem.price.id !== config.stripePriceId) {
        throw new Error("Amplify subscription uses an unapproved Stripe Price.");
    }

    const earningsRule = config.entitlements.earningsRule;
    const snapshot = {
        artist_id: artistId,
        status: subscription.status,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: firstItem.price.id,
        current_period_start: stripeTimestamp(firstItem.current_period_start),
        current_period_end: stripeTimestamp(firstItem.current_period_end),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: stripeTimestamp(subscription.canceled_at),
        ended_at: stripeTimestamp(subscription.ended_at),
        earnings_mode: earningsRule.mode,
        extra_earnings_cents: earningsRule.mode === "fixed" ? earningsRule.extraCents : null,
        extra_earnings_basis_points: earningsRule.mode === "percentage" ? earningsRule.basisPoints : null,
        homepage_priority: config.entitlements.homepagePriority,
        monthly_promotion_credits: config.entitlements.monthlyPromotionCredits,
        features: config.entitlements.features,
        entitlements_enabled: config.launched,
        metadata: {
            stripe_event_id: eventId,
            stripe_subscription_metadata: subscription.metadata,
        },
    };

    const { error } = await supabase.rpc("sync_artist_amplify_subscription", {
        p_snapshot: snapshot,
    });
    if (error) {
        logger.error("Amplify subscription database sync failed", {
            event_id: eventId,
            artist_id: artistId,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            error: error.message,
        });
        throw new Error("Could not sync Amplify subscription state.");
    }

    await recordPlatformEvent({
        scope: "amplify",
        action: "amplify_subscription_synced",
        severity: subscription.status === "past_due" || subscription.status === "unpaid" ? "warning" : "info",
        artistId,
        externalId: subscription.id,
        message: "Merch Tent Amplify subscription state was synced from Stripe.",
        metadata: {
            stripe_event_id: eventId,
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            entitlements_enabled: config.launched,
        },
    }, {
        supabase,
        failureLogMessage: "Amplify subscription audit failed",
        throwOnFailure: true,
        failurePublicMessage: "Could not audit Amplify subscription state.",
    });
}
