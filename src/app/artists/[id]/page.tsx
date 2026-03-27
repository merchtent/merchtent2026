import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import ArtistProductsGrid from "./ArtistProductsGrid";
import TourSection from "@/components/TourSection";
import ArtistReviews from "@/components/ArtistReviews";

export const revalidate = 60;

function artistImage(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artist-images/${path}`;
}

function productImage(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}

export default async function ArtistPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // 🔥 GET ARTIST
    const { data: artist } = await supabase
        .from("artists")
        .select("id, display_name, slug, hero_image_path, bio")
        .eq("slug", id)
        .single();

    if (!artist) {
        return (
            <main className="p-6 max-w-7xl mx-auto">
                <p>Artist not found.</p>
            </main>
        );
    }

    const heroUrl = artistImage(artist.hero_image_path);

    // 🔥 GET PRODUCTS
    const { data: productData } = await supabase
        .from("products")
        .select(`
            id,
            title,
            price_cents,
            slug,
            created_at,
            product_images ( path, sort_order ),
            product_colors ( hex, label, sort_order, front_image_path, back_image_path )
        `)
        .eq("artist_id", artist.id)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

    const products =
        (productData ?? []).map((p: any) => {
            const imgs = (p.product_images ?? []).sort(
                (a: any, b: any) => (a.sort_order ?? 999) - (b.sort_order ?? 999)
            );

            const primary =
                productImage(imgs[0]?.path) ??
                "https://picsum.photos/seed/fallback/900/1200";

            const hover =
                productImage(imgs[1]?.path) ??
                primary;

            const colors = (p.product_colors ?? []).map((c: any) => ({
                hex: c.hex,
                label: c.label,
                front: c.front_image_path
                    ? productImage(c.front_image_path)
                    : primary,
                back: c.back_image_path
                    ? productImage(c.back_image_path)
                    : hover,
            }));

            return {
                id: String(p.id),
                title: p.title,
                price: (p.price_cents ?? 0) / 100,
                image: primary,
                hover,
                slug: p.slug,
                colors,
                sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
                created_at: p.created_at,
            };
        }) ?? [];

    function artistImage(path?: string | null) {
        if (!path) return null;
        return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artist-images/${path}`;
    }

    // 🔥 TOUR DATES
    const today = new Date().toISOString();

    const { data: tourDates } = await supabase
        .from("tour_dates")
        .select("id, artist, venue, city, event_date, ticket_url")
        .eq("artist", artist.id)
        .gte("event_date", today)
        .order("event_date", { ascending: true });

    // 🔥 JOURNAL
    const { data: journals } = await supabase
        .from("journal")
        .select(`
        id,
        title,
        slug,
        created_at,
        artist:artists (
            display_name,
            hero_image_path
        )
    `)
        .eq("artist_id", artist.id)
        .order("created_at", { ascending: false })
        .limit(3);

    return (
        <main className="bg-neutral-950 text-white">

            {/* 🔥 HERO */}
            <section className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">

                {heroUrl && (
                    <img
                        src={heroUrl}
                        alt={artist.display_name}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                )}

                <div className="absolute inset-0 bg-black/60" />
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-neutral-950 to-transparent" />

                <div className="relative z-10 max-w-6xl mx-auto px-4 h-full flex flex-col justify-end pb-10">

                    <p className="uppercase tracking-[0.3em] text-xs text-red-400">
                        Artist
                    </p>

                    <h1 className="text-4xl md:text-6xl font-black leading-[0.95] mt-2">
                        {artist.display_name}
                    </h1>

                    <p className="mt-3 text-neutral-300 max-w-xl">
                        {artist.bio || "Official merch. Limited runs. Built for fans."}
                    </p>

                    {tourDates?.length ? (
                        <span className="inline-block mt-2 text-xs bg-red-600 px-2 py-1 rounded w-fit">
                            ON TOUR
                        </span>
                    ) : null}

                    <div className="mt-5 flex gap-3 flex-wrap">
                        <a
                            href="#products"
                            className="bg-red-600 px-5 py-3 rounded-xl font-bold hover:bg-red-500"
                        >
                            Shop Merch
                        </a>

                        <a
                            href="#tour"
                            className="border border-neutral-600 px-5 py-3 rounded-xl hover:bg-neutral-800"
                        >
                            View Tour
                        </a>
                    </div>

                </div>
            </section>

            <section className="max-w-6xl mx-auto px-4 py-6">

                <div className="grid md:grid-cols-[180px_1fr] gap-4 items-center border border-neutral-800 rounded-2xl bg-neutral-900 overflow-hidden">

                    {/* IMAGE */}
                    <div className="relative h-36 md:h-full">
                        <img
                            src={products[0]?.image}
                            alt={products[0]?.title}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* CONTENT */}
                    <div className="p-4 md:p-5 flex items-center justify-between gap-4">

                        <div>
                            <p className="text-xs uppercase text-neutral-400">
                                Featured Drop
                            </p>

                            <h3 className="text-lg md:text-xl font-black mt-1">
                                {products[0]?.title}
                            </h3>

                            <p className="text-xs md:text-sm text-neutral-400 mt-1">
                                Limited run. Built for fans.
                            </p>
                        </div>

                        <a
                            href={`/product/${products[0]?.slug}`}
                            className="whitespace-nowrap bg-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-500"
                        >
                            Shop →
                        </a>

                    </div>

                </div>

            </section>

            {/* 🔥 PRODUCTS */}
            <section id="products" className="max-w-6xl mx-auto px-4 py-10">
                <h2 className="text-sm uppercase tracking-[0.3em] text-neutral-500 mb-4">
                    Merch
                </h2>

                <ArtistProductsGrid products={products} />
            </section>

            <section className="px-4 py-10 text-center">
                <p className="text-neutral-300">
                    Every purchase directly supports {artist.display_name}.
                </p>

                <p className="text-neutral-500 text-sm mt-2">
                    No middlemen. No bulk waste. Just fans backing artists.
                </p>
            </section>

            <ArtistReviews artistId={artist.id} />

            {/* 🔥 TOUR */}
            <TourSection dates={tourDates ?? []} />

            <section className="max-w-4xl mx-auto px-4 py-10 text-center">
                <h2 className="text-xl font-semibold mb-3">About</h2>

                <p className="text-neutral-300 leading-relaxed">
                    {artist.bio}
                </p>
            </section>

            {/* 🔥 JOURNAL */}
            {journals?.length ? (
                <section className="max-w-6xl mx-auto px-4 pb-12 mt-4">
                    <h2 className="text-sm uppercase tracking-[0.3em] text-neutral-500 mb-4">
                        Journal
                    </h2>

                    <div className="grid md:grid-cols-3 gap-4">
                        {journals.map((j) => {
                            const artistObj = Array.isArray(j.artist) ? j.artist[0] : j.artist;
                            const avatar = artistImage(artistObj?.hero_image_path);
                            return (
                                <Link
                                    key={j.id}
                                    href={`/journal/${j.slug}`}
                                    className="border border-neutral-800 bg-neutral-900 rounded-2xl p-4 hover:bg-neutral-800 transition"
                                >
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-700 flex items-center justify-center text-xs font-bold">
                                        {avatar ? (
                                            <img
                                                src={avatar}
                                                alt={artistObj?.display_name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            artistObj?.display_name.charAt(0)
                                        )}
                                    </div>
                                    <p className="text-xs text-neutral-400">
                                        {new Date(j.created_at).toLocaleDateString()}
                                    </p>

                                    <p className="mt-2 font-semibold">
                                        {j.title}
                                    </p>
                                </Link>
                            )
                        }
                        )}
                    </div>
                </section>
            ) : null}

        </main>
    );
}