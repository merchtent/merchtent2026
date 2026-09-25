// app/checkout/CheckoutShellClient.tsx
"use client";

import CheckoutFormClient from "./CheckoutFormClient";
import CheckoutSummaryClient from "./CheckoutSummaryClient";
import { normaliseShippingMethodId, type ShippingMethodId } from "@/lib/shipping-methods";
import { useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { isArtistSelfOrder } from "@/lib/artist-self-orders";

type Props = {
    userEmail: string;
    merchCreditBalance: number;
    canUseMerchCredits: boolean;
    defaultAddress?: {
        first_name?: string | null;
        last_name?: string | null;
        line1?: string | null;
        line2?: string | null;
        city?: string | null;
        state?: string | null;
        postal_code?: string | null;
        country?: string | null;
        phone?: string | null;
    } | null;
};

const SHIP_KEY = "checkout_ship_v1";

export default function CheckoutShellClient({
    userEmail,
    merchCreditBalance,
    canUseMerchCredits,
    defaultAddress,
}: Props) {
    const { items } = useCart();
    const isArtistOrder = items.length > 0 && items.every((item) => isArtistSelfOrder(item.purchase_type));
    // shared shipping state
    const [shippingMethod, setShippingMethod] = useState<ShippingMethodId>(
        () => {
            try {
                const raw = localStorage.getItem(SHIP_KEY);
                return normaliseShippingMethodId(raw);
            } catch {
                return "standard";
            }
        }
    );

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [useMerchCredits, setUseMerchCredits] = useState(false);
    const [shippingCountry, setShippingCountry] = useState(defaultAddress?.country || "AU");
    const effectiveUseMerchCredits = isArtistOrder ? false : useMerchCredits;

    // save shipping method whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem(SHIP_KEY, shippingMethod);
        } catch { }
    }, [shippingMethod]);

    return (
        <section className="mx-auto grid max-w-7xl items-start gap-6 px-4 py-8 pb-14 md:px-8 lg:grid-cols-[1.1fr_0.9fr]">
            <CheckoutFormClient
                userEmail={userEmail}
                defaultAddress={defaultAddress}
                shippingMethod={shippingMethod}
                setShippingMethod={setShippingMethod}
                setIsSubmitting={setIsSubmitting}
                isSubmitting={isSubmitting}
                merchCreditBalance={merchCreditBalance}
                canUseMerchCredits={canUseMerchCredits && !isArtistOrder}
                isArtistOrder={isArtistOrder}
                useMerchCredits={effectiveUseMerchCredits}
                setUseMerchCredits={setUseMerchCredits}
                setShippingCountry={setShippingCountry}
            />
            <CheckoutSummaryClient
                shippingMethod={shippingMethod}
                isSubmitting={isSubmitting}
                useMerchCredits={effectiveUseMerchCredits}
                merchCreditBalance={merchCreditBalance}
                shippingCountry={shippingCountry}
                isArtistOrder={isArtistOrder}
            />
        </section>
    );
}
