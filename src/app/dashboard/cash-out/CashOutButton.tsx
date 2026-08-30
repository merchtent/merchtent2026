"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCashOut } from "./server-actions";

export default function CashOutButton({ disabled }: { disabled: boolean }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    async function handleCashOut() {
        startTransition(async () => {
            setError(null);
            try {
                const result = await createCashOut();
                if (result?.ok) {
                    router.refresh();
                } else if (result?.message) {
                    setError(result.message);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Cash out failed.");
            }
        });
    }

    return (
        <div className="space-y-2">
            <button
                onClick={handleCashOut}
                disabled={disabled || isPending}
                className="w-full border border-lime-300 bg-lime-300 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-black hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isPending ? "Processing..." : "Request Cash Out"}
            </button>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </div>
    );
}
