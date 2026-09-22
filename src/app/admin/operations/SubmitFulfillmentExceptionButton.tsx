"use client";

import { useTransition } from "react";
import { Send } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { submitFulfillmentException } from "./actions";

export default function SubmitFulfillmentExceptionButton({
    jobId,
}: {
    jobId: string;
}) {
    const [pending, startTransition] = useTransition();
    const toast = useToast();

    return (
        <button
            type="button"
            disabled={pending}
            onClick={() => {
                startTransition(async () => {
                    try {
                        const result = await submitFulfillmentException(jobId);
                        toast({
                            title: "Fulfillment submitted",
                            description: result.message,
                            variant: "success",
                        });
                    } catch (error) {
                        toast({
                            title: "Fulfillment submit failed",
                            description:
                                error instanceof Error
                                    ? error.message
                                    : "Could not submit fulfillment to Printify.",
                            variant: "error",
                        });
                    }
                });
            }}
            className="mt-3 inline-flex items-center justify-center gap-2 border border-[#b6ff3f]/60 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#b6ff3f] transition hover:bg-[#b6ff3f] hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
        >
            <Send className="h-3.5 w-3.5" />
            {pending ? "Submitting..." : "Submit Printify"}
        </button>
    );
}
