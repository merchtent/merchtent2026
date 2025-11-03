"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AddToCartButton from "@/components/AddToCartButton";
import { useRouter } from "next/navigation";

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

/* PDP-style colour pill */
function ColorBox({
    hex,
    label,
    active,
    onClick,
}: {
    hex: string;
    label?: string | null;
    active?: boolean;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs transition
                ${active
                    ? "border-red-500 bg-red-500/10"
                    : "border-neutral-800"
                }`}
        >
            <span
                className="h-4 w-4 rounded-full border border-neutral-900/40"
                style={{ backgroundColor: hex }}
            />
            <span className="truncate max-w-[90px]">
                {label ?? hex ?? "Colour"}
            </span>
        </button>
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
    const cardClass =
        theme === "light"
            ? "overflow-hidden bg-white text-neutral-900 border-neutral-200"
            : "overflow-hidden bg-neutral-950 text-neutral-100 border-neutral-800";
    const priceText =
        theme === "light" ? "text-neutral-600" : "text-neutral-400";
    const wishColor =
        theme === "light"
            ? "text-neutral-500 hover:text-neutral-800"
            : "text-neutral-400 hover:text-white";

    // state
    const [activeColorIdx, setActiveColorIdx] = useState(0);
    const defaultSizes =
        p.sizes && p.sizes.length ? p.sizes : ["XS", "S", "M", "L", "XL"];
    const [activeSize, setActiveSize] = useState<string | null>(
        defaultSizes[0] ?? null
    );

    const router = useRouter();

    const hasColors = Array.isArray(p.colors) && p.colors.length > 0;
    const activeColor = hasColors ? p.colors![activeColorIdx] : null;

    const frontSrc = activeColor?.front || p.image;
    const backSrc = activeColor?.back || p.hover || frontSrc;

    const selectedColorHex = activeColor?.hex ?? null;
    const selectedColorLabel = activeColor?.label ?? activeColor?.hex ?? null;

    const [isTouch, setIsTouch] = useState(false);
    const [showBack, setShowBack] = useState(false);
    const [dragX, setDragX] = useState(0);
    type PointerStart = { x: number; y: number; t: number };
    const startRef = useRef<PointerStart | null>(null);
    const draggingRef = useRef(false);
    const tapCandidateRef = useRef(false); // 👈 new

    useEffect(() => {
        const mq = window.matchMedia("(hover: none)");
        const update = () => setIsTouch(mq.matches);
        update();
        mq.addEventListener?.("change", update);
        return () => mq.removeEventListener?.("change", update);
    }, []);



    function onPointerDown(e: React.PointerEvent) {
        if (!isTouch) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        startRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
        draggingRef.current = true;
        tapCandidateRef.current = true; // assume tap until proven otherwise
    }

    function onPointerMove(e: React.PointerEvent) {
        if (!isTouch || !draggingRef.current || !startRef.current) return;
        const dx = e.clientX - startRef.current.x;
        const dy = e.clientY - startRef.current.y;

        // if we moved more than a tiny threshold in any direction, it’s not a tap anymore
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) tapCandidateRef.current = false;

        // treat as horizontal only if clearly more X than Y
        if (Math.abs(dx) > Math.abs(dy)) {
            e.preventDefault(); // stop page scroll while sliding horizontally
            setDragX(Math.max(-60, Math.min(60, dx)));
        }
    }

    function onPointerUp(e: React.PointerEvent) {
        if (!isTouch || !startRef.current) return;
        const dx = e.clientX - startRef.current.x;
        const dy = e.clientY - startRef.current.y;
        const dt = Date.now() - startRef.current.t;

        draggingRef.current = false;
        startRef.current = null;

        // swipe to flip (confident horizontal)
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
            setShowBack((s) => !s);
            setDragX(0);
            return;
        }

        // TAP: very small movement and short duration → navigate
        if (tapCandidateRef.current && Math.abs(dx) < 8 && Math.abs(dy) < 8 && dt < 250) {
            router.push(`/product/${p.slug ?? p.id}`);
        }

        setDragX(0);
    }


    // title sizing
    const titleLen = p.title.length;
    const titleSize =
        titleLen > 48
            ? "text-[13px]"
            : titleLen > 32
                ? "text-sm"
                : "text-base";
    const titleClass = `${titleSize} leading-snug line-clamp-2`;

    return (
        <Card
            className={`${cardClass} relative`}
            style={
                clipped
                    ? { clipPath: "polygon(3% 5%,100% 0,98% 100%,0 98%)" }
                    : undefined
            }
        >
            {/* 👇 hover only on image area */}
            <div
                className="relative aspect-[3/4] group"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => {
                    draggingRef.current = false;
                    startRef.current = null;
                    setDragX(0);
                }}>
                {/* overlay link */}
                {/* <Link
                    href={`/product/${p.slug ?? p.id}`}
                    aria-label={p.title}
                    className="absolute inset-0 z-10"
                />

                <Image
                    src={frontSrc}
                    alt={p.title}
                    fill
                    className="relative z-0 object-cover transition-opacity duration-300 group-hover:opacity-0"
                    sizes="(max-width:768px) 50vw, (max-width:1200px) 33vw, 25vw"
                />
                <Image
                    src={backSrc}
                    alt={`${p.title} alt`}
                    fill
                    className="relative z-0 object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    sizes="(max-width:768px) 50vw, (max-width:1200px) 33vw, 25vw"
                />

                {p.badge && (
                    <span className="absolute top-3 left-3 z-20 text-[11px] font-bold bg-red-600 text-white px-2 py-0.5 rounded rotate-[-3deg]">
                        {p.badge}
                    </span>
                )}

                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <BootlegStamp />
                </div> */}

                {/* Overlay link: disable on touch so it doesn't steal the gesture */}
                <Link
                    href={`/product/${p.slug ?? p.id}`}
                    aria-label={p.title}
                    className="absolute inset-0 z-10"
                    style={{ pointerEvents: isTouch ? "none" : "auto" }}
                    tabIndex={-1}
                />


                {/* FRONT image */}
                <Image
                    src={frontSrc}
                    alt={p.title}
                    fill
                    sizes="(max-width:768px) 50vw, (max-width:1200px) 33vw, 25vw"
                    className={[
                        "relative z-0 object-cover transition-opacity duration-300 will-change-transform",
                        // desktop hover behavior
                        "md:opacity-100 md:group-hover:opacity-0",
                        // mobile: swap by state (and give a tiny slide while dragging)
                        showBack ? "opacity-0" : "opacity-100",
                    ].join(" ")}
                    style={isTouch ? { transform: `translateX(${dragX}px)` } : undefined}
                />

                {/* BACK image */}
                <Image
                    src={backSrc}
                    alt={`${p.title} alt`}
                    fill
                    sizes="(max-width:768px) 50vw, (max-width:1200px) 33vw, 25vw"
                    className={[
                        "relative z-0 object-cover transition-opacity duration-300 will-change-transform",
                        "md:opacity-0 md:group-hover:opacity-100",
                        showBack ? "opacity-100" : "opacity-0",
                    ].join(" ")}
                    style={isTouch ? { transform: `translateX(${dragX}px)` } : undefined}
                />

                {/* (Optional) small hint shown only on touch */}
                {isTouch && (
                    <span
                        className="absolute bottom-2 right-2 text-[10px] px-2 py-0.5 rounded border"
                        style={{ pointerEvents: "none" }}  // 👈 so taps pass through to image
                    >
                        Swipe to flip
                    </span>
                )}

                {/* CTA rail */}
                <div className="absolute bottom-1 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
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
                            style={{
                                clipPath: "polygon(6% 0,100% 0,94% 100%,0 100%)",
                            }}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.location.href = `/product/${p.slug ?? p.id}`;
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
                {hasColors && (
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
                )}

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
            </CardContent>
        </Card>
    );
}
