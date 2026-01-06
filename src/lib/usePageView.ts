"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function getSessionId() {
    if (typeof window === "undefined") return null;

    let id = localStorage.getItem("mt_session_id");
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("mt_session_id", id);
    }
    return id;
}

export function usePageView(userId?: string | null) {
    const pathname = usePathname();

    useEffect(() => {
        const session_id = getSessionId();

        fetch("/api/track/page-view", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true, // important for unloads
            body: JSON.stringify({
                path: pathname,
                referrer: document.referrer || null,
                user_agent: navigator.userAgent,
                user_id: userId ?? null,
                session_id,
            }),
        }).catch(() => {
            // never throw
        });
    }, [pathname, userId]);
}
