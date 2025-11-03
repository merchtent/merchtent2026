// components/AddToCartButton.tsx
"use client";

import { useCart } from "@/components/CartProvider";
import { useToast } from "@/components/ToastProvider";

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
    const toast = useToast();

    const sku = `${product_id}-${(selectedSize || "nosize").toLowerCase()}-${(
        selectedColor || "nocolor"
    ).toLowerCase()}`;

    return (
        <button
            type="button"
            // className={
            //     className ??
            //     // ✅ same look as checkout
            //     "relative h-11 px-6 font-black tracking-wide bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 border border-red-500 rounded-2xl"
            // }
            className="relative rounded-xl px-5 py-3 text-sm font-black tracking-wide bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 border border-red-500 disabled:opacity-50"
            style={{
                clipPath: "polygon(6% 0,100% 0,94% 100%,0 100%)",
            }}
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
                open();

                // leave toast commented
                // toast({ ... })
            }}
        >
            Add to cart
        </button>
    );
}
