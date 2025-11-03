// lib/cart/types.ts
export type CartItem = {
    product_id: string;
    title: string;
    price_cents: number;
    currency: string;
    image_path?: string | null;
    qty: number;

    // varianty stuff 👇
    sku?: string | null;          // e.g. "abcd123-m-black"
    color_label?: string | null;  // "Black"
    size?: string | null;         // "M"
};

export type CartState = {
    items: CartItem[];
};
