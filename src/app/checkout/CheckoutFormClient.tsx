// app/checkout/CheckoutFormClient.tsx
"use client";

import * as React from "react";
import { placeOrderAndGoToStripe } from "./actions";
import { useCart } from "@/components/CartProvider";

const SHIPPING_OPTIONS = [
    { id: "standard", label: "Standard (3-7 days)", amount_cents: 1050 },
    { id: "express", label: "Express (1-3 days)", amount_cents: 1700 },
] as const;

const DRAFT_KEY = "checkout_draft_v1";

type Draft = {
    email: string;
    first_name: string;
    last_name: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone: string;
    voucher: string;
};

const DRAFT_LIMITS = {
    email: 320,
    first_name: 80,
    last_name: 80,
    line1: 160,
    line2: 160,
    city: 100,
    state: 100,
    postal_code: 20,
    country: 2,
    phone: 40,
    voucher: 100,
} satisfies Record<keyof Draft, number>;

function cleanDraftString(value: unknown, maxLength: number): string {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normaliseDraft(value: unknown): Draft | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;

    const raw = value as Partial<Record<keyof Draft, unknown>>;
    return {
        email: cleanDraftString(raw.email, DRAFT_LIMITS.email),
        first_name: cleanDraftString(raw.first_name, DRAFT_LIMITS.first_name),
        last_name: cleanDraftString(raw.last_name, DRAFT_LIMITS.last_name),
        line1: cleanDraftString(raw.line1, DRAFT_LIMITS.line1),
        line2: cleanDraftString(raw.line2, DRAFT_LIMITS.line2),
        city: cleanDraftString(raw.city, DRAFT_LIMITS.city),
        state: cleanDraftString(raw.state, DRAFT_LIMITS.state),
        postal_code: cleanDraftString(raw.postal_code, DRAFT_LIMITS.postal_code),
        country: cleanDraftString(raw.country, DRAFT_LIMITS.country).toUpperCase(),
        phone: cleanDraftString(raw.phone, DRAFT_LIMITS.phone),
        voucher: cleanDraftString(raw.voucher, DRAFT_LIMITS.voucher),
    };
}

function loadDraft(): Draft | null {
    try {
        const raw = localStorage.getItem(DRAFT_KEY);
        return raw ? normaliseDraft(JSON.parse(raw)) : null;
    } catch {
        return null;
    }
}
function saveDraft(d: Draft) {
    try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(normaliseDraft(d)));
    } catch { }
}

type CheckoutFormClientProps = {
    userEmail: string;
    shippingMethod: "standard" | "express";
    setShippingMethod: (id: "standard" | "express") => void;

    setIsSubmitting: (v: boolean) => void;
    isSubmitting: boolean;
    merchCreditBalance: number;
    canUseMerchCredits: boolean;
    useMerchCredits: boolean;
    setUseMerchCredits: (value: boolean) => void;
};

