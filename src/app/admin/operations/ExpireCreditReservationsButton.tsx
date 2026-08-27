"use client";

import { useTransition } from "react";
import { Coins } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { expireStaleMerchCreditReservations } from "./actions";

export default function ExpireCreditReservationsButton() {
    const [pending, startTransition] = useTransition();
    const toast = useToast();

    return (
        <button
            type="button"
            disabled={pending}
            onClick={() => {
                startTransition(async () => {
                    try {
                        const result = await expireStaleMerchCreditReservations();
                        toast({
                            title: "Credit reservations checked",
                            description: `${result.expiredCount} stale reservations expired.`,
                            variant: "success",
                        });
                    } catch (error) {
                        toast({
                            title: "Credit cleanup failed",
                            description:
                                error instanceof Error
                                    ? error.message
                                    : "Could not expire stale reservations.",
                            variant: "error",
                        });
                    }
                });
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm font-semibold text-neutral-100 transition hover:border-red-500 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
            <Coins className="h-4 w-4" />
            {pending ? "Expiring..." : "Expire stale reservations"}
        </button>
    );
}
