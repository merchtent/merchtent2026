// app/product/[id]/ProductViewClient.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgePercent } from "lucide-react";
import ShareButton from "@/components/ShareButton";
import ProductBuyBox from "@/components/ProductBuyBox";
import AddToCartButton from "@/components/AddToCartButton";

// tiny React import at top
import * as React from "react";

type ProductViewClientProps = {
    product: {
        id: string;
        title: string;
        description: string | null;
        price_cents: number;
        currency: string;
        primary_image_url: string | null;
        // NEW: category to vary copy
        category?: string | null; // "tees" | "hoodies" | "tanks" | ...
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

// NEW: category → details copy
function getDetailsCopy(categoryRaw?: string | null) {
    const category = (categoryRaw || "").toLowerCase();

    if (category.includes("hoodie")) {
        return [
            "Mid-weight fleece hoodie designed for everyday warmth with a relaxed, unisex fit.",
            "Ribbed cuffs and hem, double-layer hood, and a soft brushed interior for comfort.",
            "Print-on-demand: your hoodie is made to order to reduce overproduction and waste."
        ];
    }

    if (category.includes("tank")) {
        return [
            "Lightweight tank with a breathable, athletic feel — ideal for warm days or layering.",
            "Slightly elongated torso with a clean armhole finish for comfort and movement.",
            "Print-on-demand: we make your tank after you order, so it arrives freshly printed."
        ];
    }

    // default → tees
    return [
        "Soft, breathable tee with a clean, modern fit — built for everyday wear.",
        "Smooth hand-feel with durable, vivid print that holds up wash after wash.",
        "Print-on-demand: this tee is made to order, reducing waste and overproduction."
    ];
}

export default function ProductViewClient({
    product,
    galleryUrls,
    colors,
    related,
    priceLabel,
    split4Label
}: ProductViewClientProps) {
    // ✅ shared state
    const [selectedColorId, setSelectedColorId] = React.useState<string | null>(
        colors.length ? colors[0].id : null
    );
    const [selectedSize, setSelectedSize] = React.useState<string | null>("XS");

    const selectedColor = colors.find((c) => c.id === selectedColorId) || null;

    // choose front/back image based on colour, falling back to original gallery
    const frontImage =
        selectedColor?.front_image_url ?? galleryUrls[0] ?? product.primary_image_url;
    const backImage = selectedColor?.back_image_url ?? galleryUrls[1] ?? null;

    // 👉 Track which image is currently "main"
    const [activeImage, setActiveImage] = React.useState<string | null>(
        frontImage ?? product.primary_image_url ?? null
    );

    // When colour changes, reset main image to the colour's front
    React.useEffect(() => {
        setActiveImage(frontImage ?? product.primary_image_url ?? null);
    }, [frontImage, product.primary_image_url]);

    // NEW: precompute category copy
    const detailsCopy = getDetailsCopy(product.category);

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
                                        className={`w-full h-auto object-cover transition-opacity duration-300 ${backImage && activeImage === frontImage
                                                ? "group-hover:opacity-0"
                                                : ""
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

                            {/* label rail (kept minimal) */}
                            <div className="px-4 py-3 border-t border-neutral-800 bg-neutral-900/70 flex items-center justify-between text-xs">
                                <span className="inline-flex items-center gap-1 text-neutral-300">
                                    <BadgePercent className="h-3.5 w-3.5" />
                                    Official artist merch • Limited runs
                                </span>
                                <ShareButton title={product.title} className="inline-flex items-center gap-1 underline" />
                            </div>
                        </div>

                        {/* Thumbs – clickable */}
                        {(frontImage || backImage || galleryUrls.length > 0) && (
                            <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar">
                                {Array.from(
                                    new Set(
                                        [
                                            frontImage,
                                            backImage
                                            // ...galleryUrls // (uncomment if you want more thumbs)
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

                        {/* Details / Care / Shipping — HTML <details> */}
                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900">
                            {/* DETAILS — open by default and uses product.description + category copy */}
                            <details open className="group border-b border-neutral-800">
                                <summary className="list-none flex items-center justify-between px-4 py-3 cursor-pointer select-none">
                                    <span className="text-sm">Details</span>
                                    <span className="text-xs text-neutral-400 group-open:rotate-90 transition-transform">
                                        ^
                                    </span>
                                </summary>
                                <div className="px-4 pb-4 text-sm text-neutral-300 space-y-3">
                                    {/* Safely render the merchant-provided description first (if any) */}
                                    {product.description && product.description.trim().length > 0 ? (
                                        product.description
                                            .split(/\n{2,}|\r\n\r\n/)
                                            .map((para, i) => (
                                                <p key={`desc-${i}`} className="whitespace-pre-wrap">
                                                    {para.trim()}
                                                </p>
                                            ))
                                    ) : (
                                        <p>High-quality print. Soft hand-feel. True to size.</p>
                                    )}

                                    {/* Category-specific helpful bullets */}
                                    <ul className="list-disc pl-5 space-y-1">
                                        {detailsCopy.map((line, i) => (
                                            <li key={`dc-${i}`}>{line}</li>
                                        ))}
                                    </ul>
                                </div>
                            </details>

                            {/* CARE — expanded */}
                            <details className="group border-b border-neutral-800">
                                <summary className="list-none flex items-center justify-between px-4 py-3 cursor-pointer select-none">
                                    <span className="text-sm">Care</span>
                                    <span className="text-xs text-neutral-400 group-open:rotate-90 transition-transform">
                                        ^
                                    </span>
                                </summary>
                                <div className="px-4 pb-4 text-sm text-neutral-300 space-y-2">
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>Cold gentle wash inside-out with similar colours.</li>
                                        <li>Avoid bleach and fabric softeners to preserve the print.</li>
                                        <li>Do not tumble dry; line dry in shade to minimise shrinkage.</li>
                                        <li>Cool iron inside-out if needed. Do not iron the print.</li>
                                        <li>For best longevity, wash less and spot-clean when possible.</li>
                                    </ul>
                                </div>
                            </details>

                            {/* SHIPPING — updated pricing, keep free express over A$100 */}
                            <details className="group border-b border-neutral-800">
                                <summary className="list-none flex items-center justify-between px-4 py-3 cursor-pointer select-none">
                                    <span className="text-sm">Shipping</span>
                                    <span className="text-xs text-neutral-400 group-open:rotate-90 transition-transform">
                                        ^
                                    </span>
                                </summary>
                                <div className="px-4 pb-4 text-sm text-neutral-300 space-y-2">
                                    <p>Ships worldwide from Australia.</p>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>Standard: A$10</li>
                                        <li>Express: A$20</li>
                                        <li>Free **express** on orders over A$100</li>
                                    </ul>
                                    <p>Tracking provided for all orders. Times vary by destination.</p>
                                </div>
                            </details>

                            {/* NEW: Sizing & Fit */}
                            <details className="group border-b border-neutral-800">
                                <summary className="list-none flex items-center justify-between px-4 py-3 cursor-pointer select-none">
                                    <span className="text-sm">Sizing &amp; Fit</span>
                                    <span className="text-xs text-neutral-400 group-open:rotate-90 transition-transform">
                                        ^
                                    </span>
                                </summary>
                                <div className="px-4 pb-4 text-sm text-neutral-300 space-y-2">
                                    <p>Unisex sizing. Choose your usual size for a regular fit.</p>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>Prefer an oversized look? Size up.</li>
                                        <li>Between sizes? Check the size guide in the buy box.</li>
                                        <li>Garment measurements may vary by 2–3% due to production.</li>
                                    </ul>
                                </div>
                            </details>

                            {/* NEW: Returns & Exchanges */}
                            <details className="group">
                                <summary className="list-none flex items-center justify-between px-4 py-3 cursor-pointer select-none">
                                    <span className="text-sm">Returns &amp; Exchanges</span>
                                    <span className="text-xs text-neutral-400 group-open:rotate-90 transition-transform">
                                        ^
                                    </span>
                                </summary>
                                <div className="px-4 pb-4 text-sm text-neutral-300 space-y-2">
                                    <p>
                                        We accept returns for manufacturing defects or misprints.
                                        Because items are made to order, change-of-mind returns are limited.
                                    </p>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>Contact us within 14 days of delivery with your order number.</li>
                                        <li>Item must be unworn and unwashed.</li>
                                        <li>We’ll replace faulty items or issue a refund where applicable.</li>
                                    </ul>
                                </div>
                            </details>
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
                                                    currency: p.currency
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
                        {/* ✅ mobile ATC – uses SAME size/colour as buy box */}
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
