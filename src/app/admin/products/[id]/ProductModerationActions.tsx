"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
    const [status, setStatus] = useState(currentStatus);
    const [pending, startTransition] = useTransition();
    const toast = useToast();
    const router = useRouter();

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
                setStatus(result.status);
                router.refresh();
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
            <div className="border border-white/10 bg-black p-3 text-sm">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-[#b6ff3f]">Current moderation</div>
                <div className="mt-1 font-black capitalize text-white">
                    {(status ?? "unknown").replaceAll("_", " ")}
                </div>
            </div>

            <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional moderation note"
                className="min-h-24 w-full border border-white/15 bg-black p-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#b6ff3f]"
                maxLength={1000}
            />

            <div className="grid gap-3 sm:grid-cols-2">
                <button
                    type="button"
                    disabled={pending || status === "approved"}
                    onClick={() => submit("approved")}
                    className={`inline-flex items-center justify-center gap-2 border border-[#b6ff3f] px-4 py-3 text-sm font-black uppercase transition disabled:cursor-not-allowed ${status === "approved" ? "bg-lime-300/15 text-lime-300" : "bg-[#b6ff3f] text-black hover:bg-white disabled:opacity-60"}`}
                >
                    <CheckCircle2 className="h-4 w-4" />
                    {pending ? "Working..." : status === "approved" ? "Approved" : "Approve"}
                </button>

                <button
                    type="button"
                    disabled={pending || status === "blocked"}
                    onClick={() => submit("blocked")}
                    className={`inline-flex items-center justify-center gap-2 border border-red-500/40 px-4 py-3 text-sm font-black uppercase text-red-300 transition disabled:cursor-not-allowed ${status === "blocked" ? "bg-red-500/15" : "bg-black hover:bg-red-600 hover:text-white disabled:opacity-60"}`}
                >
                    <Ban className="h-4 w-4" />
                    {pending ? "Working..." : status === "blocked" ? "Blocked" : "Block"}
                </button>
            </div>
        </div>
    );
}
