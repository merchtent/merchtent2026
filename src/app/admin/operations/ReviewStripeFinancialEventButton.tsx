"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, CircleSlash2, SearchCheck } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { reviewStripeFinancialEvent } from "./actions";

type ReviewStatus = "investigating" | "resolved" | "ignored";

const STATUS_COPY: Record<ReviewStatus, { label: string; placeholder: string }> = {
    investigating: {
        label: "Investigating",
        placeholder: "Investigation note",
    },
    resolved: {
        label: "Resolve",
        placeholder: "Resolution note",
    },
    ignored: {
        label: "Ignore",
        placeholder: "Ignore reason",
    },
};

export default function ReviewStripeFinancialEventButton({
    eventId,
    status,
}: {
    eventId: string;
    status: ReviewStatus;
}) {
    const [pending, startTransition] = useTransition();
    const [notes, setNotes] = useState("");
    const toast = useToast();
    const Icon = status === "resolved" ? CheckCircle2 : status === "ignored" ? CircleSlash2 : SearchCheck;
    const copy = STATUS_COPY[status];

    return (
        <div className="mt-3 flex flex-col gap-2">
            <input
                type="text"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={1000}
                placeholder={copy.placeholder}
                className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-neutral-100 outline-none transition placeholder:text-neutral-500 focus:border-red-400"
            />
            <button
                type="button"
                disabled={pending}
                onClick={() => {
                    startTransition(async () => {
                        try {
                            const result = await reviewStripeFinancialEvent(eventId, status, notes);
                            toast({
                                title: "Financial review updated",
                                description: result.message,
                                variant: "success",
                            });
                            setNotes("");
                        } catch (error) {
                            toast({
                                title: "Financial review failed",
                                description:
                                    error instanceof Error
                                        ? error.message
                                        : "Could not update the financial review.",
                                variant: "error",
                            });
                        }
                    });
                }}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-xs font-semibold text-neutral-100 transition hover:border-red-500 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
                <Icon className="h-3.5 w-3.5" />
                {pending ? "Updating..." : copy.label}
            </button>
        </div>
    );
}
