"use client";

import { useState } from "react";

type StripeConnectResponse = {
    url?: string;
    error?: string;
};

async function readStripeConnectResponse(response: Response): Promise<StripeConnectResponse> {
    try {
        return (await response.json()) as StripeConnectResponse;
    } catch {
        return {};
    }
}

export default function StripeConnectButton({
    connected,
}: {
    connected: boolean;
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleConnect() {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/stripe/connect/account-link", {
                method: "POST",
            });
            const payload = await readStripeConnectResponse(response);

            if (!response.ok || !payload.url) {
                throw new Error(payload.error || "Could not start Stripe onboarding.");
            }

            window.location.href = payload.url;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not start Stripe onboarding.");
            setIsLoading(false);
        }
    }

    return (
        <div className="space-y-2">
            <button
                type="button"
                onClick={handleConnect}
                disabled={isLoading}
                className="w-full rounded-lg bg-white px-4 py-2 text-sm font-black text-neutral-950 disabled:opacity-50"
            >
                {isLoading ? "Opening Stripe..." : connected ? "Update Stripe payout account" : "Connect Stripe payouts"}
            </button>
            {error ? <p className="text-xs text-red-300">{error}</p> : null}
        </div>
    );
}
