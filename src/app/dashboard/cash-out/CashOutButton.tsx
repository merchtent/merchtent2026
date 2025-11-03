"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCashOut } from "./server-actions";

export default function CashOutButton({ disabled }: { disabled: boolean }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    async function handleCashOut() {
        startTransition(async () => {
            const result = await createCashOut();
            if (result?.ok) {
                // ✅ Force page data refresh so new totals load
                router.refresh();
            }
        });
    }

    return (
        <button
            onClick={handleCashOut}
            disabled={disabled || isPending}
            className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
        >
            {isPending ? "Processing..." : "Request Cash Out"}
        </button>
    );
}
