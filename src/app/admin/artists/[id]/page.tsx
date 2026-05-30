import { notFound } from "next/navigation";
import Link from "next/link";

import { getServerSupabase } from "@/lib/supabase/server";
import ArtistToggleButtons from "@/components/admin/ArtistToggleButtons";

function money(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
}

export default async function ArtistPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const supabase = getServerSupabase();

    const { data: artist } = await supabase
        .from("artists")
        .select(`
            *,
            products (
                id,
                title,
                price_cents,
                is_published
            ),
            order_items (
                id,
                qty,
                line_total_cents,
                artist_cut_cents,
                unit_price_cents,
                cashed_out,
                created_at,
                orders (
                    id,
                    order_number,
                    status
                )
            )
        `)
        .eq("id", id)
        .single();

    if (!artist) {
        notFound();
    }

    const productCount =
        artist.products?.length ?? 0;

    const salesCount =
        artist.order_items?.length ?? 0;

    const revenue =
        artist.order_items?.reduce(
            (sum: number, item: any) =>
                sum + (item.unit_price_cents * item.qty),
            0
        ) ?? 0;

    const earnings =
        artist.order_items?.reduce(
            (sum: number, item: any) =>
                sum + (item.artist_cut_cents * item.qty),
            0
        ) ?? 0;

    const unpaid =
        artist.order_items?.reduce(
            (sum: number, item: any) =>
                sum +
                (
                    !item.cashed_out
                        ? item.artist_cut_cents * item.qty
                        : 0
                ),
            0
        ) ?? 0;

    return (
        <div className="space-y-8 py-6 px-6">

            {/* HEADER */}

            <div className="flex items-start justify-between">

                <div>

                    <Link
                        href="/admin/artists"
                        className="text-neutral-400 hover:text-white text-sm"
                    >
                        ← Back to Artists
                    </Link>

                    <h1 className="mt-3 text-4xl font-black">
                        {artist.display_name}
                    </h1>

                    <p className="text-neutral-500 mt-2">
                        /{artist.slug}
                    </p>

                    <Link style={{ marginTop: 16 }}
                        href={`/admin/artists/${artist.id}/edit`}
                        className="
        inline-flex
        items-center
        gap-2
        bg-red-600
        hover:bg-red-500
        px-4
        py-2
        rounded-xl
        font-semibold
        transition
    "
                    >
                        Edit Artist
                    </Link>





                </div>



                <ArtistToggleButtons
                    artistId={artist.id}
                    featured={artist.featured}
                    isPublic={artist.is_public}
                />



            </div>

            {/* STATS */}

            <div className="grid md:grid-cols-5 gap-4">

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                    <div className="text-xs text-neutral-500">
                        Products
                    </div>

                    <div className="text-3xl font-black mt-2">
                        {productCount}
                    </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                    <div className="text-xs text-neutral-500">
                        Sales
                    </div>

                    <div className="text-3xl font-black mt-2">
                        {salesCount}
                    </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                    <div className="text-xs text-neutral-500">
                        Revenue
                    </div>

                    <div className="text-3xl font-black mt-2">
                        {money(revenue)}
                    </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                    <div className="text-xs text-neutral-500">
                        Earnings
                    </div>

                    <div className="text-3xl font-black mt-2 text-green-400">
                        {money(earnings)}
                    </div>
                </div>

                <div className="rounded-2xl border border-yellow-600/20 bg-yellow-500/10 p-5">
                    <div className="text-xs text-yellow-400">
                        Unpaid
                    </div>

                    <div className="text-3xl font-black mt-2 text-yellow-300">
                        {money(unpaid)}
                    </div>
                </div>

            </div>

            {/* DETAILS */}

            <div className="grid lg:grid-cols-2 gap-6">

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

                    <h2 className="font-black text-xl mb-4">
                        Artist Details
                    </h2>

                    <div className="space-y-4">

                        <div>
                            <div className="text-xs text-neutral-500">
                                Display Name
                            </div>

                            <div>
                                {artist.display_name}
                            </div>
                        </div>

                        <div>
                            <div className="text-xs text-neutral-500">
                                Slug
                            </div>

                            <div>
                                {artist.slug}
                            </div>
                        </div>

                        <div>
                            <div className="text-xs text-neutral-500">
                                Bio
                            </div>

                            <div className="text-neutral-300">
                                {artist.bio || "No bio provided"}
                            </div>
                        </div>

                    </div>

                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

                    <h2 className="font-black text-xl mb-4">
                        Social Links
                    </h2>

                    <div className="space-y-4">

                        <div>
                            <div className="text-xs text-neutral-500">
                                Instagram
                            </div>

                            <div>
                                {artist.instagram_url || "-"}
                            </div>
                        </div>

                        <div>
                            <div className="text-xs text-neutral-500">
                                Spotify
                            </div>

                            <div>
                                {artist.spotify_url || "-"}
                            </div>
                        </div>

                        <div>
                            <div className="text-xs text-neutral-500">
                                Website
                            </div>

                            <div>
                                {artist.website_url || "-"}
                            </div>
                        </div>

                    </div>

                </div>

            </div>

            {/* PRODUCTS */}

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

                <h2 className="font-black text-xl mb-6">
                    Products
                </h2>

                <div className="space-y-3">

                    {artist.products?.map((product: any) => (
                        <div
                            key={product.id}
                            className="flex items-center justify-between border border-neutral-800 rounded-xl p-4"
                        >
                            <div>

                                <div className="font-semibold">
                                    {product.title}
                                </div>

                                <div className="text-sm text-neutral-500">
                                    {money(product.price_cents)}
                                </div>

                            </div>

                            <span
                                className={
                                    product.is_published
                                        ? "text-green-400 text-sm"
                                        : "text-neutral-500 text-sm"
                                }
                            >
                                {product.is_published
                                    ? "Published"
                                    : "Draft"}
                            </span>

                        </div>
                    ))}

                </div>

            </div>

            {/* RECENT ORDERS */}

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

                <h2 className="font-black text-xl mb-6">
                    Recent Sales
                </h2>

                <div className="space-y-3">

                    {artist.order_items
                        ?.sort(
                            (a: any, b: any) =>
                                new Date(
                                    b.created_at
                                ).getTime() -
                                new Date(
                                    a.created_at
                                ).getTime()
                        )
                        .slice(0, 10)
                        .map((item: any) => (
                            <div
                                key={item.id}
                                className="flex justify-between border border-neutral-800 rounded-xl p-4"
                            >
                                <div>

                                    <div className="font-semibold">
                                        {
                                            item.orders
                                                ?.order_number
                                        }
                                    </div>

                                    <div className="text-sm text-neutral-500">
                                        {
                                            item.orders
                                                ?.status
                                        }
                                    </div>

                                </div>

                                <div className="font-black">
                                    {money(
                                        item.line_total_cents ??
                                        0
                                    )}
                                </div>

                            </div>
                        ))}

                </div>

            </div>

        </div>
    );
}