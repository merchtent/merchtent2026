// app/checkout/CheckoutShellClient.tsx
"use client";

import CheckoutFormClient from "./CheckoutFormClient";
import CheckoutSummaryClient from "./CheckoutSummaryClient";
import { useEffect, useState } from "react";

type Props = {
    userEmail: string;
};

const SHIP_KEY = "checkout_ship_v1";

export default function CheckoutShellClient({ userEmail }: Props) {
    // shared shipping state
    const [shippingMethod, setShippingMethod] = useState<"standard" | "express">(
        "standard"
    );

    // hydrate shipping method from localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem(SHIP_KEY);
            if (raw === "standard" || raw === "express") {
                setShippingMethod(raw);
            }
        } catch { }
    }, []);

    // save shipping method whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem(SHIP_KEY, shippingMethod);
        } catch { }
    }, [shippingMethod]);

    return (
        <section className="max-w-5xl mx-auto px-4 pb-10 grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
            <CheckoutFormClient
                userEmail={userEmail}
                shippingMethod={shippingMethod}
                setShippingMethod={setShippingMethod}
            />
            <CheckoutSummaryClient shippingMethod={shippingMethod} />
        </section>
    );
}
