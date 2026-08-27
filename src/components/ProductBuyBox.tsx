"use client";

import AddToCartButton from "@/components/AddToCartButton";
import { BadgePercent, PackageCheck, RefreshCw, ShieldCheck, Truck } from "lucide-react";
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
    image_path?: string | null;
    priceLabel: string;
    split4Label: string;
    colors?: ColorOption[];

    // ⭐ NEW
    avgRating?: number | null;
    reviewCount?: number;

    selectedColorId?: string | null;
    onSelectColor?: (id: string | null) => void;
    selectedSize?: string | null;
    onSelectSize?: (size: string) => void;
    overrideImage?: string | null;
    showHeader?: boolean;
};

function Stars({ rating = 5 }: { rating?: number }) {
    return (
        <div className="flex items-center gap-0.5 text-amber-400">
            {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={i <= rating ? "" : "opacity-20"}>
                    ★
                </span>
            ))}
        </div>
    );
}

export default function ProductBuyBox({
    id,
    title,
    price_cents,
    currency,
    image_path,
    priceLabel,
    split4Label,
    colors = [],
    avgRating,
    reviewCount = 0,
    selectedColorId,
    onSelectColor,
    selectedSize,
    onSelectSize,
    overrideImage,
    showHeader = true,
}: Props) {

    const [localSize, setLocalSize] = React.useState("M");
    const [localColorId, setLocalColorId] = React.useState(
        colors.length ? colors[0].id : null
    );

    const size = selectedSize ?? localSize;
    const colorId = selectedColorId ?? localColorId;

    const selectedColor = colors.find((c) => c.id === colorId) || null;

    const handleSelectSize = (s: string) => {
        if (onSelectSize) {
            onSelectSize(s);
        } else {
            setLocalSize(s);
        }
    };

    const handleSelectColor = (id: string) => {
        if (onSelectColor) {
            onSelectColor(id);
        } else {
            setLocalColorId(id);
        }
    };

    return (
        <div className="border border-neutral-800 bg-black p-5">

            {showHeader ? (
                <div className="border-b border-neutral-800 pb-5">
                    <h2 className="text-2xl font-black uppercase leading-none">{title}</h2>

                    <div className="mt-4">
                        <div className="text-4xl font-black text-red-400 leading-none">
                            {priceLabel}
                        </div>
                        <div className="mt-1 text-[11px] text-neutral-500">
                            Approx {split4Label} x 4 where available
                        </div>
                    </div>
                </div>
            ) : null}

            {/* ⭐ REAL RATING */}
            <div className="mt-2">
                {avgRating ? (
                    <div className="flex items-center gap-2">
                        <Stars rating={Math.round(avgRating)} />
                        <span className="text-xs text-neutral-400">
                            {avgRating.toFixed(1)} ({reviewCount})
                        </span>
                    </div>
                ) : (
                    <p className="text-xs text-neutral-400">
                        Be the first to review
                    </p>
                )}
            </div>

            {/* 🔥 WHY BUY (POD positioning) */}
            <div className="mt-5 border border-neutral-800 bg-neutral-950 p-4 text-[12px] text-neutral-300">
                <p className="text-red-400 font-semibold">
                    Made only when you order
                </p>
                <ul className="space-y-1 text-neutral-400">
                    <li>No mass production</li>
                    <li>No wasted stock</li>
                    <li>Directly supports the artist</li>
                </ul>
            </div>

            {/* COLOURS */}
            {colors.length > 0 && (
                <div className="mt-4 space-y-2">
                    <p className="text-xs text-neutral-400">Colour</p>

                    <div className="flex flex-wrap gap-2">
                        {colors.map((c) => {
                            const active = c.id === colorId;

                            return (
                                <button
                                    key={c.id}
                                    onClick={() => handleSelectColor(c.id)}
                                    className={`h-9 px-3 border text-sm flex items-center gap-2 transition-all
                                        ${active
                                            ? "border-red-500 bg-red-600 text-white"
                                            : "border-neutral-700 hover:border-red-500"
                                        }`}
                                >
                                    <span
                                        className="h-4 w-4 border"
                                        style={{ backgroundColor: c.hex }}
                                    />
                                    <span className="text-xs">{c.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {selectedColor && (
                        <p className="text-[11px] text-neutral-400">
                            Selected: {selectedColor.label}
                        </p>
                    )}
                </div>
            )}

            {/* SIZE */}
            <div className="mt-4 space-y-2">
                <p className="text-xs text-neutral-400">Size</p>

                <div className="grid grid-cols-5 gap-2">
                    {["XS", "S", "M", "L", "XL", "2XL", "3XL"].map((s) => {
                        const active = size === s;

                        return (
                            <button
                                key={s}
                                onClick={() => handleSelectSize(s)}
                                className={`h-10 border text-sm font-black transition-all
                                    ${active
                                        ? "border-red-500 bg-red-600 text-white"
                                        : "border-neutral-700 hover:border-red-500"
                                    }`}
                            >
                                {s}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ATC */}
            <div className="mt-5">
                <AddToCartButton
                    product_id={id}
                    title={title}
                    price_cents={price_cents}
                    currency={currency}
                    image_path={image_path}
                    selectedColor={selectedColor?.hex ?? null}
                    selectedColorLabel={selectedColor?.label ?? null}
                    selectedSize={size}
                    overrideImage={overrideImage ?? selectedColor?.front_image_url ?? null}
                    className="relative h-11 px-6 font-black tracking-wide 
                    bg-red-600 hover:bg-red-500
                    text-white shadow-lg shadow-red-900/40 
                    border border-red-400 w-full 
                    transition-all duration-200 active:scale-[0.98]"
                />
            </div>

            <div className="mt-4 grid border border-neutral-800 bg-neutral-950 md:grid-cols-3">
                <SceneSignal icon={<PackageCheck className="h-4 w-4" />} label="No dead stock" body="Made after sale" />
                <SceneSignal icon={<BadgePercent className="h-4 w-4" />} label="Fan credits" body="Earned on buys" />
                <SceneSignal icon={<ShieldCheck className="h-4 w-4" />} label="Secure checkout" body="Tracked order" />
            </div>

            {/* ⚡ URGENCY */}
            <p className="text-[11px] text-neutral-500 mt-2">
                This design may not be restocked
            </p>

            {/* TRUST */}
            <div className="mt-4 grid grid-cols-3 border border-neutral-800 text-[11px] text-neutral-400">
                <div className="flex items-center gap-1 border-r border-neutral-800 p-2">
                    <Truck className="h-3.5 w-3.5" />
                    Fast dispatch
                </div>
                <div className="flex items-center gap-1 border-r border-neutral-800 p-2">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Eco print
                </div>
                <div className="flex items-center gap-1 p-2">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Secure
                </div>
            </div>

            {/* MICRO TRUST */}
            <p className="text-[10px] text-neutral-500 mt-3 text-center">
                Secure checkout • Printed locally • Tracked delivery
            </p>

        </div>
    );
}

function SceneSignal({
    icon,
    label,
    body,
}: {
    icon: React.ReactNode;
    label: string;
    body: string;
}) {
    return (
        <div className="border-b border-r border-neutral-800 p-3 last:border-r-0 md:border-b-0">
            <div className="flex items-center gap-2 text-red-400">
                {icon}
                <p className="text-xs font-black text-white">{label}</p>
            </div>
            <p className="mt-2 text-[10px] uppercase text-neutral-500">{body}</p>
        </div>
    );
}
