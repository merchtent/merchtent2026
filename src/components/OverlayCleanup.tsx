// src/components/OverlayCleanup.tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function OverlayCleanup() {
    const pathname = usePathname();

    useEffect(() => {
        // run after the route renders
        const t = setTimeout(() => {
            // 1) Any streaming placeholders
            document.querySelectorAll<HTMLElement>('[hidden]').forEach(el => {
                el.style.pointerEvents = "none";
                el.style.display = "none";
            });

            // 2) Any full-screen fixed overlays that are *not visible* (opacity 0 / off-screen / pointer-events none)
            const candidates = document.querySelectorAll<HTMLElement>('div[class*="fixed"][class*="inset-0"], aside[class*="fixed"][class*="inset-0"]');
            candidates.forEach(el => {
                const s = getComputedStyle(el);
                const invisible =
                    s.opacity === "0" ||
                    s.visibility === "hidden" ||
                    s.pointerEvents === "none" ||
                    s.transform.includes("translateX(") ||
                    s.transform.includes("translateY(");
                if (invisible) {
                    el.style.pointerEvents = "none";
                }
            });
        }, 0);
        return () => clearTimeout(t);
    }, [pathname]);

    return null;
}
