"use client";

import { usePageView } from "@/lib/usePageView";

export default function PageViewTracker({
    userId,
}: {
    userId?: string | null;
}) {
    usePageView(userId);
    return null;
}
