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
                className="border border-white/15 bg-black px-3 py-2 text-xs text-white outline-none transition placeholder:text-white/35 focus:border-[#b6ff3f]"
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
                className="inline-flex items-center justify-center gap-2 border border-[#b6ff3f]/60 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#b6ff3f] transition hover:bg-[#b6ff3f] hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
                <Icon className="h-3.5 w-3.5" />
                {pending ? "Updating..." : copy.label}
            </button>
        </div>
    );
}
