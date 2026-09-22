export const SHIPPING_METHOD_OPTIONS = [
    { id: "standard", label: "Standard", deliveryLabel: "3-30 business days", checkoutAmountCents: 1700 },
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

const EUROPE = new Set([
    "AT", "BE", "BG", "HR", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HU",
    "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK",
]);

const CONSERVATIVE_STANDARD_RATES = {
    AU: { first: 1700, additional: 500 },
    NZ: { first: 2200, additional: 500 },
    US: { first: 3500, additional: 3300 },
    CA: { first: 3800, additional: 3600 },
    EU: { first: 10100, additional: 2800 },
    ROW: { first: 10000, additional: 9500 },
} as const;

export function shippingZone(country: unknown): keyof typeof CONSERVATIVE_STANDARD_RATES {
    const code = String(country ?? "AU").trim().toUpperCase();
    if (code === "AU" || code === "NZ" || code === "US" || code === "CA") return code;
    return EUROPE.has(code) ? "EU" : "ROW";
}

export function checkoutShippingAmountCents(
    method: unknown,
    country: unknown = "AU",
    lineCount = 1,
    itemCount = 1
) {
    normaliseShippingMethodId(method);
    const rate = CONSERVATIVE_STANDARD_RATES[shippingZone(country)];
    const lines = Math.max(Math.trunc(lineCount), 1);
    const items = Math.max(Math.trunc(itemCount), lines);
    return rate.first * lines + rate.additional * (items - lines);
}
