"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function StripeConnectReturnSync() {
    const params = useSearchParams();
    const router = useRouter();
    const connectState = params.get("stripe_connect");

    useEffect(() => {
        if (connectState !== "return" && connectState !== "refresh") return;

        let cancelled = false;

        async function syncAccount() {
            await fetch("/api/stripe/connect/refresh", { method: "POST" });
            if (cancelled) return;
            router.replace("/dashboard/cash-out");
            router.refresh();
        }

        syncAccount().catch(() => {
            if (!cancelled) {
                router.replace("/dashboard/cash-out");
                router.refresh();
            }
        });

        return () => {
            cancelled = true;
        };
    }, [connectState, router]);

    return null;
}
