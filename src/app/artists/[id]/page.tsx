// app/artists/[id]/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import ArtistProductsGrid from "./ArtistProductsGrid";
import { ArrowLeft, Globe, Instagram, Music, Radio } from "lucide-react";

export const revalidate = 60;

function isUuidLike(s: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        s
    );
}

function publicImageUrl(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${encodeURIComponent(
        path
    )}`;
}

function publicArtistImageUrl(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artist-images/${encodeURIComponent(
        path
    )}`;
}

function initials(name: string | null) {
    const n = (name || "").trim();
    if (!n) return "??";
    const parts = n.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "??";
}

export default async function ArtistDetail({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = getServerSupabase();

    // ---- 1) try to load with extended fields ----
    let artist: {
        id: string;
        display_name: string | null;
        slug: string | null;
        hero_image_path: string | null;
        bio?: string | null;
        facebook_url?: string | null;
        instagram_url?: string | null;
        bandcamp_url?: string | null;
        spotify_url?: string | null;
        website_url?: string | null;
    } | null = null;
    let artistErr: any = null;

    {
        let q = supabase
            .from("artists_public")
            .select(
                `
          id,
          display_name,
          slug,
          hero_image_path,
          bio,
          facebook_url,
          instagram_url,
          bandcamp_url,
          spotify_url,
          website_url
        `
            )
            .limit(1);

        q = isUuidLike(id) ? q.eq("id", id) : q.eq("slug", id);

        const { data, error } = await q.maybeSingle();
        if (!error) {
            artist = data;
        } else {
            artistErr = error;
        }
    }

    // ---- 2) fallback to the minimal shape if those columns don’t exist ----
    if (!artist) {
        let q = supabase
            .from("artists_public")
            .select("id, display_name, slug, hero_image_path")
            .limit(1);
        q = isUuidLike(id) ? q.eq("id", id) : q.eq("slug", id);
        const { data, error } = await q.maybeSingle();
        if (error) {
            artistErr = error;
        }
        artist = data;
    }

    if (artistErr) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                ARTIST // ERROR
                            </h1>
                        </div>
                    </div>
                </section>
                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        <p className="text-red-400">Error: {artistErr.message}</p>
                        <div className="mt-4">
                            <Link
                                href="/artists"
                                className="underline inline-flex items-center gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" /> Back to artists
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    if (!artist) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                Artist not found
                            </h1>
                        </div>
                    </div>
                </section>
                <div className="max-w-5xl mx-auto px-4 py-10">
                    <Link
                        className="underline inline-flex items-center gap-2"
                        href="/artists"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to artists
                    </Link>
                </div>
            </main>
        );
    }

    const heroUrl = artist.hero_image_path
        ? publicArtistImageUrl(artist.hero_image_path)
        : null;

    // ---- products for this artist ----
    const { data: products, error: prodErr } = await supabase
        .from("products")
        .select(
            `
      id,
      title,
      slug,
      price_cents,
      currency,
      is_published,
      product_images:product_images ( path, sort_order, side ),
      product_colors:product_colors ( hex, label, sort_order, front_image_path, back_image_path )
    `
        )
        .eq("artist_id", artist.id)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

    if (prodErr) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                {artist.display_name ?? "Artist"}
                            </h1>
                        </div>
                    </div>
                </section>
                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        <p className="text-red-400">
                            Error loading products: {prodErr.message}
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    const items =
        products?.map((p) => {
            const imgs = Array.isArray(p.product_images)
                ? [...p.product_images].sort(
                    (a, b) => (a?.sort_order ?? 999) - (b?.sort_order ?? 999)
                )
                : [];
            const baseFront =
                publicImageUrl(imgs[0]?.path) ??
                "https://picsum.photos/seed/fallback1/900/1200";
            const baseBack = publicImageUrl(imgs[1]?.path) ?? baseFront;

            const colors = Array.isArray(p.product_colors)
                ? [...p.product_colors]
                    .sort(
                        (a, b) => (a?.sort_order ?? 999) - (b?.sort_order ?? 999)
                    )
                    .map((c) => ({
                        hex: c.hex ?? "#111111",
                        label: c.label ?? "",
                        front: c.front_image_path
                            ? publicImageUrl(c.front_image_path)
                            : baseFront,
                        back: c.back_image_path
                            ? publicImageUrl(c.back_image_path)
                            : baseBack,
                    }))
                : [];

            const rotationImages: string[] = [];
            if (baseFront) rotationImages.push(baseFront);
            if (baseBack) rotationImages.push(baseBack);
            for (const col of colors) {
                if (col.front) rotationImages.push(col.front);
                if (col.back) rotationImages.push(col.back);
            }

            return {
                id: String(p.id),
                title: p.title as string,
                slug: p.slug as string | null,
                price: (p.price_cents ?? 0) / 100,
                currency: p.currency ?? "AUD",
                image: baseFront,
                hover: baseBack,
                colors,
                rotationImages: rotationImages.length ? rotationImages : [baseFront],
            };
        }) ?? [];

    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* Hero / header */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-6xl mx-auto px-4 pt-8 pb-10 flex items-start justify-between gap-6">
                        <div className="flex items-start gap-4">
                            {/* round avatar that uses hero image */}
                            <div className="relative h-16 w-16 rounded-full overflow-hidden bg-neutral-900 text-white grid place-items-center font-black shrink-0">
                                {heroUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={heroUrl}
                                        alt={artist.display_name ?? "Artist"}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    initials(artist.display_name)
                                )}
                            </div>
                            <div>
                                <p className="uppercase tracking-[0.25em] text-[10px] text-red-600">
                                    Artist
                                </p>
                                <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                    {artist.display_name ?? "Artist"}
                                </h1>
                                {/* short bio snippet */}
                                <p className="mt-2 text-sm text-neutral-600 max-w-2xl">
                                    {artist.bio
                                        ? artist.bio
                                        : "Independent artist. Drops, collabs and live merch. Follow to get the next run."}
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/artists"
                            className="underline text-sm inline-flex items-center gap-2 mt-1"
                        >
                            <ArrowLeft className="h-4 w-4" /> All artists
                        </Link>
                    </div>
                </div>
            </section>

            {/* Content: 2-column layout → products + about/links */}
            <section className="max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-[1.1fr_0.4fr] gap-8 items-start">
                {/* products */}
                <div>
                    <h2 className="text-sm uppercase tracking-[0.3em] text-neutral-500 mb-3">
                        Products
                    </h2>
                    <ArtistProductsGrid products={items} />
                </div>

                {/* side panel */}
                <aside className="space-y-5">
                    {/* About */}
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                        <h3 className="text-sm uppercase tracking-[0.25em] text-neutral-400">
                            About
                        </h3>
                        <p className="mt-3 text-sm text-neutral-200 leading-relaxed">
                            {artist.bio
                                ? artist.bio
                                : "This artist hasn’t added a full bio yet. Merch on this page is officially published by the artist."}
                        </p>
                    </div>

                    {/* Links */}
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-2">
                        <h3 className="text-sm uppercase tracking-[0.25em] text-neutral-400">
                            Links
                        </h3>
                        <ul className="space-y-2 text-sm">
                            {artist.website_url ? (
                                <li>
                                    <Link
                                        href={artist.website_url}
                                        className="inline-flex items-center gap-2 text-neutral-100 hover:underline"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Globe className="h-4 w-4" /> Website
                                    </Link>
                                </li>
                            ) : null}
                            {artist.facebook_url ? (
                                <li>
                                    <Link
                                        href={artist.facebook_url}
                                        className="inline-flex items-center gap-2 text-neutral-100 hover:underline"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Instagram className="h-4 w-4" /> Facebook
                                    </Link>
                                </li>
                            ) : null}
                            {artist.instagram_url ? (
                                <li>
                                    <Link
                                        href={artist.instagram_url}
                                        className="inline-flex items-center gap-2 text-neutral-100 hover:underline"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Instagram className="h-4 w-4" /> Instagram
                                    </Link>
                                </li>
                            ) : null}
                            {artist.bandcamp_url ? (
                                <li>
                                    <Link
                                        href={artist.bandcamp_url}
                                        className="inline-flex items-center gap-2 text-neutral-100 hover:underline"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Music className="h-4 w-4" /> Bandcamp
                                    </Link>
                                </li>
                            ) : null}
                            {artist.spotify_url ? (
                                <li>
                                    <Link
                                        href={artist.spotify_url}
                                        className="inline-flex items-center gap-2 text-neutral-100 hover:underline"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Radio className="h-4 w-4" /> Spotify
                                    </Link>
                                </li>
                            ) : null}
                            {/* fallback if no links */}
                            {!artist.website_url &&
                                !artist.instagram_url &&
                                !artist.bandcamp_url &&
                                !artist.spotify_url ? (
                                <li className="text-neutral-500 text-xs">
                                    No links added yet.
                                </li>
                            ) : null}
                        </ul>
                    </div>
                </aside>
            </section>
        </main>
    );
}
