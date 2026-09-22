"use client";

import Image from "next/image";
import Link from "next/link";
import ProductBuyBox from "@/components/ProductBuyBox";
import AddToCartButton from "@/components/AddToCartButton";
import ProductReviews from "@/components/ProductReviews";
import { publicStorageUrl } from "@/lib/storage";
import * as React from "react";
import { ArrowRight, Disc3 } from "lucide-react";
import SavedToggleButton from "@/components/SavedToggleButton";
import { trackMarketingEvent } from "@/lib/marketing/events";
import ProductImageGallery, { type ProductGalleryImage } from "@/components/shop/ProductImageGallery";

type Artist = {
    id?: string | null;
    slug?: string | null;
    display_name?: string | null;
    hero_image_path?: string | null;
};

type ColorOption = {
    id: string;
    hex: string;
    label: string;
    front_image_url: string | null;
    back_image_url: string | null;
};

type Product = {
    id: string;
    slug?: string | null;
    title: string;
    description?: string | null;
    price_cents: number;
    currency: string;
    primary_image_url?: string | null;
    artist?: Artist | null;
};

type RelatedProduct = {
    id: string;
    slug?: string | null;
    title: string;
    price_cents?: number | null;
    currency?: string | null;
    primary_image_url: string | null;
};

type ProductSpec = {
    label: string;
    value: string;
};

type Props = {
    product: Product;
    galleryUrls: string[];
    colors: ColorOption[];
    related: RelatedProduct[];
    priceLabel: string;
    split4Label: string;
    specs?: ProductSpec[];
    initialWishlisted?: boolean;
    initialArtistSaved?: boolean;
};

