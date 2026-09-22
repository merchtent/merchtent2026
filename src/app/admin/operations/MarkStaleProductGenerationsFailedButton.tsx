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
            className="inline-flex items-center justify-center gap-2 border border-[#b6ff3f]/60 bg-black px-3 py-2 text-sm font-black uppercase tracking-[0.12em] text-[#b6ff3f] transition hover:bg-[#b6ff3f] hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
        >
            <PackageSearch className="h-4 w-4" />
            {pending ? "Checking..." : "Mark stale generations failed"}
        </button>
    );
}
