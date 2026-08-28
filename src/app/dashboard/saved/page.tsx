import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowRight, Bell, Heart, MapPin, Package, Search, Star } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { publicImageUrl, publicStorageUrl } from "@/lib/storage";
import SavedToggleButton from "@/components/SavedToggleButton";
import AddressFormClient, { type DefaultAddress } from "./AddressFormClient";

export const revalidate = 0;

type SavedArtistRow = {
    created_at: string;
    artist: {
        id: string;
        display_name: string | null;
        slug: string | null;
        hero_image_path: string | null;
        bio: string | null;
    } | {
        id: string;
        display_name: string | null;
        slug: string | null;
        hero_image_path: string | null;
        bio: string | null;
    }[] | null;
};

type WishlistRow = {
    created_at: string;
    product: {
        id: string;
        title: string | null;
        slug: string | null;
        price_cents: number | null;
        currency: string | null;
        product_images?: { path: string | null; sort_order: number | null }[] | null;
        artist?: { display_name: string | null; slug: string | null } | { display_name: string | null; slug: string | null }[] | null;
    } | {
        id: string;
        title: string | null;
        slug: string | null;
        price_cents: number | null;
        currency: string | null;
        product_images?: { path: string | null; sort_order: number | null }[] | null;
        artist?: { display_name: string | null; slug: string | null } | { display_name: string | null; slug: string | null }[] | null;
    }[] | null;
};

function fmtMoney(cents: number | null, currency = "AUD") {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format((cents ?? 0) / 100);
}

