"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AddToCartButton from "@/components/AddToCartButton";

export type ProductColorVariant = {
    hex: string;
    label?: string | null;
    front?: string | null;
    back?: string | null;
};

export type Product = {
    id: string;
    title: string;
    price: number;
    image: string;
    hover?: string;
    badge?: string;
    colors?: ProductColorVariant[];
    slug?: string;
    kind?: "tee" | "hoodie" | "vinyl" | "cassette" | "poster" | "accessory";
    sizes?: string[];
};

function BootlegStamp() {
    return (
        <div className="pointer-events-none absolute -left-8 -top-4 rotate-[-12deg] text-[11px] font-black tracking-wider">
            <span className="bg-red-600 text-white px-3 py-1 rounded">
                LIMITED // 300
            </span>
        </div>
    );
}

function ColorSwatches({
    colors,
    activeIndex,
    onSelect,
}: {
    colors: ProductColorVariant[];
    activeIndex: number;
    onSelect: (idx: number) => void;
}) {
    const visible = colors.slice(0, 5);
    const remaining = colors.length - visible.length;

    return (
        <div className="mt-3 flex items-center gap-1.5 h-6">
            {visible.map((c, idx) => (
                <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelect(idx);
                    }}
                    className={`h-5 w-5 rounded-full border transition-all ${activeIndex === idx
                        ? "ring-2 ring-red-500 scale-110"
                        : "border-neutral-700 hover:scale-105"
                        }`}
                    style={{
                        backgroundColor: c.hex,
                    }}
                    title={c.label ?? undefined}
                />
            ))}

            {remaining > 0 && (
                <span className="ml-1 text-xs text-neutral-400 font-medium">
                    +{remaining}
                </span>
            )}
        </div>
    );
}

