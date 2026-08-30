import Image from "next/image";
import Link from "next/link";
import { Plus, ExternalLink, Star } from "lucide-react";

import { getServerSupabase } from "@/lib/supabase/server";
import { publicStorageUrl } from "@/lib/storage";
import ArtistToggleButtons from "@/components/admin/ArtistToggleButtons";

type ArtistOrderItem = {
    title?: string | null;
    unit_price_cents?: number | null;
    qty?: number | null;
    artist_cut_cents?: number | null;
    cashed_out?: boolean | null;
};

export default async function ArtistsPage() {
    const supabase = getServerSupabase();

    const { data: artists, error } = await supabase
        .from("artists")
        .select(`
        id,
        display_name,
        slug,
        bio,
        featured,
        is_public,
        hero_image_path,
        instagram_url,
        spotify_url,
        website_url,

        products (
            id
        ),

        order_items (
            id,
            line_total_cents,
            artist_cut_cents,
            unit_price_cents,
            qty,
            cashed_out
        )
    `)
        .order("display_name");

    if (error) {
        return (
            <div className="m-6 border border-red-900 bg-red-950/20 p-6 text-red-200">
                Failed to load artists
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-black text-white">

            {/* HEADER */}

            <section className="border-b border-neutral-800 p-5 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">Scene roster</p>
                    <h1 className="mt-2 text-5xl font-black uppercase leading-[0.88] md:text-7xl">
                        Artists
                    </h1>

                    <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                        Manage artist storefronts, featured placement, visibility, products and payout signals.
                    </p>
                </div>

                <Link
                    href="/admin/artists/new"
                    className="
                        inline-flex
                        items-center
                        gap-2
                        bg-lime-300
                        hover:bg-lime-200
                        px-5
                        py-3
                        font-black
                        uppercase
                        tracking-[0.08em]
                        text-black
                        transition
                    "
                >
                    <Plus className="h-4 w-4" />
                    New Artist
                </Link>

            </div>
            </section>

            {/* STATS */}

            <section className="grid border-b border-neutral-800 md:grid-cols-3">

                <div className="border-b border-r border-neutral-800 bg-neutral-950 p-5">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                        Total Artists
                    </div>

                    <div className="mt-4 text-4xl font-black">
                        {artists?.length ?? 0}
                    </div>
                </div>

                <div className="border-b border-r border-neutral-800 bg-neutral-950 p-5">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                        Public Artists
                    </div>

                    <div className="mt-4 text-4xl font-black text-lime-300">
                        {
                            artists?.filter(
                                a => a.is_public
                            ).length
                        }
                    </div>
                </div>

                <div className="border-b border-r border-neutral-800 bg-neutral-950 p-5">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                        Featured Artists
                    </div>

                    <div className="mt-4 text-4xl font-black text-red-400">
                        {
                            artists?.filter(
                                a => a.featured
                            ).length
                        }
                    </div>
                </div>

            </section>

            {/* GRID */}

            <section className="grid gap-px bg-neutral-800 p-px md:grid-cols-2 xl:grid-cols-3">

                {artists?.map((artist) => {

                    const image =
                        artist.hero_image_path
                            ? publicStorageUrl("artist-images", artist.hero_image_path)
                            : null;

                    const productCount =
                        artist.products?.length ?? 0;

                    const salesCount =
                        artist.order_items?.length ?? 0;

                    const revenue =
                        artist.order_items?.reduce(
                            (sum: number, item: ArtistOrderItem) =>
                                item.title?.toLowerCase().includes("shipping")
                                    ? sum
                                    : sum + ((item.unit_price_cents ?? 0) * (item.qty ?? 0)),
                            0
                        ) ?? 0;

                    const artistEarnings =
                        artist.order_items?.reduce(
                            (sum: number, item: ArtistOrderItem) =>
                                sum + ((item.artist_cut_cents ?? 0) * (item.qty ?? 0)),
                            0
                        ) ?? 0;

                    const unpaidPayouts =
                        artist.order_items?.reduce(
                            (sum: number, item: ArtistOrderItem) =>
                                sum +
                                (!item.cashed_out
                                    ? (item.artist_cut_cents ?? 0) * (item.qty ?? 0)
                                    : 0),
                            0
                        ) ?? 0;

                    return (
                        <div
                            key={artist.id}
                            className="overflow-hidden bg-black"
                        >

                            {/* HERO */}

                            <div className="relative aspect-[16/8] bg-neutral-800">

                                {image ? (
                                    <Image
                                        src={image}
                                        alt={artist.display_name}
                                        fill
                                        sizes="(max-width:768px) 100vw, (max-width:1280px) 50vw, 33vw"
                                        className="
                                            object-cover
                                        "
                                    />
                                ) : (
                                    <div className="
                                        flex
                                        items-center
                                        justify-center
                                        h-full
                                        text-neutral-600
                                        font-bold
                                    ">
                                        NO HERO IMAGE
                                    </div>
                                )}

                                {artist.featured && (
                                    <div className="
                                        absolute
                                        top-3
                                        right-3
                                        bg-red-600
                                        text-white
                                        px-2
                                        py-1
                                        border
                                        border-red-600
                                        text-xs
                                        font-bold
                                        flex
                                        items-center
                                        gap-1
                                    ">
                                        <Star className="h-3 w-3 fill-current" />
                                        FEATURED
                                    </div>
                                )}

                            </div>

                            {/* CONTENT */}

                            <div className="p-6">

                                <div className="flex items-start justify-between">

                                    <div>

                                        <h2 className="font-black text-xl">
                                            {artist.display_name}
                                        </h2>

                                        <p className="text-neutral-500 text-sm mt-1">
                                            /{artist.slug}
                                        </p>

                                    </div>

                                    <div className="flex gap-2">

                                        <ArtistToggleButtons
                                            artistId={artist.id}
                                            featured={artist.featured}
                                            isPublic={artist.is_public}
                                        />

                                    </div>

                                </div>

                                <div className="mt-5 grid grid-cols-2 gap-px bg-neutral-800">

                                    <div className="bg-neutral-950 p-3">
                                        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                                            Products
                                        </div>

                                        <div className="text-xl font-black">
                                            {productCount}
                                        </div>
                                    </div>

                                    <div className="bg-neutral-950 p-3">
                                        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                                            Sales
                                        </div>

                                        <div className="text-xl font-black">
                                            {salesCount}
                                        </div>
                                    </div>

                                    <div className="bg-neutral-950 p-3">
                                        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                                            Revenue
                                        </div>

                                        <div className="text-lg font-black">
                                            ${(revenue / 100).toFixed(2)}
                                        </div>
                                    </div>

                                    <div className="bg-neutral-950 p-3">
                                        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                                            Earnings
                                        </div>

                                        <div className="text-lg font-black text-lime-300">
                                            ${(artistEarnings / 100).toFixed(2)}
                                        </div>
                                    </div>

                                </div>

                                {unpaidPayouts > 0 && (
                                    <div className="
        mt-4
        border
        border-yellow-600/30
        bg-yellow-500/10
        p-3
    ">
                                        <div className="text-xs text-yellow-400">
                                            UNPAID ARTIST PAYOUT
                                        </div>

                                        <div className="font-black text-yellow-300">
                                            ${(unpaidPayouts / 100).toFixed(2)}
                                        </div>
                                    </div>
                                )}

                                {/* ACTIONS */}

                                <div className="mt-6 flex gap-2">

                                    <Link
                                        href={`/admin/artists/${artist.id}`}
                                        className="
                                            flex-1
                                            text-center
                                            bg-red-600
                                            hover:bg-red-500
                                            px-4
                                            py-2
                                            font-black
                                            uppercase
                                            tracking-[0.08em]
                                            transition
                                        "
                                    >
                                        Manage
                                    </Link>

                                    <Link
                                        href={`/artists/${artist.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="
                                            inline-flex
                                            items-center
                                            justify-center
                                            border
                                            border-neutral-700
                                            px-3
                                            hover:border-neutral-500
                                        "
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </Link>

                                </div>

                            </div>

                        </div>
                    );
                })}

            </section>

        </main>
    );
}
