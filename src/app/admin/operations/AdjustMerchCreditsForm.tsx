"use client";

import { useState, useTransition } from "react";
import { Coins } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { adjustMerchCredits } from "./actions";

export default function AdjustMerchCreditsForm() {
    const [userId, setUserId] = useState("");
    const [points, setPoints] = useState("");
    const [description, setDescription] = useState("");
    const [pending, startTransition] = useTransition();
    const toast = useToast();

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-100">
                <Coins className="h-4 w-4 text-red-300" />
                Manual credit adjustment
            </div>
            <div className="grid gap-2 lg:grid-cols-[minmax(0,1.6fr)_120px_minmax(0,1.4fr)_auto]">
                <input
                    type="text"
                    value={userId}
                    onChange={(event) => setUserId(event.target.value)}
                    placeholder="User id"
                    disabled={pending}
                    className="min-w-0 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none transition placeholder:text-neutral-500 focus:border-red-400 disabled:opacity-60"
                />
                <input
                    type="number"
                    value={points}
                    onChange={(event) => setPoints(event.target.value)}
                    placeholder="+/- points"
                    disabled={pending}
                    min={-10000}
                    max={10000}
                    step={1}
                    className="min-w-0 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none transition placeholder:text-neutral-500 focus:border-red-400 disabled:opacity-60"
                />
                <input
                    type="text"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Adjustment reason"
                    disabled={pending}
                    maxLength={500}
                    className="min-w-0 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none transition placeholder:text-neutral-500 focus:border-red-400 disabled:opacity-60"
                />
                <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                        startTransition(async () => {
                            try {
                                const result = await adjustMerchCredits({
                                    userId,
                                    points: Number(points),
                                    description,
                                });
                                toast({
                                    title: "Credits adjusted",
                                    description: result.message,
                                    variant: "success",
                                });
                                setUserId("");
                                setPoints("");
                                setDescription("");
                            } catch (error) {
                                toast({
                                    title: "Credit adjustment failed",
                                    description:
                                        error instanceof Error
                                            ? error.message
                                            : "Could not adjust merch credits.",
                                    variant: "error",
                                });
                            }
                        });
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-semibold text-neutral-100 transition hover:border-red-500 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <Coins className="h-4 w-4" />
                    {pending ? "Saving..." : "Adjust"}
                </button>
            </div>
        </div>
    );
}