function firstJoined<T>(value: T | T[] | null | undefined): T | null {
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function DashboardSavedPage() {
    const supabase = getServerSupabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/auth/sign-in");

    const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

    if (!profile?.onboarding_completed) redirect("/account/setup");

    const [{ data: savedArtists }, { data: wishlist }, { data: defaultAddress }] = await Promise.all([
        supabase
            .from("saved_artists")
            .select(`
                created_at,
                artist:artists (
                    id,
                    display_name,
                    slug,
                    hero_image_path,
                    bio
                )
            `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        supabase
            .from("wishlisted_products")
            .select(`
                created_at,
                product:products (
                    id,
                    title,
                    slug,
                    price_cents,
                    currency,
                    product_images ( path, sort_order ),
                    artist:artists (
                        display_name,
                        slug
                    )
                )
            `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        supabase
            .from("customer_addresses")
            .select("id, label, first_name, last_name, line1, line2, city, state, postal_code, country, phone")
            .eq("user_id", user.id)
            .eq("is_default", true)
            .maybeSingle(),
    ]);

    const artistRows = (savedArtists ?? []) as unknown as SavedArtistRow[];
    const wishlistRows = (wishlist ?? []) as unknown as WishlistRow[];

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 bg-black p-5 md:p-8">
                <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                    <Heart className="h-4 w-4" />
                    Saved scene
                </p>
                <h1 className="mt-3 max-w-4xl text-5xl font-black uppercase leading-[0.86] md:text-7xl">
                    Your favourite bands and drops.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                    Keep artists close, park merch for later, and save your usual delivery address so checkout is faster next time.
                </p>
            </section>

            <section className="grid border-b border-neutral-800 md:grid-cols-2 xl:grid-cols-4">
                <SavedCard
                    icon={<Star className="h-5 w-5" />}
                    title="Saved artists"
                    body="Follow the artists you want to keep backing. Their drops stay easy to find from your account."
                    action="Browse artists"
                    href="/artists"
                />
                <SavedCard
                    icon={<Package className="h-5 w-5" />}
                    title="Wishlist"
                    body="Save products you want to come back to before payday, show night, or your next bundle."
                    action="Shop new drops"
                    href="/new"
                />
                <SavedCard
                    icon={<MapPin className="h-5 w-5" />}
                    title="Delivery address"
                    body="Store your default shipping details once, then let checkout load them when you are signed in."
                    action="Update address"
                    href="#delivery-address"
                />
                <SavedCard
                    icon={<Bell className="h-5 w-5" />}
                    title="Help and preferences"
                    body="Find support quickly and keep future drop alerts, order updates, and credit reminders under control."
                    action="Contact support"
                    href="/contact"
                />
            </section>

            <section className="grid border-b border-neutral-800 lg:grid-cols-2">
                <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                                Saved artists
                            </p>
                            <h2 className="mt-2 text-4xl font-black uppercase leading-none">Bands you&apos;re backing.</h2>
                        </div>
                        <Link href="/artists" className="hidden text-sm font-black text-red-400 hover:text-red-300 md:inline-flex">
                            Find more
                        </Link>
                    </div>

                    <div className="mt-6 space-y-3">
                        {artistRows.length ? (
                            artistRows.map((row) => {
                                const artist = firstJoined(row.artist);
                                return artist ? (
                                <div key={artist.id} className="grid grid-cols-[88px_1fr] overflow-hidden border border-neutral-800 bg-neutral-950">
                                    <Link href={`/artists/${artist.slug ?? artist.id}`} className="relative min-h-24 bg-neutral-900">
                                        {artist.hero_image_path ? (
                                            <Image
                                                src={publicStorageUrl("artist-images", artist.hero_image_path) ?? "/merch-placeholder.svg"}
                                                alt={artist.display_name ?? "Saved artist"}
                                                fill
                                                sizes="88px"
                                                className="object-cover"
                                            />
                                        ) : null}
                                    </Link>
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <Link href={`/artists/${artist.slug ?? artist.id}`} className="font-black uppercase hover:text-red-300">
                                                {artist.display_name ?? "Artist"}
                                            </Link>
                                            <SavedToggleButton type="artist" id={artist.id} initialSaved variant="icon" />
                                        </div>
                                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-400">
                                            {artist.bio ?? "Saved to your scene list."}
                                        </p>
                                    </div>
                                </div>
                                ) : null;
                            })
                        ) : (
                            <EmptyPanel
                                title="No saved artists yet."
                                body="Save bands from artist pages and they will show up here."
                                href="/artists"
                                action="Browse artists"
                            />
                        )}
                    </div>
                </div>

                <div className="p-5 md:p-8">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                                Wishlist
                            </p>
                            <h2 className="mt-2 text-4xl font-black uppercase leading-none">Drops for later.</h2>
                        </div>
                        <Link href="/new" className="hidden text-sm font-black text-red-400 hover:text-red-300 md:inline-flex">
                            Shop more
                        </Link>
                    </div>

                    <div className="mt-6 grid gap-px border border-neutral-800 bg-neutral-800 sm:grid-cols-2">
                        {wishlistRows.length ? (
                            wishlistRows.map((row) => {
                                const product = firstJoined(row.product);
                                if (!product) return null;
                                const images = [...(product.product_images ?? [])].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
                                const image = publicImageUrl(images[0]?.path) ?? "/merch-placeholder.svg";
                                const artist = firstJoined(product.artist);
                                return (
                                    <Link key={product.id} href={`/product/${product.slug ?? product.id}`} className="group bg-black">
                                        <div className="relative aspect-[4/5] bg-white">
                                            <Image
                                                src={image}
                                                alt={product.title ?? "Wishlisted product"}
                                                fill
                                                sizes="(max-width: 1024px) 50vw, 25vw"
                                                className="object-contain p-8 transition-transform group-hover:scale-105"
                                            />
                                            <div className="absolute right-3 top-3">
                                                <SavedToggleButton type="product" id={product.id} initialSaved variant="icon" />
                                            </div>
                                        </div>
                                        <div className="border-t border-neutral-800 p-4">
                                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-400">
                                                {artist?.display_name ?? "Artist drop"}
                                            </p>
                                            <h3 className="mt-2 line-clamp-2 min-h-11 font-black leading-tight">
                                                {product.title ?? "Product"}
                                            </h3>
                                            <p className="mt-3 font-black text-white">
                                                {fmtMoney(product.price_cents, product.currency ?? "AUD")}
                                            </p>
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="bg-black sm:col-span-2">
                                <EmptyPanel
                                    title="No wishlist items yet."
                                    body="Tap the heart on a product to save it for later."
                                    href="/new"
                                    action="Shop new drops"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section id="delivery-address" className="border-b border-neutral-800 p-5 md:p-8">
                <AddressFormClient address={(defaultAddress ?? null) as DefaultAddress | null} />
            </section>

            <section className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-8">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                        Need a hand?
                    </p>
                    <h2 className="mt-2 text-4xl font-black uppercase leading-none">Orders, credits, or account help.</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
                        If something looks off, contact support and include the artist, product, or order you need help with.
                    </p>
                </div>
                <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-500"
                >
                    Contact support <Search className="h-4 w-4" />
                </Link>
            </section>
        </main>
    );
}

function SavedCard({
    icon,
    title,
    body,
    action,
    href,
}: {
    icon: ReactNode;
    title: string;
    body: string;
    action: string;
    href: string;
}) {
    return (
        <div className="border-b border-neutral-800 bg-neutral-950 p-5 md:p-6 xl:border-b-0 xl:border-r xl:last:border-r-0">
            <div className="text-red-400">{icon}</div>
            <h2 className="mt-5 text-3xl font-black uppercase leading-none">{title}</h2>
            <p className="mt-4 min-h-24 text-sm leading-6 text-neutral-400">{body}</p>
            <Link href={href} className="mt-6 inline-flex items-center gap-2 text-sm font-black text-red-400 hover:text-red-300">
                {action} <ArrowRight className="h-4 w-4" />
            </Link>
        </div>
    );
}

function EmptyPanel({
    title,
    body,
    href,
    action,
}: {
    title: string;
    body: string;
    href: string;
    action: string;
}) {
    return (
        <div className="border border-neutral-800 bg-black p-5">
            <p className="text-xl font-black uppercase">{title}</p>
            <p className="mt-2 text-sm leading-6 text-neutral-400">{body}</p>
            <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-black text-red-400 hover:text-red-300">
                {action} <ArrowRight className="h-4 w-4" />
            </Link>
        </div>
    );
}
