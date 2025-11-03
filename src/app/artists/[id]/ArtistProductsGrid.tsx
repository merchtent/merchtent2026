// app/artists/[id]/ArtistProductsGrid.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { useCart } from "@/components/CartProvider";

type ArtistProduct = {
    id: string;
    title: string;
    slug: string | null;
    price: number;
    currency?: string;
    image: string;
    hover?: string;
    colors?: Array<{
        hex: string;
        label?: string;
        front?: string | null;
        back?: string | null;
    }>;
    rotationImages: string[];
};

const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];

/* ---------- PDP-style colour box ---------- */
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
            title={label ?? hex}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-colors
        ${active
                    ? "border-red-500    ring-red-500 ring-offset-2 ring-offset-neutral-900 bg-neutral-900"
                    : "border-neutral-700 bg-neutral-950 hover:bg-neutral-900"
                }`}
        >
            <span
                className="h-3.5 w-3.5 rounded-full border"
                style={{ backgroundColor: hex }}
            />
            <span className="text-neutral-200">{label ?? hex}</span>
        </button>
    );
}

export default function ArtistProductsGrid({ products }: { products: ArtistProduct[] }) {
    if (!products.length) {
        return (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                <p className="text-neutral-300">No products yet.</p>
            </div>
        );
    }

    return (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, idx) => (
                <li key={p.id}>
                    <ArtistProductCard product={p} clipped={idx % 2 === 0} />
                </li>
            ))}
        </ul>
    );
}

function ArtistProductCard({
    product,
    clipped = false,
}: {
    product: ArtistProduct;
    clipped?: boolean;
}) {
    const { add, open } = useCart();

    const [activeColorIdx, setActiveColorIdx] = useState(0);
    const [activeSize, setActiveSize] = useState("XS");
    const [imgIdx, setImgIdx] = useState(0);

    const hasColors = Array.isArray(product.colors) && product.colors.length > 0;
    const activeColor = hasColors ? product.colors![activeColorIdx] : null;

    const rotation = product.rotationImages?.length ? product.rotationImages : [product.image];

    const colourFront = activeColor?.front ?? null;
    const colourBack = activeColor?.back ?? null;

    const shownSrc = colourFront || rotation[imgIdx] || product.image;
    const hoverSrc = colourBack || product.hover || shownSrc;

    const priceLabel = new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: product.currency ?? "AUD",
    }).format(product.price);

    const handleHover = () => {
        setImgIdx((prev) => {
            const next = prev + 1;
            return next >= rotation.length ? 0 : next;
        });
    };

    function handleAddToCart(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        const hex = activeColor?.hex ?? "#000000";
        const sku = `${product.id}-${activeSize}-${hex}`;
        add({
            product_id: product.id,
            title: product.title,
            price_cents: Math.round(product.price * 100),
            currency: product.currency ?? "AUD",
            image_path: undefined,   // keep as before; we pass URL below
            image_url: shownSrc,     // so cart shows the exact chosen image
            qty: 1,
            sku,
            color_label: activeColor?.label ?? null,
            size: activeSize,
        } as any);
        open();
    }

    return (
        <div
            className={`group relative rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden hover:border-neutral-700 transition-colors ${clipped ? "" : ""}`}
        >
            {/* IMAGE AREA (only this is the link) */}
            <Link
                href={`/product/${product.slug ?? product.id}`}
                className="block"
                onMouseEnter={handleHover}
            >
                <div className="relative aspect-[3/4]">
                    <Image
                        src={shownSrc}
                        alt={product.title}
                        fill
                        className="object-cover transition-opacity duration-300 group-hover:opacity-0"
                        sizes="(max-width:768px) 50vw, (max-width:1200px) 33vw, 25vw"
                    />
                    <Image
                        src={hoverSrc}
                        alt={`${product.title} alt`}
                        fill
                        className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        sizes="(max-width:768px) 50vw, (max-width:1200px) 33vw, 25vw"
                    />

                    {/* wishlist */}
                    <button
                        className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-black/40 text-white"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        aria-label="Wishlist"
                    >
                        <Heart className="h-4 w-4" />
                    </button>

                    {/* hover add-to-cart */}
                    <div className="absolute bottom-1 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                        <div className="pointer-events-auto">
                            <button
                                className="w-full h-8 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow"
                                onClick={handleAddToCart}
                            >
                                Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            </Link>

            {/* BODY */}
            <div className="p-3 md:p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <Link
                            href={`/product/${product.slug ?? product.id}`}
                            className="text-sm md:text-base hover:underline"
                        >
                            {product.title}
                        </Link>
                        <p className="text-sm text-neutral-400">{priceLabel}</p>
                    </div>
                </div>

                {/* PDP-style colours */}
                {hasColors && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {product.colors!.map((c, idx) => (
                            <ColorBox
                                key={`${product.id}-color-${idx}`}
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

                {/* sizes — dark tone (same treatment as Product Card) */}
                <div className="mt-2 flex flex-wrap gap-1">
                    {DEFAULT_SIZES.map((sz) => {
                        const active = activeSize === sz;
                        const base = "text-xs rounded-md border px-2 py-1 border-neutral-700";
                        const activeCls = "bg-red-600 text-white border-red-500";
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
            </div>
        </div>
    );
}
