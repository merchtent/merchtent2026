"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    ArrowRight,
    BadgeCheck,
    Boxes,
    CalendarDays,
    Camera,
    CreditCard,
    Disc3,
    Gift,
    Instagram,
    MousePointer2,
    Package,
    Radio,
    Shirt,
    Sparkles,
    Star,
    Users,
} from "lucide-react";

type Product = {
    id?: string;
    title?: string;
    slug?: string;
    image?: string | null;
    price?: number;
    badge?: string | null;
    kind?: string | null;
};

type Artist = {
    id?: string;
    name?: string | null;
    slug?: string | null;
    image?: string | null;
};

type FanShout = {
    id: string;
    name?: string | null;
    text?: string | null;
    rating?: number | null;
};

type Polaroid = {
    id: string;
    image: string | null;
    caption: string | null;
    link: string | null;
};

const heroImage = "https://images.unsplash.com/photo-1521334884684-d80222895322?auto=format&fit=crop&w=2200&q=85";
const crowdImage = "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=85";
const studioImage = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=85";

const flow = [
    { label: "01", title: "Design", body: "Open the product designer and place artwork, text, and print details.", icon: MousePointer2 },
    { label: "02", title: "Launch", body: "Mockups become a live listing connected to the artist profile.", icon: Sparkles },
    { label: "03", title: "Sell", body: "Fans buy the drop, earn credits, and support the artist directly.", icon: CreditCard },
    { label: "04", title: "Fulfil", body: "The saved design data travels with the order when it sells.", icon: Boxes },
];

const socialCards = [
    { handle: "@lunakite", text: "Copped this tee from the drop tonight. Quality is wild.", image: crowdImage },
    { handle: "@deadpilot", text: "First merch launched without ordering boxes. That changes things.", image: studioImage },
    { handle: "@rileypark", text: "Fans funded the run in a weekend. Keep it moving.", image: heroImage },
];

function fill<T>(items: T[], count: number) {
    if (items.length === 0) return [];
    return Array.from({ length: count }, (_, index) => items[index % items.length]);
}

