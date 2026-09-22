// components/AddToCartButton.tsx
"use client";

import { useCart } from "@/components/CartProvider";
import { trackMarketingEvent } from "@/lib/marketing/events";

type AddToCartButtonProps = {
    product_id: string;
    title: string;
    price_cents: number;
    currency: string;
    image_path?: string | null;

    selectedColor?: string | null;
    selectedColorLabel?: string | null;
    selectedSize?: string | null;
    overrideImage?: string | null;
    className?: string;
};

export default function AddToCartButton({
    product_id,
    title,
    price_cents,
    currency,
    image_path,
    selectedColor,
    selectedColorLabel,
    selectedSize,
    overrideImage,
    className,
}: AddToCartButtonProps) {
    const { add, open } = useCart();

    const sku = `${product_id}-${(selectedSize || "nosize").toLowerCase()}-${(
        selectedColor || "nocolor"
    ).toLowerCase()}`;

    return (
        <button
            type="button"
            className={
                className ??
                "relative border border-[#b6ff3f] bg-[#b6ff3f] px-5 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-white disabled:opacity-50"
            }
            style={{ cursor: "pointer" }}
            onClick={() => {
                add(
                    {
                        product_id,
                        title,
                        price_cents,
                        currency,
                        image_path: overrideImage ?? image_path ?? null,
                        sku,
                        color_label: selectedColorLabel ?? selectedColor ?? null,
                        size: selectedSize ?? null,
                    },
                    1
                );
                trackMarketingEvent("add_to_cart", {
                    currency,
                    value_cents: price_cents,
                    items: [{
                        item_id: product_id,
                        item_name: title,
                        price_cents,
                        currency,
                        quantity: 1,
                        item_variant: [selectedSize, selectedColorLabel ?? selectedColor].filter(Boolean).join(" / "),
                    }],
                });
                open();
            }}
        >
            Add to cart
        </button>
    );
}
