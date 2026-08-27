"use client";

import { useState, useTransition } from "react";
import { Ban, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { moderateProduct } from "./actions";

export default function ProductModerationActions({
    productId,
    currentStatus,
}: {
    productId: string;
    currentStatus?: string | null;
}) {
    const [notes, setNotes] = useState("");
    const [pending, startTransition] = useTransition();
    const toast = useToast();

    function submit(status: "approved" | "blocked") {
        startTransition(async () => {
            try {
                const result = await moderateProduct(productId, status, notes);
                toast({
                    title: status === "approved" ? "Product approved" : "Product blocked",
                    description: result.message,
                    variant: "success",
                });
                setNotes("");
            } catch (error) {
                toast({
                    title: "Moderation update failed",
                    description:
                        error instanceof Error
                            ? error.message
                            : "Could not update product moderation.",
                    variant: "error",
                });
            }
        });
    }

    return (
        <div className="space-y-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm">
                <div className="text-xs uppercase text-neutral-500">Current moderation</div>
                <div className="mt-1 font-semibold capitalize text-neutral-100">
                    {(currentStatus ?? "unknown").replaceAll("_", " ")}
                </div>
            </div>

            <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional moderation note"
                className="min-h-24 w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-red-500"
                maxLength={1000}
            />

            <div className="grid gap-3 sm:grid-cols-2">
                <button
                    type="button"
                    disabled={pending}
                    onClick={() => submit("approved")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-500/30 bg-green-500/15 px-4 py-3 text-sm font-semibold text-green-200 transition hover:bg-green-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <CheckCircle2 className="h-4 w-4" />
                    {pending ? "Working..." : "Approve"}
                </button>

                <button
                    type="button"
                    disabled={pending}
                    onClick={() => submit("blocked")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <Ban className="h-4 w-4" />
                    {pending ? "Working..." : "Block"}
                </button>
            </div>
        </div>
    );
}
