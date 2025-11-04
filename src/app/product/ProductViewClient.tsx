// app/product/[id]/ProductViewClient.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgePercent } from "lucide-react";
import ShareButton from "@/components/ShareButton";
import ProductBuyBox from "@/components/ProductBuyBox";
import AddToCartButton from "@/components/AddToCartButton";

type ProductViewClientProps = {
    product: {
        id: string;
        title: string;
        description: string | null;
        price_cents: number;
        currency: string;
        primary_image_url: string | null;
    };
    galleryUrls: string[];
    colors: Array<{
        id: string;
        hex: string;
        label: string;
        front_image_url: string | null;
        back_image_url: string | null;
    }>;
    related: Array<{
        id: string;
        title: string;
        price_cents: number;
        currency: string;
        primary_image_url: string | null;
    }>;
    priceLabel: string;
    split4Label: string;
};

function publicImageUrl(path: string) {
    // just in case related contains raw path
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${encodeURIComponent(
        path
    )}`;
}

export default function ProductViewClient({
    product,
    galleryUrls,
    colors,
    related,
    priceLabel,
    split4Label,
}: ProductViewClientProps) {
    // ✅ shared state
    const [selectedColorId, setSelectedColorId] = React.useState<string | null>(
        colors.length ? colors[0].id : null
    );
    const [selectedSize, setSelectedSize] = React.useState<string | null>("XS");

    const selectedColor = colors.find((c) => c.id === selectedColorId) || null;

    // choose front/back image based on colour, falling back to original gallery
    // const frontImage =
    //     selectedColor?.front_image_url ??
    //     galleryUrls[0] ??
    //     product.primary_image_url;
    // const backImage =
    //     selectedColor?.back_image_url ?? galleryUrls[1] ?? null;

    // choose front/back image based on colour, falling back to original gallery
    const frontImage =
        selectedColor?.front_image_url ??
        galleryUrls[0] ??
        product.primary_image_url;
    const backImage =
        selectedColor?.back_image_url ?? galleryUrls[1] ?? null;

    // 👉 NEW: Track which image is currently "main"
    const [activeImage, setActiveImage] = React.useState<string | null>(
        frontImage ?? product.primary_image_url ?? null
    );

    // When colour changes, reset main image to the colour's front
    React.useEffect(() => {
        setActiveImage(frontImage ?? product.primary_image_url ?? null);
    }, [frontImage, product.primary_image_url]);


    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* angled banner */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">
                                Merch // Product
                            </p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                {product.title}
                            </h1>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-white">
                                LIVE
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* body */}
            <section className="max-w-6xl mx-auto px-4 py-8">
                <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
                    {/* IMAGE COLUMN */}
                    <div>
                        {/* <div className="group relative rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden">
                            <div className="relative w-full">
                                {frontImage ? (
                                    <Image
                                        key={frontImage}
                                        alt={product.title}
                                        src={frontImage}
                                        width={1600}
                                        height={1600}
                                        className={`w-full h-auto object-cover transition-opacity duration-300 ${backImage ? "group-hover:opacity-0" : ""
                                            }`}
                                        priority
                                    />
                                ) : (
                                    <div className="aspect-square grid place-items-center text-neutral-500">
                                        No image
                                    </div>
                                )}

                                {backImage ? (
                                    <Image
                                        key={backImage}
                                        alt={`${product.title} — alternate`}
                                        src={backImage}
                                        width={1600}
                                        height={1600}
                                        className="w-full h-auto object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    />
                                ) : null}
                            </div>

                            <div className="px-4 py-3 border-t border-neutral-800 bg-neutral-900/70 flex items-center justify-between text-xs">
                                <span className="inline-flex items-center gap-1 text-neutral-300">
                                    <BadgePercent className="h-3.5 w-3.5" />
                                    Official artist merch • Limited runs
                                </span>
                                <ShareButton
                                    title={product.title}
                                    className="inline-flex items-center gap-1 underline"
                                />
                            </div>
                        </div> */}

                        <div className="group relative rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden">
                            <div className="relative w-full">
                                {/* Primary / current front (now from activeImage) */}
                                {activeImage ? (
                                    <Image
                                        key={activeImage}
                                        alt={product.title}
                                        src={activeImage}
                                        width={1600}
                                        height={1600}
                                        className={`w-full h-auto object-cover transition-opacity duration-300 ${
                                            // Only let hover flip show when we're currently on *frontImage*
                                            backImage && activeImage === frontImage ? "group-hover:opacity-0" : ""
                                            }`}
                                        priority
                                    />
                                ) : (
                                    <div className="aspect-square grid place-items-center text-neutral-500">
                                        No image
                                    </div>
                                )}

                                {/* Hover image (only if we're on the front image) */}
                                {backImage && activeImage === frontImage ? (
                                    <Image
                                        key={`${backImage}-hover`}
                                        alt={`${product.title} — alternate`}
                                        src={backImage}
                                        width={1600}
                                        height={1600}
                                        className="w-full h-auto object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    />
                                ) : null}
                            </div>

                            {/* label rail stays the same... */}
                            <div className="px-4 py-3 border-t border-neutral-800 bg-neutral-900/70 flex items-center justify-between text-xs">
                                {/* ... */}
                            </div>
                        </div>

                        {/* Thumbs – show whichever is currently active for colour */}
                        {/* {(frontImage || backImage || galleryUrls.length > 1) && (
                            <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar">
                                {frontImage ? (
                                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-neutral-800">
                                        <Image
                                            alt="Front"
                                            src={frontImage}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                ) : null}
                                {backImage ? (
                                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-neutral-800">
                                        <Image
                                            alt="Back"
                                            src={backImage}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                ) : null}
                                {galleryUrls.slice(2).map((u, idx) => (
                                    <div
                                        key={`thumb-extra-${idx}`}
                                        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-neutral-800"
                                    >
                                        <Image alt={`Thumb ${idx + 3}`} src={u} fill className="object-cover" />
                                    </div>
                                ))}
                            </div>
                        )} */}
                        {/* Thumbs – clickable now */}
                        {(frontImage || backImage || galleryUrls.length > 0) && (
                            <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar">
                                {Array.from(
                                    new Set(
                                        [
                                            frontImage,
                                            backImage,
                                            // include the rest of the gallery
                                            //...galleryUrls,
                                        ].filter(Boolean) as string[]
                                    )
                                ).map((u, idx) => {
                                    const isActive = u === activeImage;
                                    return (
                                        <button
                                            key={`thumb-${idx}-${u}`}
                                            type="button"
                                            onClick={() => setActiveImage(u)}
                                            className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border ${isActive ? "border-red-500" : "border-neutral-800"
                                                }`}
                                            aria-label={`View image ${idx + 1}`}
                                        >
                                            <Image alt={`Thumb ${idx + 1}`} src={u} fill className="object-cover" />
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                    </div>

                    {/* BUY COLUMN (client) */}
                    <div className="md:sticky md:top-16 space-y-5">
                        <ProductBuyBox
                            id={product.id}
                            title={product.title}
                            price_cents={product.price_cents}
                            currency={product.currency}
                            image_path={frontImage ?? product.primary_image_url}
                            priceLabel={priceLabel}
                            split4Label={split4Label}
                            colors={colors}
                            // controlled props 👇
                            selectedColorId={selectedColorId}
                            onSelectColor={setSelectedColorId}
                            selectedSize={selectedSize}
                            onSelectSize={setSelectedSize}
                            overrideImage={frontImage ?? null}
                        />

                        {/* Details / Care / Shipping — pure HTML <details> */}
                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900">
                            {[
                                { h: "Details", b: "High-quality print. Soft handfeel. True to size." },
                                { h: "Care", b: "Cold wash inside-out. Do not tumble dry. Do not iron print." },
                                { h: "Shipping", b: "Ships worldwide from Australia. Free express over A$100." },
                            ].map((row, i) => (
                                <details key={i} className="group border-b border-neutral-800 last:border-0">
                                    <summary className="list-none flex items-center justify-between px-4 py-3 cursor-pointer select-none">
                                        <span className="text-sm">{row.h}</span>
                                        <span className="text-xs text-neutral-400 group-open:rotate-90 transition-transform">
                                            ^
                                        </span>
                                    </summary>
                                    <div className="px-4 pb-4 text-sm text-neutral-300">{row.b}</div>
                                </details>
                            ))}
                        </div>

                        {/* tiny promo rail */}
                        <div className="-skew-y-1 bg-neutral-100 text-neutral-900 border border-neutral-200 rounded-xl">
                            <div className="skew-y-1 px-4 py-3 text-sm flex items-center justify-between">
                                <span className="font-medium">You always need more tees!</span>
                                <Link href="/category/tees" className="underline">
                                    Shop tees
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Related (static links) */}
                {Array.isArray(related) && related.length > 0 && (
                    <section className="mt-14">
                        <div className="flex items-end justify-between mb-4">
                            <h3 className="text-xl md:text-2xl font-black">You might also like</h3>
                            <Link href="/#grid" className="text-sm underline">
                                View all
                            </Link>
                        </div>
                        <div className="overflow-x-auto no-scrollbar">
                            <div className="flex gap-4 pr-4">
                                {related.map((p) => (
                                    <Link
                                        key={p.id}
                                        href={`/product/${(p as any).slug ?? p.id}`}
                                        className="min-w-[220px] max-w-[220px] rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden hover:border-neutral-700 transition-colors"
                                        style={{ clipPath: "polygon(6% 0,100% 0,94% 100%,0 100%)" }}
                                    >
                                        <div className="relative h-48 w-full">
                                            {p.primary_image_url ? (
                                                <Image
                                                    src={p.primary_image_url}
                                                    alt={p.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="h-full w-full grid place-items-center text-neutral-500 text-sm">
                                                    No image
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <p className="text-sm truncate">{p.title}</p>
                                            <p className="text-sm text-neutral-400">
                                                {(p.price_cents / 100).toLocaleString("en-AU", {
                                                    style: "currency",
                                                    currency: p.currency,
                                                })}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>
                )}
            </section>

            {/* Sticky mobile bar */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-800 bg-neutral-950/90 backdrop-blur md:hidden">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-neutral-400">{product.title}</p>
                        <p className="text-base font-bold text-red-400">{priceLabel}</p>
                    </div>
                    <div className="min-w-[140px]">
                        {/* ✅ mobile ATC – now uses SAME size/colour as buy box */}
                        <AddToCartButton
                            product_id={product.id}
                            title={product.title}
                            price_cents={product.price_cents}
                            currency={product.currency}
                            image_path={frontImage ?? product.primary_image_url}
                            selectedSize={selectedSize}
                            selectedColor={selectedColor ? selectedColor.hex : null}
                            selectedColorLabel={selectedColor ? selectedColor.label : null}
                            overrideImage={frontImage ?? null}
                            className="relative h-10 px-4 font-black tracking-wide bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 border border-red-500 rounded-xl w-full text-sm"
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}

// tiny React import at top
import * as React from "react";
