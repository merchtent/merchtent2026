"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { captureMarketingAttribution } from "@/lib/marketing/attribution";
import { hasAnalyticsConsent } from "@/lib/marketing/consent";
import { getAnalyticsSessionId } from "@/lib/marketing/session";
import { trackGooglePageView } from "@/lib/marketing/google";

export function usePageView(userId?: string | null) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        let recorded = false;

        const recordPageView = () => {
            if (recorded || !hasAnalyticsConsent()) return;
            recorded = true;
            const session_id = getAnalyticsSessionId();
            captureMarketingAttribution();
            const query = searchParams.toString();
            const path = query ? `${pathname}?${query}` : pathname;
            trackGooglePageView(path);

            fetch("/api/track/page-view", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                keepalive: true,
                body: JSON.stringify({
                    path,
                    referrer: document.referrer || null,
                    user_agent: navigator.userAgent,
                    user_id: userId ?? null,
                    session_id,
                }),
            }).catch(() => {
                // Analytics must never interrupt navigation.
            });
        };

        recordPageView();
        window.addEventListener("merch-tent:consent", recordPageView);
        return () => window.removeEventListener("merch-tent:consent", recordPageView);
    }, [pathname, searchParams, userId]);
}
