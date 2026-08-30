import Link from "next/link";
import Image from "next/image";
import CategoryClient from "./CategoryClient";
import type { ReactNode } from "react";
import { publicImageUrl, publicStorageUrl } from "@/lib/storage";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";
import { logger } from "@/lib/logger";
import { publicCatalogProductQuery } from "@/lib/catalog/public-product-query";
import { ArrowRight, Flame, Package, Shirt } from "lucide-react";

export const revalidate = 60;

type ProductImageRow = {
    path?: string | null;
    sort_order?: number | null;
};

type ProductArtistRow = {
    display_name?: string | null;
    slug?: string | null;
    hero_image_path?: string | null;
};

type ProductRow = {
    id: string;
    title?: string | null;
    price_cents?: number | null;
    slug?: string | null;
    created_at?: string | null;
    product_images?: ProductImageRow[] | null;
    artist?: ProductArtistRow | null;
};

const categoryCopy: Record<string, { title: string; kicker: string; body: string; image: string }> = {
    tees: {
        title: "Tees",
        kicker: "Front-row staples",
        body: "Artist tees, fresh drop graphics, and the kind of shirts that come home from the gig with a story.",
        image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=80",
    },
    hoodies: {
        title: "Hoodies",
        kicker: "Cold-night merch",
        body: "Warm layers for late load-outs, winter shows, outdoor queues, and fans backing the band after dark.",
        image: "https://images.unsplash.com/photo-1521336575822-6da63fb45455?auto=format&fit=crop&w=1800&q=80",
    },
    hats: {
        title: "Hats",
        kicker: "Top shelf",
        body: "Caps and headwear for merch tables, festival days, and everyday scene signals.",
        image: "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=1800&q=80",
    },
    tanks: {
        title: "Tank Tops",
        kicker: "Pit ready",
        body: "Sleeveless summer merch for hot rooms, festival days, and the front half of the crowd.",
        image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80",
    },
    vinyl: {
        title: "Vinyl",
        kicker: "Record crate energy",
        body: "Records, collector drops, and music-first pieces from artists building their own world.",
        image: "https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?auto=format&fit=crop&w=1800&q=80",
    },
    posters: {
        title: "Posters",
        kicker: "Flyer wall finds",
        body: "Wall pieces, tour art, and print drops that feel like a venue noticeboard made permanent.",
        image: "https://images.unsplash.com/photo-1478147427282-58a87a120781?auto=format&fit=crop&w=1800&q=80",
    },
};

export default async function CategoryPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const supabase = getPublicServerSupabase();

    const { data, error } = await publicCatalogProductQuery(supabase
        .from("products")
        .select(`
            id,
            title,
            price_cents,
            slug,
            category,
            created_at,
            product_images ( path, sort_order ),
            artist:artists (
                display_name,
                slug,
                hero_image_path
            )
        `)
    )
        .eq("category", slug)
        .order("created_at", { ascending: false });

    if (error) {
        logger.error("Category page failed to load products", {
            category: slug,
            error: error.message,
        });

        return (
            <main className="p-6 max-w-7xl mx-auto">
                <p className="text-red-400">Could not load this category right now.</p>
            </main>
        );
    }

    const products = ((data ?? []) as ProductRow[]).map((p) => {
        const imgs = (p.product_images ?? []).sort(
            (a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999)
        );

        const primary = publicImageUrl(imgs[0]?.path);
        const hover = publicImageUrl(imgs[1]?.path) ?? primary;

        return {
            id: String(p.id),
            title: p.title ?? "Untitled product",
            price: (p.price_cents ?? 0) / 100,
            image: primary,
            hover,
            slug: p.slug ?? String(p.id),

            // ✅ ARTIST DATA
            artist: p.artist?.display_name ?? null,
            artist_slug: p.artist?.slug ?? null,
            artist_image: publicStorageUrl("artist-images", p.artist?.hero_image_path),

            created_at: p.created_at ?? undefined,
        };
    });

    const copy = categoryCopy[slug] ?? {
        title: String(slug).replace(/-/g, " "),
        kicker: "Shop the rack",
        body: "Browse artist merch from the scene.",
        image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=80",
    };
    const title = copy.title.toUpperCase();

    return (
        <main className="bg-black text-neutral-100">
            <section className="relative overflow-hidden border-b border-neutral-800 bg-black">
                <div className="absolute inset-0">
                    <Image
                        src={copy.image}
                        alt=""
                        fill
                        sizes="100vw"
                        priority
                        className="object-cover opacity-48"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/78 to-black/40" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(190,242,100,0.18),transparent_25%),linear-gradient(115deg,rgba(255,255,255,0.06)_0_1px,transparent_1px_28px)] opacity-50" />
                </div>

                <div className="relative mx-auto max-w-[1680px] px-4 py-10 md:px-8 md:py-16">
                    <nav className="mb-10 text-xs font-black uppercase tracking-[0.18em] text-neutral-400">
                        <Link href="/" className="hover:text-lime-300">Home</Link>
                        <span className="mx-2 text-red-500">/</span>
                        <span className="text-white">{title}</span>
                    </nav>

                    <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-end">
                        <div>
                            <p className="inline-flex items-center gap-2 bg-lime-300 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-black">
                                <Flame className="h-3.5 w-3.5" />
                                {copy.kicker}
                            </p>
                            <h1 className="mt-5 max-w-5xl text-6xl font-black uppercase leading-[0.88] tracking-tight md:text-8xl xl:text-9xl">
                                {title}
                            </h1>
                            <p className="mt-6 max-w-2xl text-base leading-7 text-neutral-200 md:text-lg">
                                {copy.body}
                            </p>
                        </div>

                        <div className="grid gap-px bg-neutral-800 sm:grid-cols-3 lg:grid-cols-1">
                            <HeroStat icon={<Shirt className="h-4 w-4" />} value={String(products.length)} label="Live products" />
                            <HeroStat icon={<Package className="h-4 w-4" />} value="Made" label="After checkout" />
                            <HeroStat icon={<ArrowRight className="h-4 w-4" />} value="Artist" label="Paid per order" />
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-[#f2f0ea] text-black">
                <div className="mx-auto max-w-[1680px] px-4 py-10 md:px-8 md:py-14">
                    <div className="mb-8 grid gap-5 md:grid-cols-[0.85fr_1.15fr] md:items-end">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-600">
                                Category rack
                            </p>
                            <h2 className="mt-2 text-5xl font-black uppercase leading-none md:text-7xl">
                                Shop {copy.title}.
                            </h2>
                        </div>
                        <p className="max-w-2xl text-sm leading-6 text-neutral-700 md:justify-self-end">
                            Filter by artist, sort by price or newest, and open the product page when something hits.
                        </p>
                    </div>
                    <CategoryClient initialProducts={products} />
                </div>
            </section>
        </main>
    );
}

function HeroStat({
    icon,
    value,
    label,
}: {
    icon: ReactNode;
    value: string;
    label: string;
}) {
    return (
        <div className="bg-black/78 p-5 backdrop-blur">
            <div className="text-lime-300">{icon}</div>
            <p className="mt-3 text-3xl font-black leading-none text-white">{value}</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">{label}</p>
        </div>
    );
}
