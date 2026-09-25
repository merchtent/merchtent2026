export type ArtistPlanStatus = "available" | "preview" | "retired";

export type ArtistPlan = {
    key: "standard" | "amplify";
    name: string;
    status: ArtistPlanStatus;
    billingInterval: "month" | null;
    monthlyPriceCents: number | null;
    extraArtistEarningsCents: number | null;
    extraArtistEarningsBasisPoints: number | null;
    benefits: readonly string[];
};

export type AmplifyEarningsRule =
    | { mode: "fixed"; extraCents: number }
    | { mode: "percentage"; basisPoints: number };

export type AmplifyEntitlements = {
    earningsRule: AmplifyEarningsRule;
    homepagePriority: boolean;
    monthlyPromotionCredits: number;
    features: readonly string[];
};

// Recurring artist plans remain hard-disabled until pricing, billing and terms are approved.
export const ARTIST_SUBSCRIPTIONS_ENABLED = false;

export const ARTIST_PLANS: Record<ArtistPlan["key"], ArtistPlan> = {
    standard: {
        key: "standard",
        name: "Merch Tent",
        status: "available",
        billingInterval: null,
        monthlyPriceCents: null,
        extraArtistEarningsCents: null,
        extraArtistEarningsBasisPoints: null,
        benefits: ["Core artist tools", "Standard marketplace placement", "Launch kit"],
    },
    amplify: {
        key: "amplify",
        name: "Merch Tent Amplify",
        status: "preview",
        billingInterval: "month",
        monthlyPriceCents: null,
        extraArtistEarningsCents: null,
        extraArtistEarningsBasisPoints: null,
        benefits: [
            "Higher artist earnings per sale",
            "Priority homepage placement",
            "Expanded promotion through Merch Tent channels",
            "Additional artist tools",
        ],
    },
};

export function canPurchaseArtistPlan(plan: ArtistPlan) {
    const hasApprovedPricing = plan.monthlyPriceCents !== null && (
        plan.extraArtistEarningsCents !== null || plan.extraArtistEarningsBasisPoints !== null
    );

    return ARTIST_SUBSCRIPTIONS_ENABLED && plan.status === "available" && hasApprovedPricing;
}

export function calculateAmplifyEarningsBoost(
    retailPriceCents: number,
    rule: AmplifyEarningsRule
) {
    if (!Number.isSafeInteger(retailPriceCents) || retailPriceCents <= 0) return 0;

    if (rule.mode === "fixed") {
        return Number.isSafeInteger(rule.extraCents) ? Math.max(0, rule.extraCents) : 0;
    }

    if (!Number.isSafeInteger(rule.basisPoints) || rule.basisPoints <= 0) return 0;
    return Math.max(0, Math.round(retailPriceCents * rule.basisPoints / 10_000));
}

export function calculateAmplifyArtistCut(input: {
    baseArtistCutCents: number;
    retailPriceCents: number;
    rule: AmplifyEarningsRule;
}) {
    const base = Number.isSafeInteger(input.baseArtistCutCents)
        ? Math.max(0, input.baseArtistCutCents)
        : 0;
    const requestedBoost = calculateAmplifyEarningsBoost(input.retailPriceCents, input.rule);
    const boost = Math.min(requestedBoost, Math.max(0, input.retailPriceCents - base));

    return {
        baseArtistCutCents: base,
        amplifyBoostCents: boost,
        artistCutCents: base + boost,
    };
}
