"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { captureMarketingAttribution } from "@/lib/marketing/attribution";
import { hasAnalyticsConsent } from "@/lib/marketing/consent";

function getSessionId() {
    if (typeof window === "undefined") return null;

    try {
        let id = localStorage.getItem("mt_session_id");
        if (!id) {
            if (typeof crypto.randomUUID !== "function") return null;
            id = crypto.randomUUID();
            localStorage.setItem("mt_session_id", id);
        }
        return id;
    } catch {
        if (typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }
        return null;
    }
}

export function usePageView(userId?: string | null) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!hasAnalyticsConsent()) return;
        const session_id = getSessionId();
        captureMarketingAttribution();
        const query = searchParams.toString();
        const path = query ? `${pathname}?${query}` : pathname;

        fetch("/api/track/page-view", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true, // important for unloads
            body: JSON.stringify({
                path,
                referrer: document.referrer || null,
                user_agent: navigator.userAgent,
                user_id: userId ?? null,
                session_id,
            }),
        }).catch(() => {
            // never throw
        });
    }, [pathname, searchParams, userId]);
}
