"use client";

export type ConsentPreferences = { analytics: boolean; marketing: boolean; updated_at: string };
const CONSENT_KEY = "mt_consent_v1";

export function readConsent(): ConsentPreferences | null {
    if (typeof window === "undefined") return null;
    try {
        const value = JSON.parse(localStorage.getItem(CONSENT_KEY) || "null") as ConsentPreferences | null;
        return value && typeof value.analytics === "boolean" && typeof value.marketing === "boolean" ? value : null;
    } catch { return null; }
}

export function saveConsent(preferences: Omit<ConsentPreferences, "updated_at">) {
    const value = { ...preferences, updated_at: new Date().toISOString() };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("merch-tent:consent", { detail: value }));
    return value;
}

export function hasAnalyticsConsent() { return readConsent()?.analytics === true; }
export function hasMarketingConsent() { return readConsent()?.marketing === true; }
