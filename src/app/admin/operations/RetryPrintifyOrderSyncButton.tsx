"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { retryPrintifyOrderSync } from "./actions";

export default function RetryPrintifyOrderSyncButton({ orderId }: { orderId: string }) {
    const [pending, startTransition] = useTransition();
    const toast = useToast();

    return (
        <button
            type="button"
            disabled={pending}
            onClick={() => {
                startTransition(async () => {
                    try {
                        const result = await retryPrintifyOrderSync(orderId);
                        toast({
                            title: "Printify sync retry checked",
                            description: result.message,
                            variant: "success",
                        });
                    } catch (error) {
                        toast({
                            title: "Printify sync retry failed",
                            description:
                                error instanceof Error
                                    ? error.message
                                    : "Could not retry Printify order sync.",
                            variant: "error",
                        });
                    }
                });
            }}
            className="mt-3 inline-flex items-center justify-center gap-2 border border-[#b6ff3f]/60 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#b6ff3f] transition hover:bg-[#b6ff3f] hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
        >
            <RotateCcw className="h-3.5 w-3.5" />
            {pending ? "Retrying..." : "Retry Printify sync"}
        </button>
    );
}
