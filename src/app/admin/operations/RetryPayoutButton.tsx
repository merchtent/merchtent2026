"use client";

import { useTransition } from "react";
import { WalletCards } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { retryPayoutTransfer } from "./actions";

export default function RetryPayoutButton({ cashOutId }: { cashOutId: string }) {
    const [pending, startTransition] = useTransition();
    const toast = useToast();

    return (
        <button
            type="button"
            disabled={pending}
            onClick={() => {
                startTransition(async () => {
                    try {
                        const result = await retryPayoutTransfer(cashOutId);
                        toast({
                            title: "Payout retry checked",
                            description: result.message,
                            variant: "success",
                        });
                    } catch (error) {
                        toast({
                            title: "Payout retry failed",
                            description:
                                error instanceof Error
                                    ? error.message
                                    : "Could not retry the payout transfer.",
                            variant: "error",
                        });
                    }
                });
            }}
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-xs font-semibold text-neutral-100 transition hover:border-red-500 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
            <WalletCards className="h-3.5 w-3.5" />
            {pending ? "Retrying..." : "Retry payout"}
        </button>
    );
}
