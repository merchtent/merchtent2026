// components/ShareButton.tsx
"use client";

import { Share2 } from "lucide-react";

export default function ShareButton({
    title,
    className,
}: {
    title: string;
    className?: string;
}) {
    function onShare() {
        try {
            if (navigator.share) {
                navigator
                    .share({ title, url: window.location.href })
                    .catch(() => {/* user cancelled */ });
            } else {
                // Fallback: copy URL
                navigator.clipboard?.writeText(window.location.href);
                // You could toast here if you have a toast system:
                // toast.success("Link copied");
            }
        } catch { }
    }

    return (
        <button onClick={onShare} className={className}>
            Share <Share2 className="h-3.5 w-3.5" />
        </button>
    );
}