export function ProductCard({
    p,
    theme = "dark",
    clipped = false,
    sizeTone = "dark",
}: {
    p: Product;
    theme?: "dark" | "light";
    clipped?: boolean;
    sizeTone?: "light" | "dark";
}) {
    const router = useRouter();
    const cardClass =
        theme === "light"
            ? "overflow-hidden bg-white text-neutral-900 border-neutral-200"
            : "overflow-hidden bg-neutral-950 text-neutral-100 border-neutral-800";
    const priceText = theme === "light" ? "text-neutral-600" : "text-neutral-400";
    const wishColor =
        theme === "light"
            ? "text-neutral-500 hover:text-neutral-800"
            : "text-neutral-400 hover:text-white";

    // state
    const [activeColorIdx, setActiveColorIdx] = useState(0);
    const defaultSizes =
        p.sizes && p.sizes.length ? p.sizes : ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
    const [activeSize, setActiveSize] = useState<string | null>(
        defaultSizes[0] ?? null
    );

    const [isTouch, setIsTouch] = useState(false);
    const [showBack, setShowBack] = useState(false); // used on mobile to rotate

    useEffect(() => {
        const mq = window.matchMedia("(hover: none)");
        const update = () => setIsTouch(mq.matches);
        update();
        mq.addEventListener?.("change", update);
        return () => mq.removeEventListener?.("change", update);
    }, []);

    const hasColors = Array.isArray(p.colors) && p.colors.length > 0;
    const colors = hasColors ? p.colors! : [];
    const activeColor = colors[activeColorIdx] ?? null;

    const frontSrc = activeColor?.front || p.image;
    const backSrc = activeColor?.back || p.hover || frontSrc;

    const selectedColorHex = activeColor?.hex ?? null;
    const selectedColorLabel = activeColor?.label ?? activeColor?.hex ?? null;

    // 🔁 Mobile: rotate front/back every 1.6s (only if they differ)
    const canRotateImages = isTouch && Boolean(frontSrc && backSrc && frontSrc !== backSrc);
    const displayBackImage = canRotateImages && showBack;

    useEffect(() => {
        if (!canRotateImages) return;
        const id = window.setInterval(() => {
            setShowBack((s) => !s);
        }, 1600);
        return () => window.clearInterval(id);
    }, [canRotateImages]);

    // title sizing (keep)
    const titleLen = p.title.length;
    const titleSize =
        titleLen > 48 ? "text-[13px]" : titleLen > 32 ? "text-sm" : "text-base";
    const titleClass = `${titleSize} leading-snug line-clamp-2`;

    return (
        <Card
            className={`${cardClass} relative`}
            style={
                clipped ? { clipPath: "polygon(3% 5%,100% 0,98% 100%,0 98%)" } : undefined
            }
        >
            {/* Image area */}
            <div className="relative aspect-[3/4] group">
                {/* Full overlay link – enabled for all (we removed swipe) */}
                <Link
                    href={`/product/${p.slug ?? p.id}`}
                    aria-label={p.title}
                    className="absolute inset-0 z-10"
                    tabIndex={-1}
                />

                {/* FRONT image */}
                <Image
                    src={frontSrc}
                    alt={p.title}
                    fill
                    sizes="(max-width:768px) 50vw, (max-width:1200px) 33vw, 25vw"
                    className={[
                        "relative z-0 object-cover transition-all duration-700 group-hover:scale-105",
                        // Desktop hover flips to back
                        "md:opacity-100 md:group-hover:opacity-0",
                        // Mobile rotation via state
                        isTouch ? (displayBackImage ? "opacity-0" : "opacity-100") : "",
                    ].join(" ")}
                />

                {/* BACK image */}
                <Image
                    src={backSrc}
                    alt={`${p.title} alt`}
                    fill
                    sizes="(max-width:768px) 50vw, (max-width:1200px) 33vw, 25vw"
                    className={[
                        "relative z-0 object-cover transition-all duration-700 group-hover:scale-105",
                        "md:opacity-0 md:group-hover:opacity-100",
                        isTouch ? (displayBackImage ? "opacity-100" : "opacity-0") : "",
                    ].join(" ")}
                />

                {p.badge && (
                    <span className="absolute top-3 left-3 z-20 text-[11px] font-bold bg-red-600 text-white px-2 py-0.5 rounded rotate-[-3deg]">
                        {p.badge}
                    </span>
                )}

                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <BootlegStamp />
                </div>

                {/* Desktop CTA rail (on hover) */}
                <div className="absolute bottom-1 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                    <div className="flex gap-2 relative z-20">
                        <AddToCartButton
                            product_id={p.id}
                            title={p.title}
                            price_cents={Math.round(p.price * 100)}
                            currency="AUD"
                            image_path={frontSrc}
                            selectedColor={selectedColorHex}
                            selectedColorLabel={selectedColorLabel}
                            selectedSize={activeSize}
                            overrideImage={frontSrc}
                            className="flex-1 h-9 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                        />
                        <Button
                            type="button"
                            className="flex-1 h-12 rounded-lg text-white text-xs font-semibold relative rounded-xl px-5 py-3 text-sm font-black tracking-wide text-white shadow-lg border disabled:opacity-50"
                            style={{ clipPath: "polygon(6% 0,100% 0,94% 100%,0 100%)", cursor: "pointer" }}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                router.push(`/product/${p.slug ?? p.id}`);
                            }}
                        >
                            View Merch
                        </Button>
                    </div>
                </div>
            </div>

            <CardContent className="p-3 md:p-4">
                {/* title / price */}
                <div className="flex items-start justify-between gap-3 min-h-[3.25rem]">
                    <div className="min-w-0">
                        <p className={titleClass}>{p.title}</p>
                        <p className={`text-sm ${priceText}`}>${p.price.toFixed(2)}</p>
                    </div>
                    <button aria-label="Wishlist" className={`p-1 ${wishColor}`}>
                        <Heart className="h-4 w-4" />
                    </button>
                </div>

                {/* PDP-style colours */}
                {/* {hasColors && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {p.colors!.map((c, idx) => (
                            <ColorBox
                                key={idx}
                                hex={c.hex}
                                label={c.label}
                                active={idx === activeColorIdx}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActiveColorIdx(idx);
                                }}
                            />
                        ))}
                    </div>
                )} */}

                {/* {hasColors && (
                    <ColorSwatches
                        colors={p.colors!}
                        activeIndex={activeColorIdx}
                        onSelect={setActiveColorIdx}
                    />
                )} */}

                <div className="mt-3 flex items-center justify-between min-h-[24px]">
                    {hasColors ? (
                        <ColorSwatches
                            colors={colors}
                            activeIndex={activeColorIdx}
                            onSelect={setActiveColorIdx}
                        />
                    ) : (
                        <span />
                    )}

                    <span className="text-xs text-neutral-400 truncate ml-2">
                        {activeColor?.label}
                    </span>
                </div>

                {/* sizes */}
                {defaultSizes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {defaultSizes.map((sz) => {
                            const active = activeSize === sz;
                            const base =
                                sizeTone === "light"
                                    ? "text-xs rounded-md border px-2 py-1 bg-white/5 border-white/20"
                                    : "text-xs rounded-md border px-2 py-1 border-neutral-700";
                            const activeCls =
                                sizeTone === "light"
                                    ? "bg-white text-neutral-900 border-white"
                                    : "bg-red-600 text-white border-red-500";
                            return (
                                <button
                                    key={sz}
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setActiveSize(sz);
                                    }}
                                    className={`${base} ${active ? activeCls : ""}`}
                                >
                                    {sz}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Mobile CTA rail (always visible below sizes) */}
                <div className="mt-3 flex gap-2 md:hidden">
                    <AddToCartButton
                        product_id={p.id}
                        title={p.title}
                        price_cents={Math.round(p.price * 100)}
                        currency="AUD"
                        image_path={frontSrc}
                        selectedColor={selectedColorHex}
                        selectedColorLabel={selectedColorLabel}
                        selectedSize={activeSize}
                        overrideImage={frontSrc}
                        className="flex-1 inline-flex items-center justify-center h-10 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                    />
                    <Button
                        type="button"
                        className="flex-1 inline-flex items-center justify-center h-12 rounded-lg text-white font-semibold relative px-4 font-black tracking-wide shadow-lg border disabled:opacity-50"
                        style={{ clipPath: "polygon(6% 0,100% 0,94% 100%,0 100%)" }}
                        onClick={() => {
                            router.push(`/product/${p.slug ?? p.id}`);
                        }}
                    >
                        View Merch
                    </Button>
                </div>

            </CardContent>
        </Card>
    );
}
