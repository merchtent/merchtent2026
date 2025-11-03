// src/components/CartProvider.tsx
"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    useCallback,
} from "react";
import type { CartItem, CartState } from "@/lib/cart/types";
import {
    clearCartStorage,
    loadCart,
    saveCart,
} from "@/lib/cart/storage";

type SetQtyOpts = { by?: "sku" | "product_id" };
type RemoveOpts = { by?: "sku" | "product_id" };

type CartCtx = {
    items: CartItem[];
    add: (item: Omit<CartItem, "qty">, qty?: number) => void;
    remove: (id: string, opts?: RemoveOpts) => void;
    setQty: (id: string, qty: number, opts?: SetQtyOpts) => void;
    clear: () => void;
    subtotal_cents: number;
    currency: string | null;
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
    count: number;
};

const Ctx = createContext<CartCtx | null>(null);

// helper: make a sku if caller forgot
function ensureSkuLike(item: Omit<CartItem, "qty">): string | null {
    if (item.sku && item.sku !== "") return item.sku;

    const hasVariant = item.size || item.color_label;
    if (hasVariant) {
        // build one from product + variant
        const sizePart = (item.size || "nosize").toString().toLowerCase();
        const colorPart = (item.color_label || "nocolor").toString().toLowerCase();
        return `${item.product_id}-${sizePart}-${colorPart}`;
    }

    return null;
}

export default function CartProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<CartState>({ items: [] });
    const [isOpen, setOpen] = useState(false);

    // init from localStorage
    useEffect(() => {
        setState(loadCart());
    }, []);

    // persist to localStorage
    useEffect(() => {
        saveCart(state);
    }, [state]);

    // ADD — only combine if sku is the same
    const add = useCallback((rawItem: Omit<CartItem, "qty">, qty: number = 1) => {
        setState((prev) => {
            const amount = Math.max(1, Math.min(99, qty));

            // normalise / auto-sku
            const autoSku = ensureSkuLike(rawItem);
            const item: Omit<CartItem, "qty"> = autoSku ? { ...rawItem, sku: autoSku } : rawItem;

            // 1) if we have a sku, only merge on that sku
            if (item.sku) {
                const existing = prev.items.find((i) => i.sku === item.sku);
                if (existing) {
                    return {
                        items: prev.items.map((i) =>
                            i.sku === item.sku ? { ...i, qty: Math.min(99, i.qty + amount) } : i
                        ),
                    };
                }
                return { items: [...prev.items, { ...item, qty: amount }] };
            }

            // 2) otherwise (no sku, no variant) — old behaviour: merge by product_id
            const existing = prev.items.find(
                (i) => i.product_id === item.product_id && !i.sku
            );
            if (existing) {
                return {
                    items: prev.items.map((i) =>
                        i.product_id === item.product_id && !i.sku
                            ? { ...i, qty: Math.min(99, i.qty + amount) }
                            : i
                    ),
                };
            }

            return { items: [...prev.items, { ...item, qty: amount }] };
        });
    }, []);

    // REMOVE — by sku or product_id
    const remove = useCallback((id: string, opts?: RemoveOpts) => {
        setState((prev) => {
            if (opts?.by === "sku") {
                return { items: prev.items.filter((i) => i.sku !== id) };
            }
            return { items: prev.items.filter((i) => i.product_id !== id) };
        });
    }, []);

    // SET QTY — by sku or product_id
    const setQty = useCallback((id: string, qty: number, opts?: SetQtyOpts) => {
        const nextQty = Math.max(1, Math.min(99, qty));
        setState((prev) => {
            if (opts?.by === "sku") {
                return {
                    items: prev.items.map((i) =>
                        i.sku === id ? { ...i, qty: nextQty } : i
                    ),
                };
            }
            return {
                items: prev.items.map((i) =>
                    i.product_id === id ? { ...i, qty: nextQty } : i
                ),
            };
        });
    }, []);

    const clear = useCallback(() => {
        clearCartStorage();
        setState({ items: [] });
    }, []);

    const open = useCallback(() => setOpen(true), []);
    const close = useCallback(() => setOpen(false), []);
    const toggle = useCallback(() => setOpen((o) => !o), []);

    const subtotal_cents = state.items.reduce(
        (sum, i) => sum + i.price_cents * i.qty,
        0
    );
    const currency = state.items[0]?.currency ?? null;
    const count = state.items.reduce((n, i) => n + i.qty, 0);

    const api = useMemo<CartCtx>(
        () => ({
            items: state.items,
            add,
            remove,
            setQty,
            clear,
            subtotal_cents,
            currency,
            isOpen,
            open,
            close,
            toggle,
            count,
        }),
        [
            state.items,
            subtotal_cents,
            currency,
            isOpen,
            add,
            remove,
            setQty,
            clear,
            open,
            close,
            toggle,
            count,
        ]
    );

    return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCart() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useCart must be used within <CartProvider>");
    return ctx;
}
