"use client";

import { useState, useTransition } from "react";

export default function OrderStatusUpdater({
    orderId,
    currentStatus,
}: {
    orderId: string;
    currentStatus: string;
}) {
    const [status, setStatus] = useState(currentStatus);
    const [trackingNumber, setTrackingNumber] = useState("");
    const [carrier, setCarrier] = useState("");
    const [isPending, startTransition] = useTransition();

    const save = () => {

        if (
            status === "shipped" &&
            (
                !trackingNumber.trim() ||
                !carrier.trim()
            )
        ) {
            alert(
                "Tracking Number and Carrier are required when marking an order as shipped."
            );

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
                alert("Failed to update order");
                return;
            }

            window.location.reload();
        });
    };
    return (
        <div className="flex flex-wrap items-center gap-3">

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
                        <option value="Aramex">
                            Star Track
                        </option>
                        <option value="Couriers Please">
                            Customer Pickup
                        </option>
                        <option value="Sendle">
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