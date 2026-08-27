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
                    className="rounded-md border border-sky-500/40 px-2 py-1 text-xs text-sky-200 hover:bg-sky-500/10 disabled:opacity-50"
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
                    className="rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-200 hover:bg-red-500/10 disabled:opacity-50"
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
