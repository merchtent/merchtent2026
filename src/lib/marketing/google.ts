"use client";

import type { ConsentPreferences } from "@/lib/marketing/consent";
import { hasAnalyticsConsent } from "@/lib/marketing/consent";
import type { MarketingEventName } from "@/lib/marketing/events";

declare global {
    interface Window {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
        __merchTentGa4Configured?: boolean;
    }
}

export const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim() || "";

function ensureGoogleTagQueue() {
    if (typeof window === "undefined") return null;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer?.push(args));
    return window.gtag;
}

export function updateGoogleConsent(consent: ConsentPreferences | null) {
    const gtag = ensureGoogleTagQueue();
    if (!gtag) return;

    gtag("consent", "update", {
        analytics_storage: consent?.analytics ? "granted" : "denied",
        ad_storage: consent?.marketing ? "granted" : "denied",
        ad_user_data: consent?.marketing ? "granted" : "denied",
        ad_personalization: consent?.marketing ? "granted" : "denied",
    });
}

export function configureGoogleAnalytics() {
    if (!GA4_MEASUREMENT_ID || typeof window === "undefined") return;
    const gtag = ensureGoogleTagQueue();
    if (!gtag || window.__merchTentGa4Configured) return;

    window.__merchTentGa4Configured = true;
    gtag("js", new Date());
    gtag("config", GA4_MEASUREMENT_ID, {
        send_page_view: false,
        currency: "AUD",
    });
}

export function trackGooglePageView(path: string) {
    if (!GA4_MEASUREMENT_ID || !hasAnalyticsConsent()) return;
    configureGoogleAnalytics();
    ensureGoogleTagQueue()?.("event", "page_view", {
        page_location: `${window.location.origin}${path}`,
        page_path: path,
        page_title: document.title,
    });
}

export function trackGoogleAnalyticsEvent(
    eventName: MarketingEventName,
    properties: Record<string, unknown>,
) {
    if (!GA4_MEASUREMENT_ID || !hasAnalyticsConsent()) return;
    configureGoogleAnalytics();
    const mapped = mapGoogleEvent(eventName, properties);
    ensureGoogleTagQueue()?.("event", mapped.name, mapped.parameters);
}

function mapGoogleEvent(eventName: MarketingEventName, properties: Record<string, unknown>) {
    const name = eventName === "artist_lead" || eventName === "newsletter_signup"
        ? "generate_lead"
        : eventName === "outbound_click"
            ? "click"
            : eventName;
    const parameters: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(properties)) {
        if (key === "items" || key === "value_cents") continue;
        if (value === null || value === undefined) continue;
        parameters[key] = value;
    }

    const currency = typeof properties.currency === "string" ? properties.currency : "AUD";
    parameters.currency = currency;

    if (typeof properties.value_cents === "number") {
        parameters.value = properties.value_cents / 100;
    }

    if (Array.isArray(properties.items)) {
        parameters.items = properties.items.map((item) => normaliseGoogleItem(item, currency));
    }

    if (eventName === "artist_lead") parameters.lead_type = "artist";
    if (eventName === "newsletter_signup") parameters.lead_type = "newsletter";

    return { name, parameters };
}

function normaliseGoogleItem(value: unknown, fallbackCurrency: string) {
    const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
    const priceCents = numberValue(item.price_cents) ?? numberValue(item.unit_price_cents);
    const size = stringValue(item.size_label) ?? stringValue(item.size);
    const colour = stringValue(item.color_label);

    return {
        item_id: stringValue(item.item_id) ?? stringValue(item.product_id) ?? "unknown",
        item_name: stringValue(item.item_name) ?? stringValue(item.title) ?? "Product",
        price: priceCents === null ? undefined : priceCents / 100,
        quantity: numberValue(item.quantity) ?? numberValue(item.qty) ?? 1,
        item_variant: stringValue(item.item_variant) ?? ([size, colour].filter(Boolean).join(" / ") || undefined),
        item_variant_id: stringValue(item.sku) ?? undefined,
        currency: stringValue(item.currency) ?? fallbackCurrency,
    };
}

function stringValue(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}
