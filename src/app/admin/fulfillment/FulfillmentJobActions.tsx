"use client";

import { useTransition } from "react";
import {
    submitFulfillmentJobToPrintify,
    updateFulfillmentJobStatus,
} from "./actions";

export default function FulfillmentJobActions({
    jobId,
    status,
}: {
    jobId: string;
    status: string;
}) {
    const [isPending, startTransition] = useTransition();

    const actions =
        status === "pending"
            ? [{ label: "Start", status: "in_progress" }]
            : status === "in_progress"
                ? [{ label: "Complete", status: "completed" }]
                : [];

    return (
        <div className="flex flex-wrap gap-2">
            {status !== "completed" && status !== "cancelled" ? (
                <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                        startTransition(async () => {
                            await submitFulfillmentJobToPrintify(jobId);
                        });
                    }}
                    className="border border-[#b6ff3f]/60 px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#b6ff3f] hover:bg-[#b6ff3f] hover:text-black disabled:opacity-50"
                >
                    {isPending ? "Working..." : status === "failed" ? "Retry Printify" : "Submit Printify"}
                </button>
            ) : null}
            {actions.map((action) => (
                <button
                    key={action.status}
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                        startTransition(async () => {
                            await updateFulfillmentJobStatus(jobId, action.status);
                        });
                    }}
                    className="border border-red-500/40 px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-red-200 hover:bg-red-600 hover:text-white disabled:opacity-50"
                >
                    {isPending ? "Saving..." : action.label}
                </button>
            ))}
            {!actions.length && (status === "completed" || status === "cancelled") ? (
                <span className="text-xs text-neutral-500">-</span>
            ) : null}
        </div>
    );
}
