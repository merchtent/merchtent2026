"use client";

import { useTransition } from "react";
import { PackageSearch } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { repairProductGeneration } from "./actions";

export default function RepairProductGenerationButton({ productId }: { productId: string }) {
    const [pending, startTransition] = useTransition();
    const toast = useToast();

    return (
        <button
            type="button"
            disabled={pending}
            onClick={() => {
                startTransition(async () => {
                    try {
                        const result = await repairProductGeneration(productId);
                        toast({
                            title: "Product generation repaired",
                            description: result.repaired.length
                                ? `Repaired: ${result.repaired.join(", ")}.`
                                : "No missing generated assets were detected.",
                            variant: "success",
                        });
                    } catch (error) {
                        toast({
                            title: "Repair failed",
                            description:
                                error instanceof Error
                                    ? error.message
                                    : "Could not repair product generation assets.",
                            variant: "error",
                        });
                    }
                });
            }}
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-xs font-semibold text-neutral-100 transition hover:border-red-500 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
            <PackageSearch className="h-3.5 w-3.5" />
            {pending ? "Repairing..." : "Repair generation"}
        </button>
    );
}