export default function ProductViewClient({
    product,
    galleryUrls,
    colors,
    related,
    priceLabel,
    split4Label,
    specs = [],
    initialWishlisted = false,
    initialArtistSaved = false,
}: Props) {
    const [selectedColorId, setSelectedColorId] = React.useState(
        colors.length ? colors[0].id : null
    );
    const [selectedSize, setSelectedSize] = React.useState("M");
    const [avgRating, setAvgRating] = React.useState<number | null>(null);
    const [reviewCount, setReviewCount] = React.useState(0);
    const imageRef = React.useRef<HTMLDivElement | null>(null);

    const selectedColor = colors.find((c) => c.id === selectedColorId);
    const frontImage =
        selectedColor?.front_image_url ?? galleryUrls[0] ?? product.primary_image_url;
    const backImage = selectedColor?.back_image_url ?? null;
    const galleryImages: ProductGalleryImage[] = [];
    const seenImages = new Set<string>();
    const addGalleryImage = (src: string | null | undefined, label: string) => {
        if (!src || seenImages.has(src)) return;
        seenImages.add(src);
        galleryImages.push({ id: `view-${galleryImages.length}`, src, label });
    };
    addGalleryImage(frontImage, "Front");
    if (!selectedColor || selectedColor.id === colors[0]?.id) {
        galleryUrls.forEach((src, index) => {
            addGalleryImage(src, src === backImage ? "Back" : index === 0 ? "Front" : `View ${galleryImages.length + 1}`);
        });
    }
    addGalleryImage(backImage, "Back");

    React.useEffect(() => {
        trackMarketingEvent("view_item", {
            currency: product.currency,
            value_cents: product.price_cents,
            items: [{
                item_id: product.id,
                item_name: product.title,
                price_cents: product.price_cents,
                currency: product.currency,
                quantity: 1,
            }],
        });
    }, [product.currency, product.id, product.price_cents, product.title]);

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            const res = await fetch(`/api/fan-shouts?product_id=${product.id}`);
            const json = await res.json();

            if (!mounted) return;
            setAvgRating(json.avgRating ?? null);
            setReviewCount(json.count ?? 0);
        })().catch(() => {
            if (!mounted) return;
            setAvgRating(null);
            setReviewCount(0);
        });

        return () => {
            mounted = false;
        };
    }, [product.id]);

    React.useEffect(() => {
        const isMobile = window.innerWidth < 768;
        if (!isMobile || !imageRef.current) return;

        const y = imageRef.current.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: "smooth" });
    }, [selectedColorId]);

    const artistHeroUrl = product.artist?.hero_image_path
        ? publicStorageUrl("artist-images", product.artist.hero_image_path)
        : null;
    const artistHref = product.artist?.slug ? `/artists/${product.artist.slug}` : "/artists";

    return (
        <main className="bg-black text-neutral-100">
            <section className="relative overflow-hidden border-b border-neutral-800 px-4 py-8 md:px-8 md:py-14">
                <div className="absolute inset-0">
                    <Image
                        src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2200&q=80"
                        alt=""
                        fill
                        sizes="100vw"
                        className="object-cover opacity-38"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/88 to-black/62" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_18%,rgba(190,242,100,0.16),transparent_28%),linear-gradient(115deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_18px)] opacity-45" />
                </div>

                <div className="relative mx-auto grid max-w-[1680px] gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10">
                    <div className="order-2 border border-neutral-800 bg-black/72 p-5 shadow-[16px_16px_0_rgba(190,242,100,0.08)] md:p-8 lg:order-1">
                        <div>
                            <Link
                                href={artistHref}
                                className="group inline-flex items-center gap-3 border border-neutral-700 bg-black/65 p-2 pr-4 hover:border-lime-300"
                            >
                                {artistHeroUrl ? (
                                    <Image
                                        src={artistHeroUrl}
                                        alt={product.artist?.display_name ?? ""}
                                        width={44}
                                        height={44}
                                        className="h-11 w-11 object-cover"
                                    />
                                ) : (
                                    <span className="grid h-11 w-11 place-items-center bg-red-600">
                                        <Disc3 className="h-5 w-5" />
                                    </span>
                                )}
                                <span>
                                    <span className="block text-[11px] font-black uppercase text-red-400">
                                        Artist drop
                                    </span>
                                    <span className="block text-sm font-black text-white group-hover:text-lime-300">
                                        {product.artist?.display_name ?? "Merch Tent artist"}
                                    </span>
                                </span>
                                <ArrowRight className="h-4 w-4 text-lime-300 transition group-hover:translate-x-1" />
                            </Link>
                            {product.artist?.id ? (
                                <div className="mt-3">
                                    <SavedToggleButton
                                        type="artist"
                                        id={product.artist.id}
                                        initialSaved={initialArtistSaved}
                                        variant="ghost"
                                    />
                                </div>
                            ) : null}

                            <p className="mt-12 inline-flex bg-lime-300 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-black">
                                Live from the table
                            </p>
                            <h1 className="mt-6 max-w-3xl text-4xl font-black uppercase leading-[0.92] md:text-5xl xl:text-6xl">
                                {product.title}
                            </h1>
                            <p className="mt-6 max-w-2xl text-sm leading-7 text-neutral-300 md:text-base">
                                {product.description ||
                                    `A made-after-sale drop from ${product.artist?.display_name ?? "the artist"}, built for fans backing the scene early.`}
                            </p>

                            <div className="mt-8 grid gap-5 border border-neutral-800 bg-neutral-950/85 p-4 md:grid-cols-[1fr_auto] md:items-center md:p-5">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-lime-300">Made after sale</p>
                                    <p className="mt-1 text-sm leading-6 text-neutral-400">
                                        Pick your colour and size, earn fan credits, and back the artist directly.
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <p className="text-4xl font-black text-lime-300">{priceLabel}</p>
                                    <SavedToggleButton
                                        type="product"
                                        id={product.id}
                                        initialSaved={initialWishlisted}
                                        variant="ghost"
                                    />
                                </div>
                            </div>

                            <div className="mt-6">
                                <ProductBuyBox
                                    id={product.id}
                                    title={product.title}
                                    price_cents={product.price_cents}
                                    currency={product.currency}
                                    priceLabel={priceLabel}
                                    split4Label={split4Label}
                                    colors={colors}
                                    selectedColorId={selectedColorId}
                                    onSelectColor={(id) => {
                                        setSelectedColorId(id);
                                    }}
                                    selectedSize={selectedSize}
                                    onSelectSize={setSelectedSize}
                                    overrideImage={frontImage}
                                    avgRating={avgRating}
                                    reviewCount={reviewCount}
                                    showHeader={false}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="order-1 lg:order-2">
                        <ProductImageGallery
                            key={selectedColorId ?? "default"}
                            images={galleryImages}
                            title={product.title}
                            containerRef={imageRef}
                        />
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800">
                <div className="grid md:grid-cols-2 lg:grid-cols-4">
                    <InfoBlock
                        kicker="About this drop"
                        title="Made for the room, not a warehouse."
                        body={`Designed by ${product.artist?.display_name ?? "the artist"}, this piece carries the identity of the drop without forcing artists to hold boxes of stock.`}
                    />
                    <InfoBlock
                        kicker="Production"
                        title="Printed after the fan backs it."
                        body="The order keeps the design data, colour, size, and product context together so fulfilment can move without guessing."
                    />
                    <InfoBlock
                        kicker="Support"
                        title="Artist paid per order."
                        body="Fans get a real product and credits. Artists get a clearer path from design to sale."
                    />
                    <InfoBlock
                        kicker="Delivery"
                        title="Tracked once shipped."
                        body="Checkout captures fulfilment-grade details, and order pages keep fans updated after purchase."
                    />
                </div>
            </section>

            {specs.length ? (
                <section className="border-b border-neutral-800 bg-neutral-950">
                    <div className="grid lg:grid-cols-[0.75fr_1.25fr]">
                        <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                            <p className="text-[11px] font-black uppercase text-red-400">Product specs</p>
                            <h2 className="mt-3 text-4xl font-black uppercase leading-none">
                                The blank stays backstage.
                            </h2>
                            <p className="mt-4 text-sm leading-6 text-neutral-400">
                                The shop title stays artist-first. These details are here for fit, print and fulfilment
                                confidence.
                            </p>
                        </div>
                        <div className="grid sm:grid-cols-2">
                            {specs.map((spec) => (
                                <div key={spec.label} className="border-b border-r border-neutral-800 p-5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                                        {spec.label}
                                    </p>
                                    <p className="mt-2 text-xl font-black uppercase text-white">{spec.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            ) : null}

            <section className="border-b border-neutral-800 bg-black p-5 md:p-8">
                <ProductReviews productId={product.id} />
            </section>

            {Array.isArray(related) && related.length > 0 ? (
                <section className="border-b border-neutral-800 bg-neutral-950">
                    <div className="border-b border-neutral-800 p-5 md:p-8">
                        <p className="text-[11px] font-black uppercase text-red-400">More from the artist</p>
                        <h2 className="mt-2 text-4xl font-black uppercase leading-none">
                            Keep digging.
                        </h2>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4">
                        {related.filter((p) => p.primary_image_url).map((p) => (
                            <Link
                                key={p.id}
                                href={`/product/${p.slug ?? p.id}`}
                                className="group border-b border-r border-neutral-800 bg-black transition hover:bg-neutral-900"
                            >
                                <div className="relative aspect-square bg-[url('https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80')] bg-cover bg-center">
                                    <div className="absolute inset-0 bg-black/35" />
                                    <div className="absolute inset-5 bg-white/90" />
                                    <Image
                                        src={p.primary_image_url ?? ""}
                                        alt={p.title}
                                        fill
                                        sizes="(max-width: 1024px) 50vw, 25vw"
                                        className="relative z-10 object-contain p-8 transition duration-300 group-hover:scale-105"
                                    />
                                </div>
                                <div className="border-t border-neutral-800 p-4">
                                    <p className="line-clamp-2 min-h-[2.5rem] font-black leading-tight">{p.title}</p>
                                    <p className="mt-3 inline-flex items-center gap-2 text-sm font-black text-red-400">
                                        View drop <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            ) : null}

            <div className="fixed bottom-0 inset-x-0 z-40 flex items-center gap-3 border-t border-neutral-800 bg-neutral-950 p-3 md:hidden">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs">{product.title}</p>
                    <p className="font-bold text-lime-300">{priceLabel}</p>
                </div>

                <AddToCartButton
                    product_id={product.id}
                    title={product.title}
                    price_cents={product.price_cents}
                    currency={product.currency}
                    selectedColor={selectedColor?.hex ?? null}
                    selectedColorLabel={selectedColor?.label ?? null}
                    selectedSize={selectedSize}
                    overrideImage={frontImage ?? selectedColor?.front_image_url ?? null}
                    className="flex-shrink-0 whitespace-nowrap border border-lime-200 bg-lime-300 px-5 py-3 font-black text-black shadow-lg shadow-lime-900/20"
                />
            </div>
        </main>
    );
}

function InfoBlock({
    kicker,
    title,
    body,
}: {
    kicker: string;
    title: string;
    body: string;
}) {
    return (
        <div className="min-h-[250px] border-b border-r border-neutral-800 bg-black p-5 transition hover:bg-neutral-950 md:p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-lime-300">{kicker}</p>
            <h3 className="mt-4 text-3xl font-black uppercase leading-none">{title}</h3>
            <p className="mt-4 text-sm leading-6 text-neutral-400">{body}</p>
        </div>
    );
}
