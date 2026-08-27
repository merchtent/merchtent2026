"use client";

import { useTransition } from "react";
import { RadioTower } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { markStaleStripeWebhooksFailed } from "./actions";

export default function MarkStaleWebhooksFailedButton() {
    const [pending, startTransition] = useTransition();
    const toast = useToast();

    return (
        <button
            type="button"
            disabled={pending}
            onClick={() => {
                startTransition(async () => {
                    try {
                        const result = await markStaleStripeWebhooksFailed();
                        toast({
                            title: "Webhook ledger checked",
                            description: `${result.markedCount} stale processing events marked failed.`,
                            variant: "success",
                        });
                    } catch (error) {
                        toast({
                            title: "Webhook cleanup failed",
                            description:
                                error instanceof Error
                                    ? error.message
                                    : "Could not update stale webhook events.",
                            variant: "error",
                        });
                    }
                });
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm font-semibold text-neutral-100 transition hover:border-red-500 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
            <RadioTower className="h-4 w-4" />
            {pending ? "Checking..." : "Mark stale processing failed"}
        </button>
    );
}
