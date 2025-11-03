// app/checkout/CheckoutFormClient.tsx
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { placeOrderAndGoToStripe } from "./actions";
import { useCart } from "@/components/CartProvider";

const SHIPPING_OPTIONS = [
    { id: "standard", label: "Standard (3-7 days)", amount_cents: 1000 },
    { id: "express", label: "Express (1-3 days)", amount_cents: 2000 },
];

type CheckoutFormClientProps = {
    userEmail: string;
    shippingMethod: "standard" | "express";
    setShippingMethod: (id: "standard" | "express") => void;
};

export default function CheckoutFormClient({
    userEmail,
    shippingMethod,
    setShippingMethod,
}: CheckoutFormClientProps) {
    const { items: cartItems, subtotal_cents } = useCart();
    const [voucher, setVoucher] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const selectedShipping =
        SHIPPING_OPTIONS.find((s) => s.id === shippingMethod) ?? SHIPPING_OPTIONS[0];

    const totalCents = subtotal_cents + selectedShipping.amount_cents;

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        setErrorMsg(null);

        const formData = new FormData(e.currentTarget);
        formData.set("shipping_method", shippingMethod);
        formData.set("voucher", voucher);
        formData.set("cart_json", JSON.stringify(cartItems));

        try {
            const res = await placeOrderAndGoToStripe(formData);
            if (res?.url) {
                window.location.href = res.url;
            } else if (res?.error) {
                setErrorMsg(res.error);
            }
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message ?? "Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-4">
                <p className="text-xs uppercase tracking-wide text-neutral-400">Contact</p>
                <input
                    name="email"
                    type="email"
                    defaultValue={userEmail}
                    required
                    className="w-full h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm"
                />
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-3">
                <p className="text-xs uppercase tracking-wide text-neutral-400">
                    Shipping address
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                    <input
                        name="first_name"
                        placeholder="First name"
                        required
                        className="h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm"
                    />
                    <input
                        name="last_name"
                        placeholder="Last name"
                        required
                        className="h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm"
                    />
                </div>
                <input
                    name="line1"
                    placeholder="Address line 1"
                    required
                    className="h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm w-full"
                />
                <input
                    name="line2"
                    placeholder="Address line 2 (optional)"
                    className="h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm w-full"
                />
                <div className="grid md:grid-cols-3 gap-3">
                    <input
                        name="city"
                        placeholder="City / Suburb"
                        required
                        className="h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm"
                    />
                    <input
                        name="state"
                        placeholder="State"
                        required
                        className="h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm"
                    />
                    <input
                        name="postal_code"
                        placeholder="Postcode"
                        required
                        className="h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm"
                    />
                </div>
                <input
                    name="country"
                    defaultValue="AU"
                    required
                    className="h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm w-full"
                />
                <input
                    name="phone"
                    placeholder="Phone (for delivery)"
                    className="h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm w-full"
                />
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-3">
                <p className="text-xs uppercase tracking-wide text-neutral-400">
                    Shipping method
                </p>
                <div className="space-y-2">
                    {SHIPPING_OPTIONS.map((opt) => (
                        <label key={opt.id} className="flex items-center gap-3 text-sm">
                            <input
                                type="radio"
                                name="shipping"
                                value={opt.id}
                                checked={shippingMethod === opt.id}
                                onChange={() => setShippingMethod(opt.id as "standard" | "express")}
                            />
                            <span>{opt.label}</span>
                            <span className="ml-auto text-xs text-neutral-200">
                                {(opt.amount_cents / 100).toLocaleString("en-AU", {
                                    style: "currency",
                                    currency: "AUD",
                                })}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-3">
                <p className="text-xs uppercase tracking-wide text-neutral-400">
                    Voucher / coupon
                </p>
                <div className="flex gap-3">
                    <input
                        value={voucher}
                        onChange={(e) => setVoucher(e.target.value)}
                        placeholder="Enter code"
                        className="flex-1 h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm"
                    />
                </div>
                <p className="text-[11px] text-neutral-500">
                    We’ll validate it on the server.
                </p>
            </div>

            {errorMsg ? (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">
                    {errorMsg}
                </p>
            ) : null}

            <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-neutral-300">
                    Total today:{" "}
                    <span className="font-bold text-white">
                        {(totalCents / 100).toLocaleString("en-AU", {
                            style: "currency",
                            currency: "AUD",
                        })}
                    </span>
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting || cartItems.length === 0}
                    className="inline-flex items-center gap-2 h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white px-6 text-sm font-semibold disabled:opacity-60"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
                        </>
                    ) : (
                        <>Continue to payment</>
                    )}
                </button>
            </div>
        </form>
    );
}
