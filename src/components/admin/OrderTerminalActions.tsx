"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RotateCcw, XCircle } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

type Action = "cancel" | "refund";

export default function OrderTerminalActions({
    orderId,
    currentStatus,
    hasPayment,
}: {
    orderId: string;
    currentStatus: string;
    hasPayment: boolean;
}) {
    const router = useRouter();
    const toast = useToast();
    const [selectedAction, setSelectedAction] = useState<Action | null>(null);
    const [reason, setReason] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const terminal = currentStatus === "cancelled" || currentStatus === "refunded";
    const canCancel = ["pending", "processing", "paid"].includes(currentStatus);
    const canRefund = hasPayment && !terminal && !canCancel;

    if (terminal || (!canCancel && !canRefund)) return null;

    const submit = () => {
        if (!selectedAction || reason.trim().length < 5) {
            setError("Add a short reason before continuing.");
            return;
        }

        setError(null);
        startTransition(async () => {
            const response = await fetch(`/api/admin/orders/${orderId}/terminal-action`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: selectedAction, reason }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                const message = payload?.error ?? "The order action could not be completed.";
                setError(message);
                toast({ title: "Order unchanged", description: message, variant: "error" });
                return;
            }

            toast({
                title: payload.status === "refunded" ? "Order refunded" : "Order cancelled",
                description: "The order, fulfilment queue and audit history have been updated.",
            });
            setSelectedAction(null);
            setReason("");
            router.refresh();
        });
    };

    return (
        <div className="mt-5 border border-red-500/35 bg-red-950/15 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Terminal actions</p>
            {!selectedAction ? (
                <div className="mt-3 flex flex-wrap gap-2">
                    {canCancel ? (
                        <button type="button" onClick={() => setSelectedAction("cancel")} className="inline-flex items-center gap-2 border border-red-500/60 px-4 py-2 text-sm font-black text-red-200 hover:bg-red-500 hover:text-white">
                            <XCircle className="h-4 w-4" />
                            {hasPayment ? "Cancel and refund" : "Cancel order"}
                        </button>
                    ) : null}
                    {canRefund ? (
                        <button type="button" onClick={() => setSelectedAction("refund")} className="inline-flex items-center gap-2 border border-red-500/60 px-4 py-2 text-sm font-black text-red-200 hover:bg-red-500 hover:text-white">
                            <RotateCcw className="h-4 w-4" /> Refund order
                        </button>
                    ) : null}
                </div>
            ) : (
                <div className="mt-3 space-y-3">
                    <p className="text-sm text-neutral-300">
                        {selectedAction === "refund" || hasPayment
                            ? "This issues a full Stripe refund and cancels any open fulfilment work."
                            : "This cancels the unpaid order and any open fulfilment work."}
                    </p>
                    <label className="block text-xs font-black uppercase text-neutral-400">
                        Operator reason
                        <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={500} className="mt-2 w-full border border-neutral-700 bg-black p-3 text-sm font-normal normal-case text-white" />
                    </label>
                    {error ? <p className="text-sm text-red-300">{error}</p> : null}
                    <div className="flex gap-2">
                        <button type="button" disabled={pending} onClick={submit} className="bg-red-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
                            {pending ? "Processing..." : "Confirm action"}
                        </button>
                        <button type="button" disabled={pending} onClick={() => { setSelectedAction(null); setReason(""); setError(null); }} className="border border-neutral-700 px-4 py-2 text-sm font-bold text-neutral-200">
                            Keep order
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
