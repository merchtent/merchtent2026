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
            className="inline-flex items-center justify-center gap-2 border border-[#b6ff3f]/60 bg-black px-3 py-2 text-sm font-black uppercase tracking-[0.12em] text-[#b6ff3f] transition hover:bg-[#b6ff3f] hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
        >
            <RadioTower className="h-4 w-4" />
            {pending ? "Checking..." : "Mark stale processing failed"}
        </button>
    );
}
