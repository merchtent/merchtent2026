import "server-only";

import { calculateAmplifyArtistCut, type AmplifyEarningsRule } from "@/lib/artist-plans";
import { getAmplifyRuntimeConfig } from "@/lib/amplify/config";
import { getServiceSupabase } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

export type ActiveAmplifyEntitlement = {
    artistId: string;
    planKey: "amplify";
    earningsRule: AmplifyEarningsRule;
    homepagePriority: boolean;
    monthlyPromotionCredits: number;
    features: string[];
    activeUntil: string | null;
};

export async function getActiveAmplifyEntitlements(artistIds: Array<string | null | undefined>) {
    const config = getAmplifyRuntimeConfig();
    const uniqueArtistIds = Array.from(new Set(artistIds.filter((id): id is string => Boolean(id))));
    const result = new Map<string, ActiveAmplifyEntitlement>();
    if (!config.launched || !uniqueArtistIds.length) return result;

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
        .from("artist_plan_entitlements")
        .select("artist_id, plan_key, active, active_until, earnings_mode, extra_earnings_cents, extra_earnings_basis_points, homepage_priority, monthly_promotion_credits, features")
        .in("artist_id", uniqueArtistIds)
        .eq("plan_key", "amplify")
        .eq("active", true);

    if (error) {
        logger.error("Amplify entitlement lookup failed", {
            artist_count: uniqueArtistIds.length,
            error: error.message,
        });
        return result;
    }

    const now = Date.now();
    for (const row of data ?? []) {
        if (row.active_until && new Date(row.active_until).getTime() <= now) continue;
        const earningsRule: AmplifyEarningsRule | null = row.earnings_mode === "fixed"
            ? { mode: "fixed", extraCents: Number(row.extra_earnings_cents ?? 0) }
            : row.earnings_mode === "percentage"
                ? { mode: "percentage", basisPoints: Number(row.extra_earnings_basis_points ?? 0) }
                : null;
        if (!earningsRule) continue;

        result.set(row.artist_id, {
            artistId: row.artist_id,
            planKey: "amplify",
            earningsRule,
            homepagePriority: Boolean(row.homepage_priority),
            monthlyPromotionCredits: Number(row.monthly_promotion_credits ?? 0),
            features: Array.isArray(row.features) ? row.features.filter((item): item is string => typeof item === "string") : [],
            activeUntil: row.active_until,
        });
    }

    return result;
}

export async function getAmplifyPriorityArtistIds(artistIds?: string[]) {
    const entitlements = await getActiveAmplifyEntitlements(artistIds ?? []);
    return new Set(
        [...entitlements.values()]
            .filter((entitlement) => entitlement.homepagePriority)
            .map((entitlement) => entitlement.artistId)
    );
}

export function applyAmplifyEarnings(input: {
    baseArtistCutCents: number;
    retailPriceCents: number;
    entitlement?: ActiveAmplifyEntitlement | null;
}) {
    if (!input.entitlement) {
        return {
            baseArtistCutCents: Math.max(0, input.baseArtistCutCents),
            amplifyBoostCents: 0,
            artistCutCents: Math.max(0, input.baseArtistCutCents),
            artistPlanKey: "standard" as const,
        };
    }

    return {
        ...calculateAmplifyArtistCut({
            baseArtistCutCents: input.baseArtistCutCents,
            retailPriceCents: input.retailPriceCents,
            rule: input.entitlement.earningsRule,
        }),
        artistPlanKey: "amplify" as const,
    };
}
