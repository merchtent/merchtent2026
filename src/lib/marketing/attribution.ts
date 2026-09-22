"use client";
import { hasMarketingConsent } from "@/lib/marketing/consent";

export type MarketingAttribution = {
    first_landing_page: string;
    first_referrer: string | null;
    first_seen_at: string;
    last_landing_page: string;
    last_referrer: string | null;
    last_seen_at: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    gclid?: string;
    gbraid?: string;
    wbraid?: string;
    fbclid?: string;
    ttclid?: string;
};

const STORAGE_KEY = "mt_marketing_attribution_v1";
const CLICK_KEYS = ["gclid", "gbraid", "wbraid", "fbclid", "ttclid"] as const;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

function clipped(value: string | null, max = 500) {
    const clean = value?.trim();
    return clean ? clean.slice(0, max) : undefined;
}

export function readMarketingAttribution(): MarketingAttribution | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as MarketingAttribution;
        return parsed?.first_landing_page ? parsed : null;
    } catch {
        return null;
    }
}

export function captureMarketingAttribution(): MarketingAttribution | null {
    if (typeof window === "undefined") return null;
    if (!hasMarketingConsent()) return null;

    const now = new Date().toISOString();
    const landingPage = `${window.location.pathname}${window.location.search}`.slice(0, 1000);
    const previous = readMarketingAttribution();
    const params = new URLSearchParams(window.location.search);
    const campaign: Partial<MarketingAttribution> = {};

    for (const key of [...UTM_KEYS, ...CLICK_KEYS]) {
        const value = clipped(params.get(key), 250);
        if (value) campaign[key] = value;
    }

    const next: MarketingAttribution = {
        first_landing_page: previous?.first_landing_page ?? landingPage,
        first_referrer: previous?.first_referrer ?? clipped(document.referrer, 1000) ?? null,
        first_seen_at: previous?.first_seen_at ?? now,
        last_landing_page: landingPage,
        last_referrer: clipped(document.referrer, 1000) ?? null,
        last_seen_at: now,
        ...previous,
        ...campaign,
    };

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        return next;
    }
    return next;
}

export function marketingAttributionJson() {
    const attribution = readMarketingAttribution() ?? captureMarketingAttribution();
    return attribution ? JSON.stringify(attribution) : "";
}
