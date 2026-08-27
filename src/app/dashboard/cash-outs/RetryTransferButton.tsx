"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { retryCashOutTransfer } from "./server-actions";

export default function RetryTransferButton({ cashOutId }: { cashOutId: string }) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    function handleRetry() {
        startTransition(async () => {
            setError(null);
            try {
                const result = await retryCashOutTransfer(cashOutId);
                if (result?.ok) router.refresh();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Retry failed.");
            }
        });
    }

    return (
        <div className="space-y-1">
            <button
                type="button"
                onClick={handleRetry}
                disabled={isPending}
                className="rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-200 hover:bg-red-500/10 disabled:opacity-50"
            >
                {isPending ? "Retrying..." : "Retry transfer"}
            </button>
            {error ? <p className="max-w-48 text-xs text-red-300">{error}</p> : null}
        </div>
    );
}