export default function CheckoutFormClient({
    userEmail,
    shippingMethod,
    setShippingMethod,
    setIsSubmitting,
    isSubmitting,
    merchCreditBalance,
    canUseMerchCredits,
    useMerchCredits,
    setUseMerchCredits,
}: CheckoutFormClientProps) {
    const { items: cartItems, subtotal_cents } = useCart();
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

    // form state (controlled inputs)
    const [form, setForm] = React.useState<Draft>(() => {
        const emptyDraft: Draft = {
            email: userEmail || "",
            first_name: "",
            last_name: "",
            line1: "",
            line2: "",
            city: "",
            state: "",
            postal_code: "",
            country: "AU",
            phone: "",
            voucher: "",
        };
        const savedDraft = loadDraft();
        return savedDraft
            ? {
                ...emptyDraft,
                ...savedDraft,
                email: savedDraft.email || userEmail || "",
                country: savedDraft.country || emptyDraft.country,
            }
            : emptyDraft;
    });

    // debounce save
    const saveRef = React.useRef<number | null>(null);
    React.useEffect(() => {
        if (saveRef.current) window.clearTimeout(saveRef.current);
        saveRef.current = window.setTimeout(() => saveDraft(form), 250);
        return () => {
            if (saveRef.current) window.clearTimeout(saveRef.current);
        };
    }, [form]);

    const selectedShipping =
        SHIPPING_OPTIONS.find((s) => s.id === shippingMethod) ?? SHIPPING_OPTIONS[0];
    const totalCents = subtotal_cents + selectedShipping.amount_cents;

    function update<K extends keyof Draft>(key: K, val: Draft[K]) {
        setForm((f) => ({ ...f, [key]: val }));
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        setErrorMsg(null);

        // build FormData from controlled state (reliable)
        const fd = new FormData();
        fd.set("email", form.email);
        fd.set("first_name", form.first_name);
        fd.set("last_name", form.last_name);
        fd.set("line1", form.line1);
        fd.set("line2", form.line2);
        fd.set("city", form.city);
        fd.set("state", form.state);
        fd.set("postal_code", form.postal_code);
        fd.set("country", form.country);
        fd.set("phone", form.phone);
        fd.set("shipping_method", shippingMethod);
        fd.set("voucher", form.voucher);
        fd.set("use_merch_credits", useMerchCredits ? "true" : "false");
        fd.set("cart_json", JSON.stringify(cartItems));
        fd.set("checkout_attempt_id", crypto.randomUUID());

        try {
            const res = await placeOrderAndGoToStripe(fd);
            if (res?.url) {
                window.location.href = res.url;
            } else if (res?.error) {
                setErrorMsg(res.error);
            }
        } catch {
            setErrorMsg("Could not start checkout. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form id="checkout-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-4">
                <p className="text-xs uppercase tracking-wide text-neutral-400">
                    Email Address
                </p>
                <input
                    name="email"
                    placeholder="Email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    required
                    className="w-full h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm"
                />
                <p className="text-[11px] text-neutral-500">
                    No account needed — we’ll send your order confirmation via email
                </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-3">
                <p className="text-xs uppercase tracking-wide text-neutral-400">
                    Shipping address
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                    <input
                        name="first_name"
                        placeholder="First name"
                        value={form.first_name}
                        onChange={(e) => update("first_name", e.target.value)}
                        required
                        className="h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm"
                    />
                    <input
                        name="last_name"
                        placeholder="Last name"
                        value={form.last_name}
                        onChange={(e) => update("last_name", e.target.value)}
                        required
                        className="h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm"
                    />
                </div>
                <input
                    name="line1"
                    placeholder="Address line 1"
                    value={form.line1}
                    onChange={(e) => update("line1", e.target.value)}
                    required
                    className="h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm w-full"
                />
                <input
                    name="line2"
                    placeholder="Address line 2 (optional)"
                    value={form.line2}
                    onChange={(e) => update("line2", e.target.value)}
                    className="h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm w-full"
                />
                <div className="grid md:grid-cols-3 gap-3">
                    <input
                        name="city"
                        placeholder="City / Suburb"
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                        required
                        className="h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm"
                    />
                    <input
                        name="state"
                        placeholder="State"
                        value={form.state}
                        onChange={(e) => update("state", e.target.value)}
                        required
                        className="h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm"
                    />
                    <input
                        name="postal_code"
                        placeholder="Postcode"
                        value={form.postal_code}
                        onChange={(e) => update("postal_code", e.target.value)}
                        required
                        className="h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm"
                    />
                </div>
                <input
                    name="country"
                    value={form.country}
                    onChange={(e) => update("country", e.target.value.toUpperCase().slice(0, 2))}
                    required
                    maxLength={2}
                    pattern="[A-Za-z]{2}"
                    aria-label="Country code"
                    className="h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm w-full"
                />
                <input
                    name="phone"
                    placeholder="Phone (for delivery)"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    required
                    className="h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm w-full"
                />
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-3">
                <p className="text-xs uppercase tracking-wide text-neutral-400">
                    Shipping method
                </p>
                <div className="space-y-2">
                    {SHIPPING_OPTIONS.map((opt) => (
                        <label key={opt.id} className="flex items-center gap-3 text-sm border rounded-lg px-3 py-2 hover:border-red-500 transition">
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
                    <p className="text-[11px] text-neutral-500">
                        Printed when ordered. Shipping begins after production.
                    </p>
                </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-3">
                <p className="text-xs uppercase tracking-wide text-neutral-400">
                    Merch credits
                </p>
                <label className="flex items-start gap-3 text-sm">
                    <input
                        type="checkbox"
                        checked={useMerchCredits}
                        disabled={!canUseMerchCredits || merchCreditBalance < 20}
                        onChange={(event) => setUseMerchCredits(event.target.checked)}
                        className="mt-1"
                    />
                    <span>
                        <span className="block text-neutral-100">
                            Use 20 credits for a free tee discount
                        </span>
                        <span className="block text-xs text-neutral-500">
                            {canUseMerchCredits
                                ? `${merchCreditBalance} credits available. Credits are reserved for this checkout and only redeemed after payment succeeds.`
                                : "Sign in to redeem merch credits."}
                        </span>
                    </span>
                </label>
            </div>

            {/* <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-3">
                <p className="text-xs uppercase tracking-wide text-neutral-400">
                    Voucher / coupon
                </p>
                <div className="flex gap-3">
                    <input
                        value={form.voucher}
                        onChange={(e) => update("voucher", e.target.value)}
                        placeholder="Enter code"
                        className="flex-1 h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm"
                    />
                </div>
                <p className="text-[11px] text-neutral-500">
                    We’ll validate it on the server.
                </p>
            </div> */}

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
                {/* <button
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
                </button> */}
            </div>
        </form>
    );
}
