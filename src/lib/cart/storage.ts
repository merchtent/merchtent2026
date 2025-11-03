// lib/cart/storage.ts

const KEY = "cart:v1";
export { KEY as CART_STORAGE_KEY };

export function loadCart(): { items: any[] } {
    if (typeof window === "undefined") return { items: [] };
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : { items: [] };
    } catch {
        return { items: [] };
    }
}

export function saveCart(state: { items: any[] }) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(KEY, JSON.stringify(state));
    } catch { }
}

export function clearCartStorage() {
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem(KEY);
    } catch { }
}
