import Link from "next/link";
import { Plus, ExternalLink, Star } from "lucide-react";

import { getServerSupabase } from "@/lib/supabase/server";
import ArtistToggleButtons from "@/components/admin/ArtistToggleButtons";

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
            <div className="p-8">
                Failed to load artists
            </div>
        );
    }

    const togglePublic = async (id: string) => {
        await fetch(
            `/api/admin/artists/${id}/toggle-public`,
            {
                method: "POST",
            }
        );

        window.location.reload();
    };

    const toggleFeatured = async (id: string) => {
        await fetch(
            `/api/admin/artists/${id}/toggle-featured`,
            {
                method: "POST",
            }
        );

        window.location.reload();
    };

    return (
        <div className="space-y-8 px-6 py-6">

            {/* HEADER */}

            <div className="flex items-center justify-between">

                <div>
                    <h1 className="text-4xl font-black">
                        Artists
                    </h1>

                    <p className="mt-2 text-neutral-400">
                        Manage artist storefronts, profiles and merch.
                    </p>
                </div>

                <Link
                    href="/admin/artists/new"
                    className="
                        inline-flex
                        items-center
                        gap-2
                        bg-red-600
                        hover:bg-red-500
                        px-4
                        py-3
                        rounded-xl
                        font-semibold
                        transition
                    "
                >
                    <Plus className="h-4 w-4" />
                    New Artist
                </Link>

            </div>

            {/* STATS */}

            <div className="grid md:grid-cols-3 gap-4">

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                    <div className="text-neutral-500 text-sm">
                        Total Artists
                    </div>

                    <div className="mt-2 text-3xl font-black">
                        {artists?.length ?? 0}
                    </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                    <div className="text-neutral-500 text-sm">
                        Public Artists
                    </div>

                    <div className="mt-2 text-3xl font-black">
                        {
                            artists?.filter(
                                a => a.is_public
                            ).length
                        }
                    </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                    <div className="text-neutral-500 text-sm">
                        Featured Artists
                    </div>

                    <div className="mt-2 text-3xl font-black">
                        {
                            artists?.filter(
                                a => a.featured
                            ).length
                        }
                    </div>
                </div>

            </div>

            {/* GRID */}

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

                {artists?.map((artist) => {

                    const image =
                        artist.hero_image_path
                            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artist-images/${encodeURIComponent(
                                artist.hero_image_path
                            )}`
                            : null;

                    const productCount =
                        artist.products?.length ?? 0;

                    const salesCount =
                        artist.order_items?.length ?? 0;

                    const revenue =
                        artist.order_items?.reduce(
                            (sum: number, item: any) =>
                                item.title?.toLowerCase().includes("shipping")
                                    ? sum
                                    : sum + ((item.unit_price_cents ?? 0) * (item.qty ?? 0)),
                            0
                        ) ?? 0;

                    const artistEarnings =
                        artist.order_items?.reduce(
                            (sum: number, item: any) =>
                                sum + (item.artist_cut_cents * item.qty),
                            0
                        ) ?? 0;

                    const unpaidPayouts =
                        artist.order_items?.reduce(
                            (sum: number, item: any) =>
                                sum +
                                (!item.cashed_out
                                    ? item.artist_cut_cents * item.qty
                                    : 0),
                            0
                        ) ?? 0;

                    return (
                        <div
                            key={artist.id}
                            className="
                                rounded-2xl
                                overflow-hidden
                                border
                                border-neutral-800
                                bg-neutral-900
                            "
                        >

                            {/* HERO */}

                            <div className="relative aspect-[16/8] bg-neutral-800">

                                {image ? (
                                    <img
                                        src={image}
                                        alt={artist.display_name}
                                        className="
                                            w-full
                                            h-full
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
                                        rounded-lg
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

                                <div className="mt-5 grid grid-cols-2 gap-3">

                                    <div className="rounded-lg bg-neutral-800 p-3">
                                        <div className="text-xs text-neutral-500">
                                            Products
                                        </div>

                                        <div className="text-xl font-black">
                                            {productCount}
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-neutral-800 p-3">
                                        <div className="text-xs text-neutral-500">
                                            Sales
                                        </div>

                                        <div className="text-xl font-black">
                                            {salesCount}
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-neutral-800 p-3">
                                        <div className="text-xs text-neutral-500">
                                            Revenue
                                        </div>

                                        <div className="text-lg font-black">
                                            ${(revenue / 100).toFixed(2)}
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-neutral-800 p-3">
                                        <div className="text-xs text-neutral-500">
                                            Earnings
                                        </div>

                                        <div className="text-lg font-black text-green-400">
                                            ${(artistEarnings / 100).toFixed(2)}
                                        </div>
                                    </div>

                                </div>

                                {unpaidPayouts > 0 && (
                                    <div className="
        mt-4
        rounded-lg
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
                                            rounded-xl
                                            bg-red-600
                                            hover:bg-red-500
                                            px-4
                                            py-2
                                            font-semibold
                                            transition
                                        "
                                    >
                                        Manage
                                    </Link>

                                    <Link
                                        href={`/${artist.slug}`}
                                        target="_blank"
                                        className="
                                            inline-flex
                                            items-center
                                            justify-center
                                            rounded-xl
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

            </div>

        </div>
    );
}