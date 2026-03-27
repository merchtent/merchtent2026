"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgePercent } from "lucide-react";
import ShareButton from "@/components/ShareButton";
import ProductBuyBox from "@/components/ProductBuyBox";
import AddToCartButton from "@/components/AddToCartButton";
import ProductReviews from "@/components/ProductReviews";
import { motion } from "framer-motion";
import * as React from "react";

type Props = any;

export default function ProductViewClient({
    product,
    galleryUrls,
    colors,
    related,
    priceLabel,
    split4Label
}: Props) {

    const [selectedColorId, setSelectedColorId] = React.useState(
        colors.length ? colors[0].id : null
    );
    const [selectedSize, setSelectedSize] = React.useState("M");

    const selectedColor = colors.find((c: any) => c.id === selectedColorId);

    const frontImage =
        selectedColor?.front_image_url ?? galleryUrls[0] ?? product.primary_image_url;

    const backImage =
        selectedColor?.back_image_url ?? galleryUrls[1] ?? null;

    const [activeImage, setActiveImage] = React.useState(frontImage);

    React.useEffect(() => {
        setActiveImage(frontImage);
    }, [frontImage]);

    const [avgRating, setAvgRating] = React.useState<number | null>(null);
    const [reviewCount, setReviewCount] = React.useState(0);

    React.useEffect(() => {
        (async () => {
            const res = await fetch(`/api/fan-shouts?product_id=${product.id}`);
            const json = await res.json();

            setAvgRating(json.avgRating ?? null);
            setReviewCount(json.count ?? 0);
        })();
    }, [product.id]);

    function GlitchText({ lines }: { lines: string[] }) {
        return (
            <div className="relative font-black">
                {lines.map((t, i) => (
                    <div key={i} className="relative inline-block mr-3">
                        <motion.span
                            className="absolute text-red-500 opacity-40"
                            animate={{ x: [0, 2, -1, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                            {t}
                        </motion.span>
                        <motion.span
                            className="absolute text-cyan-400 opacity-40"
                            animate={{ x: [0, -2, 1, 0] }}
                            transition={{ repeat: Infinity, duration: 1.7 }}
                        >
                            {t}
                        </motion.span>
                        <span>{t}</span>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <main className="bg-neutral-950 text-neutral-100">

            {/* 🔥 HERO */}
            <section className="relative -skew-y-2 overflow-hidden">

                <Link href={`/artists/${product.artist?.slug}`} className="block skew-y-2 group">

                    {/* BG */}
                    {product.artist?.hero_image_path && (
                        <img
                            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artist-images/${product.artist.hero_image_path}`}
                            className="absolute inset-0 w-full h-full object-cover opacity-40 blur-[2px] scale-110 group-hover:scale-115 transition"
                        />
                    )}

                    {/* overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-black/90" />

                    {/* grain */}
                    <div className="absolute inset-0 opacity-[0.05]"
                        style={{
                            backgroundImage:
                                "linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)"
                        }}
                    />

                    <div className="relative max-w-6xl mx-auto px-4 py-6">

                        <div className="flex items-center gap-3 mb-2">

                            {/* avatar */}
                            {product.artist?.hero_image_path && (
                                <img
                                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artist-images/${product.artist.hero_image_path}`}
                                    className="w-10 h-10 rounded-full object-cover border border-white/20"
                                />
                            )}

                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-red-400">
                                    {product.artist?.display_name}
                                </p>
                                <p className="text-xs text-neutral-300">View artist →</p>
                            </div>

                            <span className="ml-auto text-[10px] bg-red-600 px-2 py-0.5 rounded">
                                DROP
                            </span>
                        </div>

                        <h1 className="text-3xl md:text-4xl font-black leading-[0.9] tracking-tight">
                            {product.title}
                        </h1>

                        <p className="text-xs text-neutral-400 mt-1">
                            Limited release • Printed on demand
                        </p>

                    </div>

                </Link>

            </section>

            {/* BODY */}
            <section className="max-w-6xl mx-auto px-4 py-8">

                <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8">

                    {/* IMAGE */}
                    <div className="relative w-full aspect-square rounded-2xl border border-neutral-800 overflow-hidden">

                        {/* FRONT */}
                        {activeImage && (
                            <Image
                                src={activeImage}
                                alt={product.title}
                                fill
                                className="object-cover transition-opacity duration-300"
                            />
                        )}

                        {/* BACK */}
                        {backImage && activeImage === frontImage && (
                            <Image
                                src={backImage}
                                alt="alt"
                                fill
                                className="object-cover opacity-0 hover:opacity-100 transition-opacity duration-300"
                            />
                        )}

                    </div>

                    {/* BUY */}
                    <div className="space-y-4">

                        <div className="text-xs text-red-400">
                            Printed on demand • No waste
                        </div>

                        <ProductBuyBox
                            {...{
                                id: product.id,
                                title: product.title,
                                price_cents: product.price_cents,
                                currency: product.currency,
                                priceLabel,
                                split4Label,
                                colors,
                                selectedColorId,
                                onSelectColor: setSelectedColorId,
                                selectedSize,
                                onSelectSize: setSelectedSize,
                                overrideImage: frontImage,
                                avgRating: avgRating,
                                reviewCount: reviewCount
                            }}
                        />

                        <p className="text-[11px] text-neutral-500">
                            This design may not be restocked
                        </p>

                    </div>

                </div>

                {/* 🔥 STORY */}
                <section className="mt-14 max-w-3xl">
                    <h3 className="text-xl font-black">About this drop</h3>
                    <p className="text-neutral-300 mt-3">
                        Designed by {product.artist?.display_name}, this piece reflects the identity,
                        sound, and energy of the artist. Each item is printed only when ordered,
                        reducing waste while delivering something unique to you.
                    </p>
                </section>

                {/* ⭐ REVIEWS */}
                <ProductReviews productId={product.id} />

                {/* 🎤 MORE FROM ARTIST */}
                {Array.isArray(related) && related.length > 0 && (
                    <section className="mt-14">
                        <h3 className="text-xl font-black mb-4">
                            More from {product.artist?.display_name}
                        </h3>

                        <div className="flex gap-4 overflow-x-auto">
                            {related.map((p: any) => (
                                <Link
                                    key={p.id}
                                    href={`/product/${p.slug ?? p.id}`}
                                    className="min-w-[200px] border border-neutral-800 rounded-xl overflow-hidden hover:-translate-y-1 transition"
                                >
                                    <Image
                                        src={p.primary_image_url}
                                        alt={p.title}
                                        width={400}
                                        height={400}
                                        className="w-full h-48 object-cover"
                                    />
                                    <div className="p-2 text-sm">
                                        {p.title}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

            </section>

            {/* MOBILE BAR */}
            <div className="fixed bottom-0 inset-x-0 md:hidden bg-neutral-950 border-t border-neutral-800 p-3 flex justify-between">
                <div>
                    <p className="text-xs">{product.title}</p>
                    <p className="text-red-400 font-bold">{priceLabel}</p>
                </div>

                <AddToCartButton
                    product_id={product.id}
                    title={product.title}
                    price_cents={product.price_cents}
                    currency={product.currency}
                    selectedSize={selectedSize}
                    selectedColor={selectedColor?.hex}
                    selectedColorLabel={selectedColor?.label ?? null}
                    className="bg-red-600 px-4 rounded-xl"
                />
            </div>

        </main>
    );
}