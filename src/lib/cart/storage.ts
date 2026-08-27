// lib/cart/storage.ts
import type { CartItem, CartState } from "./types";

const KEY = "cart:v1";
const MAX_CART_ITEMS = 99;
const MAX_CART_QTY = 99;
const MAX_PRICE_CENTS = 1_000_000_00;

export { KEY as CART_STORAGE_KEY };

function cleanString(value: unknown, maxLength: number): string | null {
    if (typeof value !== "string") return null;
    const cleaned = value.trim().slice(0, maxLength);
    return cleaned.length > 0 ? cleaned : null;
}

function cleanOptionalString(value: unknown, maxLength: number): string | null {
    if (value === null || value === undefined || value === "") return null;
    return cleanString(value, maxLength);
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
    const numberValue =
        typeof value === "number"
            ? value
            : typeof value === "string"
                ? Number(value)
                : Number.NaN;

    if (!Number.isFinite(numberValue)) return null;
    const integerValue = Math.trunc(numberValue);
    if (integerValue < min) return null;
    return Math.min(integerValue, max);
}

function normaliseCartItem(value: unknown): CartItem | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;

    const raw = value as Record<string, unknown>;
    const productId = cleanString(raw.product_id, 100);
    const title = cleanString(raw.title, 200);
    const priceCents = cleanInteger(raw.price_cents, 0, MAX_PRICE_CENTS);
    const currency = cleanString(raw.currency, 12);
    const qty = cleanInteger(raw.qty, 1, MAX_CART_QTY);

    if (!productId || !title || priceCents === null || !currency || qty === null) {
        return null;
    }

    return {
        product_id: productId,
        title,
        price_cents: priceCents,
        currency: currency.toUpperCase(),
        image_path: cleanOptionalString(raw.image_path, 2_000),
        qty,
        sku: cleanOptionalString(raw.sku, 200),
        color_label: cleanOptionalString(raw.color_label, 100),
        size: cleanOptionalString(raw.size, 20),
    };
}

export function normaliseCartState(value: unknown): CartState {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { items: [] };
    }

    const items = (value as { items?: unknown }).items;
    if (!Array.isArray(items)) return { items: [] };

    return {
        items: items
            .map(normaliseCartItem)
            .filter((item): item is CartItem => item !== null)
            .slice(0, MAX_CART_ITEMS),
    };
}

export function loadCart(): CartState {
    if (typeof window === "undefined") return { items: [] };
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? normaliseCartState(JSON.parse(raw)) : { items: [] };
    } catch {
        return { items: [] };
    }
}

export function saveCart(state: CartState) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(KEY, JSON.stringify(normaliseCartState(state)));
    } catch { }
}

export function clearCartStorage() {
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem(KEY);
    } catch { }
}
