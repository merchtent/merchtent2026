"use client";

import { captureMarketingAttribution, readMarketingAttribution } from "@/lib/marketing/attribution";
import { hasAnalyticsConsent } from "@/lib/marketing/consent";

export type MarketingEventName =
    | "view_item_list"
    | "select_item"
    | "view_item"
    | "add_to_cart"
    | "begin_checkout"
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

    const attribution = readMarketingAttribution() ?? captureMarketingAttribution();
    const payload = JSON.stringify({
        event_name: eventName,
        path: `${window.location.pathname}${window.location.search}`,
        session_id: localStorage.getItem("mt_session_id"),
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
