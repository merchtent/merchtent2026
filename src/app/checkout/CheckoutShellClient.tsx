// app/checkout/CheckoutShellClient.tsx
"use client";

import CheckoutFormClient from "./CheckoutFormClient";
import CheckoutSummaryClient from "./CheckoutSummaryClient";
import { useEffect, useState } from "react";

type Props = {
    userEmail: string;
    merchCreditBalance: number;
    canUseMerchCredits: boolean;
};

const SHIP_KEY = "checkout_ship_v1";

export default function CheckoutShellClient({
    userEmail,
    merchCreditBalance,
    canUseMerchCredits,
}: Props) {
    // shared shipping state
    const [shippingMethod, setShippingMethod] = useState<"standard" | "express">(
        () => {
            try {
                const raw = localStorage.getItem(SHIP_KEY);
                return raw === "standard" || raw === "express" ? raw : "standard";
            } catch {
                return "standard";
            }
        }
    );

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [useMerchCredits, setUseMerchCredits] = useState(false);

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
                setIsSubmitting={setIsSubmitting}
                isSubmitting={isSubmitting}
                merchCreditBalance={merchCreditBalance}
                canUseMerchCredits={canUseMerchCredits}
                useMerchCredits={useMerchCredits}
                setUseMerchCredits={setUseMerchCredits}
            />
            <CheckoutSummaryClient
                shippingMethod={shippingMethod}
                isSubmitting={isSubmitting}
                useMerchCredits={useMerchCredits}
                merchCreditBalance={merchCreditBalance}
            />
        </section>
    );
}
