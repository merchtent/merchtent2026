"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/ToastProvider";

export default function OrderStatusUpdater({
    orderId,
    currentStatus,
    currentTrackingNumber = "",
    currentCarrier = "",
}: {
    orderId: string;
    currentStatus: string;
    currentTrackingNumber?: string | null;
    currentCarrier?: string | null;
}) {
    const [status, setStatus] = useState(currentStatus);
    const [trackingNumber, setTrackingNumber] = useState(currentTrackingNumber ?? "");
    const [carrier, setCarrier] = useState(currentCarrier ?? "");
    const [isPending, startTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const router = useRouter();
    const toast = useToast();

    const save = () => {
        setErrorMessage(null);

        if (
            status === "shipped" &&
            (
                !trackingNumber.trim() ||
                !carrier.trim()
            )
        ) {
            const message = "Tracking number and carrier are required when marking an order as shipped.";
            setErrorMessage(message);
            toast({ title: "Order not updated", description: message, variant: "error" });

            return;
        }

        startTransition(async () => {

            const response = await fetch(
                `/api/admin/orders/${orderId}/status`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        status,
                        trackingNumber,
                        carrier,
                    }),
                }
            );

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                const message = payload?.error ?? payload?.message ?? "Failed to update order.";
                setErrorMessage(message);
                toast({ title: "Order not updated", description: message, variant: "error" });
                return;
            }

            toast({ title: "Order updated", description: "Order status has been saved." });
            router.refresh();
        });
    };
    return (
        <div className="flex flex-wrap items-center gap-3">
            {errorMessage ? (
                <p className="basis-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {errorMessage}
                </p>
            ) : null}

            <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="
                    bg-neutral-800
                    border
                    border-neutral-700
                    rounded-lg
                    px-4
                    py-2
                "
            >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="in_production">In Production</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
            </select>

            {status === "shipped" && (
                <div className="mt-4 grid md:grid-cols-2 gap-3 w-full">

                    <input
                        type="text"
                        placeholder="Tracking Number"
                        value={trackingNumber}
                        onChange={(e) =>
                            setTrackingNumber(e.target.value)
                        }
                        className="
                bg-neutral-800
                border
                border-neutral-700
                rounded-lg
                px-4
                py-2
            "
                    />

                    <select
                        value={carrier}
                        onChange={(e) => setCarrier(e.target.value)}
                    >
                        <option value="">Select Carrier</option>
                        <option value="Australia Post">
                            Australia Post
                        </option>
                        <option value="Star Track">
                            Star Track
                        </option>
                        <option value="Customer Pickup">
                            Customer Pickup
                        </option>
                        <option value="Other">
                            Other
                        </option>
                    </select>

                </div>
            )}

            <button
                onClick={save}
                disabled={isPending}
                className="
                    px-4
                    py-2
                    rounded-lg
                    bg-red-600
                    hover:bg-red-500
                    transition
                    font-semibold
                    disabled:opacity-50
                "
            >
                {isPending
                    ? "Saving..."
                    : "Update Status"}
            </button>

        </div>
    );
}
