import "server-only";

import { ARTIST_SUBSCRIPTIONS_ENABLED, type AmplifyEntitlements } from "@/lib/artist-plans";
import { serverEnv } from "@/lib/env.server";

export type AmplifyRuntimeConfig = {
    launched: boolean;
    configured: boolean;
    stripePriceId: string | null;
    monthlyPriceCents: number | null;
    entitlements: AmplifyEntitlements | null;
};

export function getAmplifyRuntimeConfig(): AmplifyRuntimeConfig {
    const stripePriceId = serverEnv.stripeAmplifyPriceId();
    const monthlyPriceCents = serverEnv.amplifyMonthlyPriceCents();
    const mode = serverEnv.amplifyEarningsMode();
    const fixedCents = serverEnv.amplifyExtraEarningsCents();
    const basisPoints = serverEnv.amplifyExtraEarningsBasisPoints();
    const monthlyPromotionCredits = serverEnv.amplifyMonthlyPromotionCredits();

    const earningsRule = mode === "fixed" && fixedCents !== null
        ? { mode: "fixed" as const, extraCents: fixedCents }
        : mode === "percentage" && basisPoints !== null
            ? { mode: "percentage" as const, basisPoints }
            : null;
    const entitlements = earningsRule && monthlyPromotionCredits !== null
        ? {
            earningsRule,
            homepagePriority: true,
            monthlyPromotionCredits,
            features: [
                "priority_homepage_placement",
                "expanded_social_promotion",
                "advanced_artist_tools",
            ],
        }
        : null;
    const configured = Boolean(
        stripePriceId &&
        monthlyPriceCents !== null &&
        monthlyPriceCents > 0 &&
        entitlements
    );

    return {
        launched: ARTIST_SUBSCRIPTIONS_ENABLED && configured,
        configured,
        stripePriceId,
        monthlyPriceCents,
        entitlements,
    };
}

export function requireLaunchedAmplifyConfig() {
    const config = getAmplifyRuntimeConfig();
    if (!config.launched || !config.stripePriceId || !config.entitlements) {
        throw new Error("Merch Tent Amplify is not available yet.");
    }
    return config as AmplifyRuntimeConfig & {
        stripePriceId: string;
        monthlyPriceCents: number;
        entitlements: AmplifyEntitlements;
    };
}
