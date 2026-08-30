"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { syncProductToPrintifyAction } from "./printify-actions";

export default function PrintifySyncButton({ productId }: { productId: string }) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    function handleClick() {
        startTransition(async () => {
            setError(null);
            try {
                await syncProductToPrintifyAction(productId);
                router.refresh();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Printify sync failed.");
            }
        });
    }

    return (
        <div className="space-y-1">
            <button
                type="button"
                onClick={handleClick}
                disabled={isPending}
                className="inline-flex items-center gap-1 border border-lime-300/50 px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-lime-200 hover:bg-lime-300/10 disabled:opacity-50"
            >
                <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
                {isPending ? "Syncing" : "Sync Printify"}
            </button>
            {error ? <p className="max-w-52 text-xs text-red-300">{error}</p> : null}
        </div>
    );
}
