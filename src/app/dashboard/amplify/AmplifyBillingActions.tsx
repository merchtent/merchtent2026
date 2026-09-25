"use client";

import { useState } from "react";
import { CreditCard, Loader2, Zap } from "lucide-react";

async function openStripe(path: string) {
    const response = await fetch(path, { method: "POST" });
    const payload = await response.json() as { url?: string; error?: string };
    if (!response.ok || !payload.url) throw new Error(payload.error ?? "Could not open billing.");
    window.location.assign(payload.url);
}

export default function AmplifyBillingActions({ hasBilling }: { hasBilling: boolean }) {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function run(path: string) {
        setPending(true);
        setError(null);
        try {
            await openStripe(path);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not open billing.");
            setPending(false);
        }
    }

    return (
        <div>
            <button
                type="button"
                disabled={pending}
                onClick={() => run(hasBilling ? "/api/stripe/amplify/portal" : "/api/stripe/amplify/checkout")}
                className="inline-flex items-center gap-2 bg-lime-300 px-5 py-3 text-sm font-black text-black disabled:cursor-wait disabled:opacity-60"
            >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : hasBilling ? <CreditCard className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                {hasBilling ? "Manage billing" : "Join Amplify"}
            </button>
            {error ? <p className="mt-3 text-sm text-red-400" role="alert">{error}</p> : null}
        </div>
    );
}
