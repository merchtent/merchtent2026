"use client";

import { captureMarketingAttribution, readMarketingAttribution } from "@/lib/marketing/attribution";
import { hasAnalyticsConsent } from "@/lib/marketing/consent";
import { getAnalyticsSessionId } from "@/lib/marketing/session";
import { trackGoogleAnalyticsEvent } from "@/lib/marketing/google";

export type MarketingEventName =
    | "view_item_list"
    | "select_item"
    | "view_item"
    | "add_to_cart"
    | "view_cart"
    | "remove_from_cart"
    | "view_checkout"
    | "begin_checkout"
    | "checkout_error"
    | "purchase"
    | "sign_up"
    | "artist_lead"
    | "artist_activation"
    | "newsletter_signup"
    | "search"
    | "outbound_click";

export type CommerceItem = {
    item_id: string;
    item_name?: string;
    price_cents?: number;
    currency?: string;
    quantity?: number;
    item_variant?: string;
};

export function trackMarketingEvent(
    eventName: MarketingEventName,
    properties: Record<string, unknown> = {},
) {
    if (typeof window === "undefined") return;
    if (!hasAnalyticsConsent()) return;

    trackGoogleAnalyticsEvent(eventName, properties);

    const attribution = readMarketingAttribution() ?? captureMarketingAttribution();
    const payload = JSON.stringify({
        event_name: eventName,
        path: `${window.location.pathname}${window.location.search}`,
        session_id: getAnalyticsSessionId(),
        attribution,
        properties,
    });

    if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track/event", new Blob([payload], { type: "application/json" }));
        return;
    }

    fetch("/api/track/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
    }).catch(() => undefined);
}
