export const SHIPPING_METHOD_OPTIONS = [
    { id: "standard", label: "Standard", deliveryLabel: "3-7 days", checkoutAmountCents: 1050 },
    { id: "express", label: "Express", deliveryLabel: "1-3 days", checkoutAmountCents: 1700 },
] as const;

export type ShippingMethodId = (typeof SHIPPING_METHOD_OPTIONS)[number]["id"];

export const SHIPPING_METHOD_IDS = new Set<string>(
    SHIPPING_METHOD_OPTIONS.map((option) => option.id)
);

export function isShippingMethodId(value: string): value is ShippingMethodId {
    return SHIPPING_METHOD_IDS.has(value);
}

export function normaliseShippingMethodId(value: unknown): ShippingMethodId {
    const method = String(value ?? "standard").trim().toLowerCase();
    return isShippingMethodId(method) ? method : "standard";
}

export function requireShippingMethodId(value: unknown): ShippingMethodId {
    const method = String(value ?? "standard").trim().toLowerCase();
    if (!isShippingMethodId(method)) {
        throw new Error("Shipping method is invalid.");
    }
    return method;
}

export function checkoutShippingAmountCents(method: unknown) {
    const shippingMethod = normaliseShippingMethodId(method);
    return SHIPPING_METHOD_OPTIONS.find((option) => option.id === shippingMethod)?.checkoutAmountCents ?? 0;
}
