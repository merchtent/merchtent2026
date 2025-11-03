// app/checkout/CheckoutShellClient.tsx
"use client";

import CheckoutFormClient from "./CheckoutFormClient";
import CheckoutSummaryClient from "./CheckoutSummaryClient";
import { useState } from "react";

type Props = {
    userEmail: string;
};

export default function CheckoutShellClient({ userEmail }: Props) {
    // shared shipping state
    const [shippingMethod, setShippingMethod] = useState<"standard" | "express">(
        "standard"
    );

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
