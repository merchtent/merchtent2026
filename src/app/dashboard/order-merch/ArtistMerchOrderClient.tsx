"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import {
    ARTIST_SELF_ORDER_TYPE,
    artistSelfOrderUnitPriceCents,
} from "@/lib/artist-self-orders";
import { publicProductImageUrlOrSource } from "@/lib/storage";

export type ArtistOrderProduct = {
    id: string;
    title: string;
    price_cents: number;
    artist_cut_cents: number;
    currency: string;
    image_path: string | null;
    variants: Array<{ size: string; color: string; sku: string | null }>;
};

function money(cents: number, currency: string) {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(cents / 100);
}

function ProductOrderRow({ product }: { product: ArtistOrderProduct }) {
    const { add, clear, items, open } = useCart();
    const colors = useMemo(
        () => Array.from(new Set(product.variants.map((variant) => variant.color))),
        [product.variants]
    );
    const [color, setColor] = useState(colors[0] ?? "");
    const sizes = useMemo(
        () => product.variants.filter((variant) => variant.color === color),
        [color, product.variants]
    );
    const [size, setSize] = useState(sizes[0]?.size ?? "");
    const [quantity, setQuantity] = useState(1);
    const [added, setAdded] = useState(false);
    const selectedVariant =
        product.variants.find((variant) => variant.color === color && variant.size === size) ?? sizes[0];
    const artistPrice = artistSelfOrderUnitPriceCents(product.price_cents, product.artist_cut_cents);
    const hasRetailItems = items.some((item) => item.purchase_type !== ARTIST_SELF_ORDER_TYPE);
    const imageUrl = publicProductImageUrlOrSource(product.image_path);

    function changeColor(nextColor: string) {
        setColor(nextColor);
        setSize(product.variants.find((variant) => variant.color === nextColor)?.size ?? "");
    }

    function addToOrder() {
        if (!selectedVariant) return;
        if (hasRetailItems) clear();

        add({
            product_id: product.id,
            title: product.title,
            price_cents: artistPrice,
            currency: product.currency,
            image_path: product.image_path,
            sku: `artist-${product.id}-${selectedVariant.size}-${selectedVariant.color}`.toLowerCase(),
            color_label: selectedVariant.color,
            size: selectedVariant.size,
            purchase_type: ARTIST_SELF_ORDER_TYPE,
            artist_discount_cents: product.artist_cut_cents,
        }, quantity);
        setAdded(true);
        open();
        window.setTimeout(() => setAdded(false), 1800);
    }

    return (
        <article className="grid border border-neutral-800 bg-neutral-950 md:grid-cols-[180px_1fr_auto]">
            <div className="relative aspect-square border-b border-neutral-800 bg-[#f4f1e8] md:aspect-auto md:border-b-0 md:border-r">
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={product.title}
                        fill
                        sizes="180px"
                        className="object-contain p-3"
                    />
                ) : (
                    <div className="grid h-full min-h-40 place-items-center text-xs text-black/45">No image</div>
                )}
            </div>

            <div className="p-5">
                <p className="text-xl font-black uppercase leading-tight">{product.title}</p>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-sm text-neutral-500 line-through">
                        RRP {money(product.price_cents, product.currency)}
                    </span>
                    <span className="text-2xl font-black text-lime-300">
                        {money(artistPrice, product.currency)}
                    </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-neutral-400">
                    Your {money(product.artist_cut_cents, product.currency)} artist cut is removed from the price. No artist payout is generated for this order.
                </p>
            </div>

            <div className="grid content-center gap-3 border-t border-neutral-800 p-5 md:min-w-64 md:border-l md:border-t-0">
                <label className="grid gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                    Colour
                    <select
                        value={color}
                        onChange={(event) => changeColor(event.target.value)}
                        className="h-11 border border-neutral-700 bg-black px-3 text-sm font-semibold normal-case tracking-normal text-white"
                    >
                        {colors.map((option) => <option key={option}>{option}</option>)}
                    </select>
                </label>
                <label className="grid gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                    Size
                    <select
                        value={selectedVariant?.size ?? ""}
                        onChange={(event) => setSize(event.target.value)}
                        className="h-11 border border-neutral-700 bg-black px-3 text-sm font-semibold normal-case tracking-normal text-white"
                    >
                        {sizes.map((option) => <option key={`${option.color}-${option.size}`}>{option.size}</option>)}
                    </select>
                </label>
                <div className="grid gap-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                        Quantity
                    </span>
                    <div className="grid h-11 grid-cols-[44px_1fr_44px] border border-neutral-700 bg-black">
                        <button
                            type="button"
                            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                            disabled={quantity <= 1}
                            aria-label="Decrease quantity"
                            title="Decrease quantity"
                            className="grid place-items-center border-r border-neutral-700 text-white hover:bg-neutral-900 disabled:cursor-not-allowed disabled:text-neutral-700"
                        >
                            <Minus className="h-4 w-4" />
                        </button>
                        <input
                            type="number"
                            min={1}
                            max={99}
                            inputMode="numeric"
                            value={quantity}
                            onChange={(event) => {
                                const next = Number.parseInt(event.target.value, 10);
                                setQuantity(Number.isFinite(next) ? Math.max(1, Math.min(99, next)) : 1);
                            }}
                            aria-label="Quantity"
                            className="min-w-0 bg-black px-2 text-center text-sm font-black text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                            type="button"
                            onClick={() => setQuantity((current) => Math.min(99, current + 1))}
                            disabled={quantity >= 99}
                            aria-label="Increase quantity"
                            title="Increase quantity"
                            className="grid place-items-center border-l border-neutral-700 text-white hover:bg-neutral-900 disabled:cursor-not-allowed disabled:text-neutral-700"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={addToOrder}
                    disabled={!selectedVariant}
                    className="inline-flex h-11 items-center justify-center gap-2 bg-lime-300 px-4 text-sm font-black uppercase text-black disabled:opacity-40"
                >
                    {added ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                    {added ? `Added ${quantity}` : hasRetailItems ? "Replace cart & add" : "Add to order"}
                </button>
            </div>
        </article>
    );
}

export default function ArtistMerchOrderClient({ products }: { products: ArtistOrderProduct[] }) {
    return (
        <div className="space-y-4">
            {products.map((product) => <ProductOrderRow key={product.id} product={product} />)}
        </div>
    );
}
