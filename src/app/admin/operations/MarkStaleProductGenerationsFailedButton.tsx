"use client";

import { useTransition } from "react";
import { PackageSearch } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { markStaleProductGenerationsFailed } from "./actions";

export default function MarkStaleProductGenerationsFailedButton() {
    const [pending, startTransition] = useTransition();
    const toast = useToast();

    return (
        <button
            type="button"
            disabled={pending}
            onClick={() => {
                startTransition(async () => {
                    try {
                        const result = await markStaleProductGenerationsFailed();
                        toast({
                            title: "Product generation checked",
                            description: `${result.markedCount} stale generations marked failed.`,
                            variant: "success",
                        });
                    } catch (error) {
                        toast({
                            title: "Product generation cleanup failed",
                            description:
                                error instanceof Error
                                    ? error.message
                                    : "Could not update stale product generations.",
                            variant: "error",
                        });
                    }
                });
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm font-semibold text-neutral-100 transition hover:border-red-500 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
            <PackageSearch className="h-4 w-4" />
            {pending ? "Checking..." : "Mark stale generations failed"}
        </button>
    );
}
