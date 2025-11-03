// components/ProductBuyBox.tsx
"use client";

import AddToCartButton from "@/components/AddToCartButton";
import { Star, Truck, RefreshCw, ShieldCheck } from "lucide-react";
import * as React from "react";

type ColorOption = {
    id: string;
    hex: string;
    label: string;
    front_image_url: string | null;
    back_image_url: string | null;
};

type Props = {
    id: string;
    title: string;
    price_cents: number;
    currency: string;
    image_path: string | null;
    priceLabel: string;
    split4Label: string;
    colors?: ColorOption[];

    // controlled props:
    selectedColorId?: string | null;
    onSelectColor?: (id: string | null) => void;
    selectedSize?: string | null;
    onSelectSize?: (size: string) => void;
    overrideImage?: string | null;
};

export default function ProductBuyBox({
    id,
    title,
    price_cents,
    currency,
    image_path,
    priceLabel,
    split4Label,
    colors = [],
    selectedColorId,
    onSelectColor,
    selectedSize,
    onSelectSize,
    overrideImage,
}: Props) {
    // uncontrolled fallbacks
    const [localSize, setLocalSize] = React.useState<string>("XS");
    const [localColorId, setLocalColorId] = React.useState<string | null>(
        colors.length ? colors[0].id : null
    );

    const size = selectedSize ?? localSize;
    const colorId = selectedColorId ?? localColorId;

    const selectedColor = colors.find((c) => c.id === colorId) || null;

    const handleSelectSize = (s: string) => {
        if (onSelectSize) onSelectSize(s);
        else setLocalSize(s);
    };

    const handleSelectColor = (id: string) => {
        if (onSelectColor) onSelectColor(id);
        else setLocalColorId(id);
    };

    return (
        <div
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
            style={{ clipPath: "polygon(1% 0,100% 0,99% 100%,0 100%)" }}
        >
            {/* Price / title */}
            <div className="flex items-start justify-between gap-4">
                <h2 className="text-lg font-black leading-tight">{title}</h2>
                <div className="text-right">
                    <div className="text-2xl font-black text-red-400 leading-none">
                        {priceLabel}
                    </div>
                    {/* <div className="text-[11px] text-neutral-400">
                        or 4 x <span className="tabular-nums">{split4Label}</span>
                    </div> */}
                </div>
            </div>

            {/* Rating stub */}
            <div className="mt-2 flex items-center gap-1 text-amber-400">
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <span className="ml-2 text-xs text-neutral-400">1,243 reviews</span>
            </div>

            {/* Colours */}
            {colors.length > 0 ? (
                <div className="mt-4 space-y-2">
                    <p className="text-xs text-neutral-400">Colour</p>
                    <div className="flex flex-wrap gap-2">
                        {colors.map((c) => {
                            const active = c.id === colorId;
                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => handleSelectColor(c.id)}
                                    className={`relative h-9 px-3 rounded-lg border text-sm flex items-center gap-2 ${active
                                        ? "border-red-500 bg-neutral-900"
                                        : "border-neutral-700 bg-neutral-950 hover:bg-neutral-900"
                                        }`}
                                >
                                    <span
                                        className="h-4 w-4 rounded-full border border-black/20"
                                        style={{ backgroundColor: c.hex }}
                                    />
                                    <span className="text-xs">{c.label || c.hex}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            {/* Size */}
            <div className="mt-4 space-y-2">
                <p className="text-xs text-neutral-400">Size</p>
                <div className="grid grid-cols-5 gap-2">
                    {["XS", "S", "M", "L", "XL"].map((s) => {
                        const active = size === s;
                        return (
                            <button
                                key={s}
                                type="button"
                                onClick={() => handleSelectSize(s)}
                                className={`h-10 rounded-lg border text-sm ${active
                                    ? "border-red-500 bg-neutral-900"
                                    : "border-neutral-700 bg-neutral-950 hover:bg-neutral-900"
                                    }`}
                                aria-pressed={active}
                            >
                                {s}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ATC */}
            <div className="mt-4">
                <AddToCartButton
                    product_id={id}
                    title={title}
                    price_cents={price_cents}
                    currency={currency}
                    image_path={image_path}
                    selectedColor={selectedColor ? selectedColor.hex : null}
                    selectedColorLabel={selectedColor ? selectedColor.label : null}
                    selectedSize={size}
                    overrideImage={overrideImage ?? selectedColor?.front_image_url ?? null}
                    className="relative h-11 px-6 font-black tracking-wide bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 border border-red-500 rounded-2xl w-full"
                />
            </div>

            {/* Trust row */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-neutral-400">
                <div className="flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5" />
                    Fast dispatch
                </div>
                <div className="flex items-center gap-1">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Eco Friendly Printing
                </div>
                <div className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Secure checkout
                </div>
            </div>
        </div>
    );
}
