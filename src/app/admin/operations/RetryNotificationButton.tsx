"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { retryOrderNotification } from "./actions";

export default function RetryNotificationButton({ deliveryId }: { deliveryId: string }) {
    const [pending, startTransition] = useTransition();
    const toast = useToast();

    return (
        <button
            type="button"
            disabled={pending}
            onClick={() => {
                startTransition(async () => {
                    try {
                        const result = await retryOrderNotification(deliveryId);
                        const label = result.channel === "sms" ? "SMS" : "Email";
                        toast({
                            title: result.skipped ? `${label} already sent` : `${label} retry sent`,
                            description: result.skipped
                                ? "The notification ledger shows this delivery is already complete."
                                : `The order confirmation ${label.toLowerCase()} was sent from persisted order data.`,
                            variant: "success",
                        });
                    } catch (error) {
                        toast({
                            title: "Notification retry failed",
                            description:
                                error instanceof Error
                                    ? error.message
                                    : "Could not retry the order notification.",
                            variant: "error",
                        });
                    }
                });
            }}
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-xs font-semibold text-neutral-100 transition hover:border-red-500 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
            <RotateCcw className="h-3.5 w-3.5" />
            {pending ? "Retrying..." : "Retry notification"}
        </button>
    );
}