export default function HomeAlt() {
    const [products, setProducts] = useState<Product[]>([]);
    const [artists, setArtists] = useState<Artist[]>([]);
    const [fanShouts, setFanShouts] = useState<FanShout[]>([]);
    const [polaroids, setPolaroids] = useState<Polaroid[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function load() {
            try {
                const [productsRes, artistsRes, shoutsRes, polaroidsRes] = await Promise.all([
                    fetch("/api/products", { cache: "no-store" }),
                    fetch("/api/artists", { cache: "no-store" }),
                    fetch("/api/fan-shouts", { cache: "no-store" }),
                    fetch("/api/polaroids", { cache: "no-store" }),
                ]);
                const [productsJson, artistsJson, shoutsJson, polaroidsJson] = await Promise.all([
                    productsRes.json(),
                    artistsRes.json(),
                    shoutsRes.json(),
                    polaroidsRes.json(),
                ]);

                if (!mounted) return;

                setProducts(Array.isArray(productsJson.products) ? productsJson.products.slice(0, 12) : []);
                setArtists(Array.isArray(artistsJson.artists) ? artistsJson.artists.slice(0, 8) : []);
                setFanShouts(Array.isArray(shoutsJson.shouts) ? shoutsJson.shouts.slice(0, 6) : []);
                setPolaroids(Array.isArray(polaroidsJson.images) ? polaroidsJson.images.slice(0, 4) : []);
            } catch {
                if (mounted) {
                    setProducts([]);
                    setArtists([]);
                    setFanShouts([]);
                    setPolaroids([]);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();

        return () => {
            mounted = false;
        };
    }, []);

    const liveDrops = useMemo(() => fill(products, 5), [products]);
    const shopProducts = useMemo(() => fill(products, 6), [products]);

    return (
        <main className="bg-black text-white">
            <Hero products={liveDrops} loading={loading} />
            <LiveDrops products={liveDrops} loading={loading} />
            <QuickRacks products={shopProducts} loading={loading} />
            <CreatorCommerce products={shopProducts} loading={loading} />
            <HybridFeatureGrid products={shopProducts} loading={loading} />
            <SceneMarket products={shopProducts} artists={artists} loading={loading} />
            <BackstageFeed polaroids={polaroids} loading={loading} />
            <CommunityProof />
            <FanShoutWall shouts={fanShouts} />
            <TourBoard />
            <FinalCta />
        </main>
    );
}

function Hero({ products, loading }: { products: Product[]; loading: boolean }) {
    return (
        <section className="relative min-h-[760px] overflow-hidden border-b border-neutral-800">
            <Image src={heroImage} alt="" fill priority sizes="100vw" className="object-cover opacity-55" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_35%,rgba(239,68,68,0.2),transparent_32%),linear-gradient(90deg,#000_0%,rgba(0,0,0,0.86)_34%,rgba(0,0,0,0.24)_72%,#000_100%)]" />
            <div className="absolute inset-x-0 top-0 border-b border-white/10 bg-black/45 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6 lg:px-8">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-400">Fresh concept</p>
                    <div className="hidden items-center gap-6 text-xs font-black uppercase tracking-[0.16em] text-neutral-300 md:flex">
                        <a href="#drops" className="hover:text-white">Live drops</a>
                        <a href="#designer" className="hover:text-white">Designer</a>
                        <a href="#scene" className="hover:text-white">Scene</a>
                    </div>
                </div>
            </div>

            <div className="relative z-10 mx-auto grid min-h-[760px] max-w-7xl items-end gap-8 px-4 pb-10 pt-24 md:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
                <div>
                    <p className="inline-flex items-center gap-2 bg-red-600 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em]">
                        <Radio className="h-4 w-4" />
                        Artist-first merch marketplace
                    </p>
                    <h1 className="mt-5 max-w-5xl text-6xl font-black uppercase leading-[0.82] md:text-8xl lg:text-[112px]">
                        Launch merch <span className="text-red-500">before</span> you print boxes
                    </h1>
                    <p className="mt-6 max-w-2xl text-lg font-bold leading-7 text-neutral-200">
                        Design products, publish mockups, sell to real fans, then fulfil from saved production data.
                        Built for bands, unsigned artists, and fans who want to back the scene early.
                    </p>
                    <div className="mt-7 flex flex-wrap gap-3">
                        <Link href="/auth/sign-up?type=artist" className="inline-flex items-center gap-2 bg-red-600 px-6 py-4 text-sm font-black hover:bg-red-500">
                            Artist account <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link href="/auth/sign-up?type=fan" className="inline-flex items-center gap-2 border border-white/30 bg-black/40 px-6 py-4 text-sm font-black hover:border-red-400">
                            Fan account <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                    <div className="mt-7 flex flex-wrap items-center gap-4 text-xs font-bold text-neutral-300">
                        <span className="flex -space-x-2">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <span key={index} className="h-8 w-8 rounded-full border-2 border-black bg-neutral-300" />
                            ))}
                        </span>
                        <span>Artists launch. Fans back. We fulfil after sale.</span>
                    </div>
                </div>

                <aside className="border border-white/15 bg-black/70 p-5 backdrop-blur">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-400">Merch credits</p>
                    <p className="mt-2 text-6xl font-black">1,250</p>
                    <p className="mt-1 text-xs text-neutral-400">Available balance example</p>
                    <button className="mt-5 w-full bg-red-600 px-4 py-3 text-sm font-black hover:bg-red-500">Earn credits</button>
                    <div className="mt-5 space-y-2 text-sm">
                        {["+3 per tee purchase", "+100 for a review", "+50 for a fan shout"].map((item) => (
                            <div key={item} className="flex justify-between border-t border-neutral-800 pt-2 text-neutral-300">
                                <span>{item}</span>
                                <BadgeCheck className="h-4 w-4 text-red-400" />
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-2">
                        {(loading ? Array.from({ length: 2 }) : products.slice(0, 2)).map((product, index) => {
                            const item = product as Product | undefined;
                            return (
                                <Link key={item?.id ?? index} href={item?.slug ? `/product/${item.slug}` : "/new"} className="border border-neutral-800 bg-neutral-950">
                                    <div className="relative aspect-square bg-white">
                                        {item?.image ? (
                                            <Image src={item.image} alt={item.title ?? "Product"} fill sizes="160px" className="object-contain p-3" />
                                        ) : (
                                            <div className="h-full w-full animate-pulse bg-neutral-200" />
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </aside>
            </div>
        </section>
    );
}

function LiveDrops({ products, loading }: { products: Product[]; loading: boolean }) {
    const cards = loading ? Array.from({ length: 5 }) : products;

    return (
        <section id="drops" className="border-b border-neutral-800 bg-black">
            <div className="mx-auto flex max-w-7xl items-end justify-between px-4 py-7 md:px-6 lg:px-8">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">Live drops</p>
                    <h2 className="mt-2 text-4xl font-black uppercase leading-none">Drops happening now</h2>
                </div>
                <Link href="/new" className="hidden items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-red-400 md:inline-flex">
                    View all drops <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
            <div className="grid border-t border-neutral-800 md:grid-cols-5">
                {cards.map((product, index) => {
                    const item = product as Product | undefined;
                    return (
                        <Link key={item?.id ?? index} href={item?.slug ? `/product/${item.slug}` : "/new"} className="group min-h-[260px] border-b border-r border-neutral-800 bg-neutral-950 p-4">
                            <div className="grid h-full grid-cols-[1fr_120px] gap-3">
                                <div className="flex flex-col justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-400">
                                            [ {item?.badge ?? "new drop"} ]
                                        </p>
                                        <h3 className="mt-8 line-clamp-3 text-2xl font-black uppercase leading-none">
                                            {item?.title ?? "Loading drop"}
                                        </h3>
                                    </div>
                                    <div>
                                        <div className="h-1 bg-neutral-800">
                                            <div className="h-full bg-red-600" style={{ width: `${42 + index * 9}%` }} />
                                        </div>
                                        <p className="mt-2 text-xs text-neutral-400">{42 + index * 9}% sold</p>
                                    </div>
                                </div>
                                <div className="relative self-center bg-white">
                                    <div className="aspect-[3/4]">
                                        {item?.image ? (
                                            <Image src={item.image} alt={item.title ?? "Product"} fill sizes="180px" className="object-contain p-2 transition group-hover:scale-105" />
                                        ) : (
                                            <div className="h-full w-full animate-pulse bg-neutral-200" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}

function QuickRacks({ products, loading }: { products: Product[]; loading: boolean }) {
    const cards = loading ? Array.from({ length: 12 }) : fill(products, 12);
    const lanes = [
        { title: "Tees", href: "/category/tees", note: "front-row staples", icon: Shirt },
        { title: "Hoodies", href: "/category/hoodies", note: "cold-night merch", icon: Package },
        { title: "Vinyl", href: "/category/vinyl", note: "record crate energy", icon: Disc3 },
        { title: "Posters", href: "/category/posters", note: "flyer wall finds", icon: Camera },
    ];

    return (
        <section className="border-b border-neutral-800 bg-black">
            <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">Retail floor</p>
                        <h2 className="mt-2 text-4xl font-black uppercase leading-none">Quick racks from the scene.</h2>
                    </div>
                    <Link href="/new" className="inline-flex w-fit items-center gap-2 border border-neutral-700 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] hover:border-red-500">
                        New this week <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
                    {lanes.map((lane) => {
                        const Icon = lane.icon;
                        return (
                            <Link key={lane.title} href={lane.href} className="border border-neutral-800 bg-neutral-950 p-4 hover:border-red-500">
                                <Icon className="h-5 w-5 text-red-400" />
                                <p className="mt-4 text-2xl font-black uppercase leading-none">{lane.title}</p>
                                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">{lane.note}</p>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-2 border-t border-neutral-800 sm:grid-cols-4 lg:grid-cols-6">
                {cards.map((product, index) => {
                    const item = product as Product | undefined;
                    return (
                        <Link key={`${item?.id ?? "rack"}-${index}`} href={item?.slug ? `/product/${item.slug}` : "/new"} className="group border-b border-r border-neutral-800 bg-neutral-950">
                            <div className="relative aspect-square bg-white">
                                {item?.image ? (
                                    <Image src={item.image} alt={item.title ?? "Product"} fill sizes="20vw" className="object-contain p-4 transition group-hover:scale-105" />
                                ) : (
                                    <div className="h-full w-full animate-pulse bg-neutral-200" />
                                )}
                                {index === 0 && <span className="absolute left-3 top-3 bg-red-600 px-2 py-1 text-[10px] font-black uppercase">Counter pick</span>}
                            </div>
                            <div className="p-3">
                                <p className="line-clamp-1 text-xs font-black">{item?.title ?? "Loading drop"}</p>
                                <p className="mt-1 text-xs text-red-400">{typeof item?.price === "number" ? `$${item.price}` : ""}</p>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}

function CreatorCommerce({ products, loading }: { products: Product[]; loading: boolean }) {
    return (
        <section id="designer" className="grid border-b border-neutral-800 bg-neutral-100 text-black lg:grid-cols-[0.95fr_1.1fr_0.95fr]">
            <div className="border-b border-neutral-300 p-6 md:p-8 lg:border-b-0 lg:border-r">
                <h2 className="text-3xl font-black uppercase leading-none md:text-5xl">From design to fulfilment</h2>
                <div className="mt-8 grid gap-4">
                    {flow.map((step) => {
                        const Icon = step.icon;
                        return (
                            <div key={step.title} className="grid grid-cols-[44px_1fr] gap-4 border-t border-neutral-300 pt-4">
                                <Icon className="h-7 w-7" />
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-600">{step.label}. {step.title}</p>
                                    <p className="mt-1 text-sm text-neutral-700">{step.body}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <Link href="/start" className="mt-8 inline-flex items-center gap-2 bg-black px-5 py-3 text-sm font-black text-white">
                    Learn how it works <ArrowRight className="h-4 w-4" />
                </Link>
            </div>

            <div className="border-b border-neutral-300 bg-black p-6 text-white md:p-8 lg:border-b-0 lg:border-r">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">Build your first product</p>
                <h2 className="mt-2 text-3xl font-black uppercase leading-none">Product designer preview</h2>
                <div className="mt-6 grid gap-4 border border-neutral-800 bg-neutral-950 p-4 md:grid-cols-[90px_1fr_120px]">
                    <div className="space-y-2 text-[10px] font-black uppercase tracking-[0.12em] text-neutral-400">
                        {["Product", "Add text", "Artwork", "Upload", "Layers"].map((item) => (
                            <div key={item} className="border border-neutral-800 px-2 py-2">{item}</div>
                        ))}
                    </div>
                    <div className="relative min-h-[320px] bg-neutral-900">
                        <div className="absolute left-[18%] top-[12%] h-[76%] w-[64%] rounded-t-[42%] bg-neutral-800" />
                        <div className="absolute left-[31%] top-[30%] text-center text-3xl font-black uppercase leading-none text-red-500">
                            The<br />Seaside<br />Riot
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">Shirt color</p>
                            <div className="mt-2 flex gap-2">
                                {["#111", "#fff", "#ef4444", "#2563eb"].map((color) => (
                                    <span key={color} className="h-6 w-6 rounded-full border border-neutral-600" style={{ backgroundColor: color }} />
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">Size</p>
                            <div className="mt-2 border border-neutral-700 px-3 py-2 text-sm">M</div>
                        </div>
                        <button className="w-full bg-red-600 px-4 py-3 text-xs font-black">Save product</button>
                    </div>
                </div>
            </div>

            <div className="p-6 md:p-8">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-600">Shop the scene</p>
                <h2 className="mt-2 text-3xl font-black uppercase leading-none">Discover artists. Support the next wave.</h2>
                <div className="mt-6 grid grid-cols-3 gap-3">
                    {(loading ? Array.from({ length: 3 }) : products.slice(0, 3)).map((product, index) => {
                        const item = product as Product | undefined;
                        return (
                            <Link key={item?.id ?? index} href={item?.slug ? `/product/${item.slug}` : "/new"}>
                                <div className="relative aspect-[3/4] bg-white">
                                    {item?.image ? (
                                        <Image src={item.image} alt={item.title ?? "Product"} fill sizes="180px" className="object-contain p-3" />
                                    ) : (
                                        <div className="h-full w-full animate-pulse bg-neutral-300" />
                                    )}
                                </div>
                                <p className="mt-2 line-clamp-2 text-xs font-black">{item?.title ?? "Loading"}</p>
                                <p className="text-xs text-neutral-600">{typeof item?.price === "number" ? `$${item.price}` : ""}</p>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

function HybridFeatureGrid({ products, loading }: { products: Product[]; loading: boolean }) {
    const featureProduct = loading ? undefined : products[0];
    const collections = [
        { title: "Tees", href: "/category/tees", image: heroImage, meta: "tour staples // first drop" },
        { title: "Hoodies", href: "/category/hoodies", image: studioImage, meta: "late nights // loud backs" },
        { title: "Tanks", href: "/category/tanks", image: crowdImage, meta: "summer shows // pit ready" },
    ];

    return (
        <section className="border-b border-neutral-800 bg-black">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
                <div className="border-b border-neutral-800 lg:border-b-0 lg:border-r">
                    <div className="px-4 py-8 md:px-6 lg:px-8">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">Featured collections</p>
                        <h2 className="mt-2 text-4xl font-black uppercase leading-none md:text-6xl">Pick your rack.</h2>
                    </div>
                    <div className="grid border-t border-neutral-800 md:grid-cols-3">
                        {collections.map((collection) => (
                            <Link key={collection.title} href={collection.href} className="group relative min-h-[320px] overflow-hidden border-b border-r border-neutral-800">
                                <Image src={collection.image} alt="" fill sizes="33vw" className="object-cover opacity-50 grayscale transition group-hover:scale-105 group-hover:opacity-75 group-hover:grayscale-0" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                                <div className="absolute inset-x-0 bottom-0 p-5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">[ {collection.meta} ]</p>
                                    <h3 className="mt-3 text-4xl font-black uppercase leading-none">{collection.title}</h3>
                                    <span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-red-400">
                                        Shop now <ArrowRight className="h-4 w-4" />
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="grid bg-neutral-950">
                    <div className="border-b border-neutral-800 p-5 md:p-8">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">Mixtape bundle</p>
                        <h2 className="mt-2 text-4xl font-black uppercase leading-none">Band merch on a budget.</h2>
                        <p className="mt-4 text-sm leading-6 text-neutral-400">Bring back the original bundle idea as a proper drop mechanic: two tees, a hoodie, or a tour pack with fan credits attached.</p>
                    </div>
                    <div className="grid grid-cols-[1fr_160px] gap-4 p-5 md:p-8">
                        <div>
                            <div className="grid grid-cols-3 gap-2">
                                {fill(products, 3).map((product, index) => (
                                    <div key={`${product.id}-${index}`} className="relative aspect-[3/4] bg-white">
                                        {product.image && <Image src={product.image} alt={product.title ?? "Product"} fill sizes="140px" className="object-contain p-3" />}
                                    </div>
                                ))}
                            </div>
                            <Link href="/new" className="mt-5 inline-flex items-center gap-2 bg-red-600 px-5 py-3 text-sm font-black hover:bg-red-500">
                                Build a bundle <Gift className="h-4 w-4" />
                            </Link>
                        </div>
                        <div className="border border-neutral-800 bg-black p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-400">Featured item</p>
                            <p className="mt-4 line-clamp-4 text-sm font-black">{featureProduct?.title ?? "Drop loading"}</p>
                            <p className="mt-2 text-3xl font-black text-red-400">{typeof featureProduct?.price === "number" ? `$${featureProduct.price}` : "$--"}</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function SceneMarket({ products, artists, loading }: { products: Product[]; artists: Artist[]; loading: boolean }) {
    return (
        <section id="scene" className="border-b border-neutral-800 bg-black">
            <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
                <div className="border-b border-neutral-800 p-6 md:p-8 lg:border-b-0 lg:border-r">
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">Artists moving now</p>
                    <h2 className="mt-2 text-4xl font-black uppercase leading-none md:text-6xl">Shop people, not inventory.</h2>
                    <div className="mt-8 flex flex-wrap gap-2">
                        {(loading ? Array.from({ length: 8 }) : artists).map((artist, index) => {
                            const item = artist as Artist | undefined;
                            return (
                                <Link key={item?.id ?? index} href={item?.slug ? `/artists/${item.slug}` : "/artists"} className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm font-black hover:border-red-500">
                                    {item?.name ?? "Artist loading"}
                                </Link>
                            );
                        })}
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3">
                    {(loading ? Array.from({ length: 6 }) : products).slice(0, 6).map((product, index) => {
                        const item = product as Product | undefined;
                        return (
                            <Link key={item?.id ?? index} href={item?.slug ? `/product/${item.slug}` : "/new"} className="group border-b border-r border-neutral-800 bg-neutral-950">
                                <div className="relative aspect-[4/5] bg-neutral-100">
                                    {item?.image ? (
                                        <Image src={item.image} alt={item.title ?? "Product"} fill sizes="33vw" className="object-contain p-5 transition group-hover:scale-105" />
                                    ) : (
                                        <div className="h-full w-full animate-pulse bg-neutral-200" />
                                    )}
                                    <span className="absolute left-3 top-3 bg-red-600 px-2 py-1 text-[10px] font-black uppercase">{item?.badge ?? "Live"}</span>
                                </div>
                                <div className="p-3">
                                    <p className="line-clamp-2 text-sm font-black">{item?.title ?? "Loading product"}</p>
                                    <p className="mt-1 text-sm text-red-400">{typeof item?.price === "number" ? `$${item.price}` : ""}</p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

function BackstageFeed({ polaroids, loading }: { polaroids: Polaroid[]; loading: boolean }) {
    const fallback = [
        { id: "fallback-1", image: crowdImage, caption: "Gig nights, fan fits, and product stories from the room.", link: "https://www.instagram.com/merchtent.au/" },
        { id: "fallback-2", image: studioImage, caption: "First samples, late design edits, and the bits before launch.", link: "https://www.instagram.com/merchtent.au/" },
        { id: "fallback-3", image: heroImage, caption: "The merch table energy, rebuilt online.", link: "https://www.instagram.com/merchtent.au/" },
        { id: "fallback-4", image: crowdImage, caption: "Fans wearing the scene before everyone else catches on.", link: "https://www.instagram.com/merchtent.au/" },
    ];
    const posts = loading ? fallback : polaroids.length > 0 ? polaroids : fallback;

    return (
        <section className="border-b border-neutral-800 bg-black">
            <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">Backstage feed</p>
                        <h2 className="mt-2 text-4xl font-black uppercase leading-none md:text-6xl">Real life in the loop.</h2>
                    </div>
                    <Link href="https://www.instagram.com/merchtent.au/" target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-2 border border-neutral-700 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] hover:border-red-500">
                        Instagram <Instagram className="h-4 w-4" />
                    </Link>
                </div>
            </div>
            <div className="grid border-t border-neutral-800 md:grid-cols-4">
                {posts.slice(0, 4).map((post, index) => (
                    <Link key={post.id} href={post.link ?? "https://www.instagram.com/merchtent.au/"} target="_blank" rel="noopener noreferrer" className="group relative min-h-[340px] overflow-hidden border-b border-r border-neutral-800">
                        {post.image && <Image src={post.image} alt={post.caption ?? "Backstage post"} fill sizes="25vw" className="object-cover opacity-55 grayscale transition group-hover:scale-105 group-hover:opacity-80 group-hover:grayscale-0" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
                        <div className="absolute inset-x-0 bottom-0 p-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">[ post {String(index + 1).padStart(2, "0")} ]</p>
                            <p className="mt-3 line-clamp-3 text-xl font-black leading-tight">{post.caption}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}

function CommunityProof() {
    return (
        <section className="border-b border-neutral-800 bg-black">
            <div className="grid lg:grid-cols-[280px_1fr]">
                <div className="border-b border-neutral-800 p-6 md:p-8 lg:border-b-0 lg:border-r">
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">Built with the community</p>
                    <p className="mt-5 text-6xl font-black">4.8</p>
                    <div className="mt-2 flex text-red-500">
                        {Array.from({ length: 5 }).map((_, index) => <Star key={index} className="h-5 w-5 fill-current" />)}
                    </div>
                    <p className="mt-3 text-sm text-neutral-400">Real fans. Real feedback.</p>
                </div>
                <div className="grid md:grid-cols-3">
                    {socialCards.map((card) => (
                        <div key={card.handle} className="relative min-h-[300px] overflow-hidden border-b border-r border-neutral-800 p-5">
                            <Image src={card.image} alt="" fill sizes="33vw" className="object-cover opacity-25 grayscale" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />
                            <div className="relative z-10 flex h-full flex-col justify-end">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-400">{card.handle}</p>
                                <p className="mt-4 text-2xl font-black leading-tight">&ldquo;{card.text}&rdquo;</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function FanShoutWall({ shouts }: { shouts: FanShout[] }) {
    const fallback = [
        { id: "fallback-a", name: "Mia", text: "This feels like finding a band before the rest of the city does.", rating: 5 },
        { id: "fallback-b", name: "Jase", text: "Bought the tee after the set. The account credits idea makes me come back.", rating: 5 },
        { id: "fallback-c", name: "Tara", text: "It actually feels connected to the artists, not like random merch.", rating: 5 },
    ];
    const visible = shouts.length > 0 ? shouts : fallback;

    return (
        <section className="border-b border-neutral-800 bg-black">
            <div className="grid lg:grid-cols-[320px_1fr]">
                <div className="border-b border-neutral-800 p-6 md:p-8 lg:border-b-0 lg:border-r">
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">Fan shouts</p>
                    <h2 className="mt-2 text-4xl font-black uppercase leading-none">Proof from the pit.</h2>
                    <div className="mt-6 flex text-red-500">
                        {Array.from({ length: 5 }).map((_, index) => <Star key={index} className="h-5 w-5 fill-current" />)}
                    </div>
                </div>
                <div className="grid md:grid-cols-3">
                    {visible.slice(0, 3).map((shout, index) => (
                        <div key={shout.id} className="min-h-[260px] border-b border-r border-neutral-800 bg-neutral-950 p-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">[ shout {String(index + 1).padStart(2, "0")} ]</p>
                            <p className="mt-8 text-2xl font-black leading-tight">&ldquo;{shout.text}&rdquo;</p>
                            <p className="mt-8 text-sm font-black text-neutral-300">{shout.name ?? "Fan"}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function TourBoard() {
    const dates = [
        { artist: "Lionel Loves Vinyl", city: "Melbourne", date: "Drop night" },
        { artist: "Spank The 90s", city: "Sydney", date: "This week" },
        { artist: "Madre Monte", city: "Brisbane", date: "Next up" },
    ];

    return (
        <section className="border-b border-neutral-800 bg-neutral-950">
            <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">Tour dates</p>
                <h2 className="mt-2 text-4xl font-black uppercase leading-none">Drops follow the shows.</h2>
                <div className="mt-6 grid border border-neutral-800 md:grid-cols-3">
                    {dates.map((date) => (
                        <div key={date.artist} className="border-b border-r border-neutral-800 bg-black p-5">
                            <CalendarDays className="h-5 w-5 text-red-400" />
                            <p className="mt-6 text-2xl font-black uppercase leading-none">{date.artist}</p>
                            <p className="mt-2 text-sm text-neutral-400">{date.city} / {date.date}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function FinalCta() {
    return (
        <section className="relative overflow-hidden bg-red-600 text-white">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_18px,rgba(0,0,0,0.12)_18px,rgba(0,0,0,0.12)_36px)]" />
            <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 md:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-black">Open the tent</p>
                    <h2 className="mt-3 max-w-4xl text-5xl font-black uppercase leading-none md:text-7xl">
                        Artist account or fan account. Same scene.
                    </h2>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link href="/auth/sign-up?type=artist" className="inline-flex items-center gap-2 bg-black px-6 py-4 text-sm font-black">
                        Artist account <Shirt className="h-4 w-4" />
                    </Link>
                    <Link href="/auth/sign-up?type=fan" className="inline-flex items-center gap-2 border border-black px-6 py-4 text-sm font-black text-black">
                        Fan account <Users className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
