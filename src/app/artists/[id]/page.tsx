import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import ArtistProductsGrid from "./ArtistProductsGrid";
import TourSection from "@/components/TourSection";
import ArtistReviews from "@/components/ArtistReviews";
import SavedToggleButton from "@/components/SavedToggleButton";
import { publicImageUrl, publicStorageUrl } from "@/lib/storage";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";
import { publicCatalogProductQuery } from "@/lib/catalog/public-product-query";
import { ArrowRight, CalendarDays, Camera, Disc3, Heart, ShoppingBag, Star } from "lucide-react";

export const revalidate = 60;

type ProductImageRow = {
    path: string | null;
    sort_order: number | null;
};

type ProductColorRow = {
    hex: string | null;
    label: string | null;
    sort_order: number | null;
    front_image_path: string | null;
    back_image_path: string | null;
};

type ProductRow = {
    id: string;
    title: string | null;
    price_cents: number | null;
    slug: string | null;
    created_at: string | null;
    product_images: ProductImageRow[] | null;
    product_colors: ProductColorRow[] | null;
};

export default async function ArtistPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const supabase = getPublicServerSupabase();

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


    const heroUrl = publicStorageUrl("artist-images", artist.hero_image_path);

    const { data: artistPhotos } = await supabase
        .from("artist_photos")
        .select("id, image_path, caption")
        .eq("artist_id", artist.id)
        .eq("is_featured", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(6);

    // 🔥 GET PRODUCTS
    const { data: productData } = await publicCatalogProductQuery(supabase
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
    )
        .eq("artist_id", artist.id)
        .order("created_at", { ascending: false });

    const products =
        ((productData ?? []) as ProductRow[]).map((p) => {
            const imgs = (p.product_images ?? []).sort(
                (a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999)
            );

            const primary =
                publicImageUrl(imgs[0]?.path) ??
                "/merch-placeholder.svg";

            const hover =
                publicImageUrl(imgs[1]?.path) ??
                primary;

            const colors = (p.product_colors ?? []).map((c) => ({
                hex: c.hex ?? "#111111",
                label: c.label ?? "Default",
                front: c.front_image_path
                    ? publicImageUrl(c.front_image_path)
                    : primary,
                back: c.back_image_path
                    ? publicImageUrl(c.back_image_path)
                    : hover,
            }));

            return {
                id: String(p.id),
                title: p.title ?? "Untitled product",
                price: (p.price_cents ?? 0) / 100,
                image: primary,
                hover,
                slug: p.slug ?? p.id,
                colors,
                sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
                created_at: p.created_at ?? undefined,
            };
        }) ?? [];

    // 🔥 TOUR DATES
    const today = new Date().toISOString();

    const { data: tourDates } = await supabase
        .from("tour_dates")
        .select("id, artist, venue, city, event_date, ticket_url")
        .eq("artist", artist.display_name)
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

    const photoUrls =
        (artistPhotos ?? [])
            .map((photo) => ({
                id: photo.id,
                url: publicStorageUrl("artist-images", photo.image_path),
                caption: photo.caption,
            }))
            .filter((photo): photo is { id: string; url: string; caption: string | null } => Boolean(photo.url));

    const mainHeroImage = photoUrls[0]?.url ?? heroUrl ?? "/merch-placeholder.svg";
    const sideHeroImages = [photoUrls[1]?.url, photoUrls[2]?.url, products[0]?.image, heroUrl].filter(
        (image): image is string => Boolean(image)
    );
    const featuredProducts = products.slice(0, 4);

    return (
        <main className="bg-black text-white">
            <section className="relative overflow-hidden border-b border-neutral-800 bg-black">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(190,242,100,0.16),transparent_25%),radial-gradient(circle_at_82%_18%,rgba(239,0,0,0.22),transparent_26%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.06)_0_1px,transparent_1px_28px)] opacity-40" />

                <div className="relative mx-auto grid min-h-[78vh] max-w-[1680px] gap-px bg-neutral-800 lg:grid-cols-[1.02fr_0.98fr]">
                    <div className="relative flex min-h-[560px] flex-col justify-end overflow-hidden bg-black p-5 md:p-8 lg:p-10">
                        <Image
                            src={mainHeroImage}
                            alt={artist.display_name}
                            fill
                            sizes="(max-width: 1024px) 100vw, 52vw"
                            priority
                            className="object-cover opacity-72"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/58 to-black/10" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/35 to-transparent" />

                        <div className="relative z-10 max-w-4xl">
                            <div className="mb-5 flex flex-wrap items-center gap-3">
                                <span className="bg-lime-300 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-black">
                                    Artist page
                                </span>
                                {tourDates?.length ? (
                                    <span className="inline-flex items-center gap-2 border border-white/20 bg-black/55 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white">
                                        <CalendarDays className="h-3.5 w-3.5 text-lime-300" />
                                        Live dates listed
                                    </span>
                                ) : null}
                            </div>

                            <h1 className="max-w-5xl text-5xl font-black uppercase leading-[0.88] tracking-tight md:text-7xl xl:text-8xl">
                                {artist.display_name}
                            </h1>
                            <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-100 md:text-lg">
                                {artist.bio || "Official merch, live photos and new drops from the artist, all in one place."}
                            </p>

                            <div className="mt-7 flex flex-wrap gap-3">
                                <a
                                    href="#products"
                                    className="inline-flex items-center gap-2 bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-500"
                                >
                                    Shop merch <ArrowRight className="h-4 w-4" />
                                </a>
                                <a
                                    href="#photos"
                                    className="inline-flex items-center gap-2 border border-white/30 bg-black/40 px-5 py-3 text-sm font-black text-white transition hover:border-lime-300 hover:text-lime-300"
                                >
                                    See photos <Camera className="h-4 w-4" />
                                </a>
                                <SavedToggleButton type="artist" id={artist.id} variant="ghost" />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-px bg-neutral-800 md:grid-cols-2 lg:grid-cols-1">
                        <div className="grid grid-cols-2 gap-px bg-neutral-800">
                            {sideHeroImages.slice(0, 4).map((image, index) => (
                                <div key={`${image}-${index}`} className="relative min-h-[190px] overflow-hidden bg-neutral-950 md:min-h-[250px]">
                                    <Image
                                        src={image}
                                        alt={`${artist.display_name} scene ${index + 1}`}
                                        fill
                                        sizes="(max-width: 1024px) 50vw, 24vw"
                                        className="object-cover transition duration-700 hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/18" />
                                    <span className="absolute left-3 top-3 bg-black/75 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-lime-300">
                                        {index < 2 ? "Live photo" : "Drop"}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="grid content-between bg-[#f2f0ea] p-5 text-black md:p-7 lg:min-h-[300px]">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-600">Back the artist</p>
                                <h2 className="mt-2 text-4xl font-black uppercase leading-none md:text-5xl">
                                    Photos, drops and the room around them.
                                </h2>
                                <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-700">
                                    Follow the artist, save favourites, and buy merch that keeps the scene moving after the show.
                                </p>
                            </div>

                            <div className="mt-6 grid grid-cols-3 gap-px bg-black text-white">
                                <StatCard icon={<ShoppingBag className="h-4 w-4" />} value={String(products.length)} label="Products" />
                                <StatCard icon={<Camera className="h-4 w-4" />} value={String(photoUrls.length)} label="Photos" />
                                <StatCard icon={<Heart className="h-4 w-4" />} value="Save" label="Artist" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {featuredProducts.length ? (
                <section className="border-b border-neutral-800 bg-black">
                    <div className="mx-auto max-w-[1680px] px-4 py-10 md:px-8 md:py-14">
                        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">Fresh from the table</p>
                                <h2 className="mt-2 text-4xl font-black uppercase leading-none md:text-6xl">Current merch.</h2>
                            </div>
                            <a href="#products" className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-lime-300">
                                View all <ArrowRight className="h-4 w-4" />
                            </a>
                        </div>
                        <div className="grid gap-px bg-neutral-800 md:grid-cols-2 xl:grid-cols-4">
                            {featuredProducts.map((product, index) => (
                                <Link
                                    key={product.id}
                                    href={`/product/${product.slug}`}
                                    className="group bg-[#f2f0ea] text-black transition hover:bg-white"
                                >
                                    <div className="relative aspect-[4/3] overflow-hidden">
                                        <Image
                                            src={product.image}
                                            alt={product.title}
                                            fill
                                            sizes="(max-width: 768px) 100vw, 25vw"
                                            className="object-contain p-8 transition duration-500 group-hover:scale-105"
                                        />
                                        <span className={`absolute left-4 top-4 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${index === 0 ? "bg-red-600 text-white" : "bg-lime-300 text-black"}`}>
                                            {index === 0 ? "Counter pick" : "Artist drop"}
                                        </span>
                                    </div>
                                    <div className="border-t border-black/15 p-4">
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-600">{artist.display_name}</p>
                                        <h3 className="mt-2 line-clamp-2 min-h-[2.4rem] font-black leading-tight">{product.title}</h3>
                                        <p className="mt-3 text-lg font-black text-lime-700">${product.price.toFixed(2)}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            ) : null}

            {photoUrls.length ? (
                <section id="photos" className="border-b border-neutral-800 bg-[#f2f0ea] text-black">
                    <div className="mx-auto max-w-[1680px] px-4 py-12 md:px-8 md:py-16">
                        <div className="mb-7 max-w-4xl">
                            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-600">Real artist feed</p>
                            <h2 className="mt-2 text-5xl font-black uppercase leading-none md:text-7xl">Real photos. Real room.</h2>
                            <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-700">
                                A living gallery from {artist.display_name}, pulled into the store so the merch feels connected to real shows.
                            </p>
                        </div>

                        <div className="grid gap-px bg-black/20 md:grid-cols-3">
                            {photoUrls.map((photo, index) => (
                                <article key={photo.id} className={`bg-black text-white ${index === 0 ? "md:col-span-2 md:row-span-2" : ""}`}>
                                    <div className={`relative ${index === 0 ? "aspect-[16/10] md:h-full" : "aspect-[4/3]"}`}>
                                        <Image
                                            src={photo.url}
                                            alt={photo.caption || `${artist.display_name} photo`}
                                            fill
                                            sizes={index === 0 ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 100vw, 33vw"}
                                            className="object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/76 via-transparent to-transparent" />
                                        <span className="absolute left-4 top-4 bg-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
                                            Photo {String(index + 1).padStart(2, "0")}
                                        </span>
                                        <p className="absolute bottom-4 left-4 right-4 text-sm font-black leading-5 md:text-base">
                                            {photo.caption || `${artist.display_name} behind the drop.`}
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>
            ) : null}

            <section id="products" className="border-b border-neutral-800 bg-black px-4 py-12 md:px-8 md:py-16">
                <div className="mx-auto max-w-[1680px]">
                    <div className="mb-8 grid gap-5 md:grid-cols-[0.8fr_1.2fr] md:items-end">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-500">Artist shop</p>
                            <h2 className="mt-2 text-5xl font-black uppercase leading-none md:text-7xl">Shop the drop.</h2>
                        </div>
                        <p className="max-w-2xl text-sm leading-6 text-neutral-400 md:justify-self-end">
                            Every order supports {artist.display_name}. Products are made after checkout, so the artist can launch without stacks of unsold boxes.
                        </p>
                    </div>

                    <ArtistProductsGrid products={products} />
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-black">
                <div className="grid md:grid-cols-3">
                    <ArtistValueBlock icon={<ShoppingBag className="h-5 w-5" />} title="Merch fans can actually buy" body="Products, sizes, colours and pricing live where fans expect them." />
                    <ArtistValueBlock icon={<Star className="h-5 w-5" />} title="Scene proof, not stock photos" body="Artist photos give the page a real pulse beyond product tiles." />
                    <ArtistValueBlock icon={<Disc3 className="h-5 w-5" />} title="Built after checkout" body="The drop can stay live without forcing bands to guess demand upfront." />
                </div>
            </section>

            <ArtistReviews artistId={artist.id} />

            <TourSection dates={tourDates ?? []} />

            <section className="border-b border-neutral-800 bg-[#f2f0ea] text-black">
                <div className="mx-auto grid max-w-[1680px] gap-px bg-black/20 md:grid-cols-[0.75fr_1.25fr]">
                    <div className="bg-[#f2f0ea] p-6 md:p-10">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-600">About the artist</p>
                        <h2 className="mt-3 text-5xl font-black uppercase leading-none md:text-7xl">The story behind the rack.</h2>
                    </div>
                    <div className="bg-white p-6 md:p-10">
                        <p className="max-w-3xl text-lg leading-8 text-neutral-800">
                            {artist.bio || `${artist.display_name} is building a merch presence for fans who want to back the scene directly.`}
                        </p>
                    </div>
                </div>
            </section>

            {journals?.length ? (
                <section className="border-b border-neutral-800 bg-black px-4 py-12 md:px-8 md:py-16">
                    <div className="mx-auto max-w-[1680px]">
                        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">Backstage notes</p>
                                <h2 className="mt-2 text-4xl font-black uppercase leading-none md:text-6xl">Journal.</h2>
                            </div>
                        </div>

                        <div className="grid gap-px bg-neutral-800 md:grid-cols-3">
                            {journals.map((j) => {
                                const artistObj = Array.isArray(j.artist) ? j.artist[0] : j.artist;
                                const avatar = publicStorageUrl("artist-images", artistObj?.hero_image_path);
                                return (
                                    <Link
                                        key={j.id}
                                        href={`/journal/${j.slug}`}
                                        className="group bg-neutral-950 p-5 transition hover:bg-neutral-900 md:p-6"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="grid h-12 w-12 place-items-center overflow-hidden bg-neutral-800 text-sm font-black">
                                                {avatar ? (
                                                    <Image
                                                        src={avatar}
                                                        alt={artistObj?.display_name ?? ""}
                                                        width={48}
                                                        height={48}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    artistObj?.display_name?.charAt(0)
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-lime-300">
                                                    {new Date(j.created_at).toLocaleDateString("en-AU")}
                                                </p>
                                                <p className="text-xs text-neutral-500">{artistObj?.display_name}</p>
                                            </div>
                                        </div>
                                        <p className="mt-5 text-xl font-black leading-tight group-hover:text-lime-300">
                                            {j.title}
                                        </p>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </section>
            ) : null}
        </main>
    );
}

function StatCard({
    icon,
    value,
    label,
}: {
    icon: ReactNode;
    value: string;
    label: string;
}) {
    return (
        <div className="bg-black p-4">
            <div className="text-lime-300">{icon}</div>
            <p className="mt-3 text-2xl font-black leading-none">{value}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">{label}</p>
        </div>
    );
}

function ArtistValueBlock({
    icon,
    title,
    body,
}: {
    icon: ReactNode;
    title: string;
    body: string;
}) {
    return (
        <div className="border-b border-r border-neutral-800 bg-black p-6 md:p-8">
            <div className="text-lime-300">{icon}</div>
            <h3 className="mt-5 text-3xl font-black uppercase leading-none">{title}</h3>
            <p className="mt-4 max-w-md text-sm leading-6 text-neutral-400">{body}</p>
        </div>
    );
}
