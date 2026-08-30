"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    ArrowRight,
    Camera,
    Disc3,
    Gift,
    Instagram,
    Package,
    Radio,
    Shirt,
    Star,
    Users,
    Zap,
} from "lucide-react";

type Product = {
    id?: string;
    title?: string;
    slug?: string;
    image?: string | null;
    price?: number;
    badge?: string | null;
};

type Artist = {
    id?: string;
    name?: string | null;
    display_name?: string | null;
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

type ArtistFeature = {
    id: string;
    name: string;
    slug: string;
    bio?: string | null;
    image?: string | null;
    photos: Array<{
        id: string;
        image: string;
        caption?: string | null;
    }>;
    products: Product[];
};

const heroMerchImage = "/images/home-new-hero-merch-table.png";
const streetTransitionLeftImage = "/images/home-new-street-transition-torn-left.png";
const streetTransitionRightImage = "/images/home-new-street-transition-torn-right.png";
const merchTableImage = "/images/home-new-hero-merch-table.png";
const posterWallImage = "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1800&q=85";
const crowdImage = "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=85";
const studioImage = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=85";

const dropNames = ["Voidline", "Rearview", "Paper Suns", "False Coast"];
const community = [
    { handle: "@roughthreadz", text: "Designed the tee at soundcheck. Sold the first run before doors.", image: posterWallImage },
    { handle: "@lakeside.wav", text: "The merch table finally feels as quick as the show.", image: crowdImage },
    { handle: "@brokenstairs", text: "Fans bought the drop before we printed a single box.", image: merchTableImage },
];

function fill<T>(items: T[], count: number) {
    if (!items.length) return [];
    return Array.from({ length: count }, (_, index) => items[index % items.length]);
}

function shuffledOneProductPerArtist(products: Product[], count: number) {
    const shuffled = [...products].sort(() => Math.random() - 0.5);
    const seenArtists = new Set<string>();

    return shuffled.filter((product) => {
        const artist = product.badge?.trim().toLowerCase();
        if (!artist || seenArtists.has(artist)) return false;
        seenArtists.add(artist);
        return true;
    }).slice(0, count);
}

export default function HomeNewPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [artists, setArtists] = useState<Artist[]>([]);
    const [fanShouts, setFanShouts] = useState<FanShout[]>([]);
    const [polaroids, setPolaroids] = useState<Polaroid[]>([]);
    const [artistFeatures, setArtistFeatures] = useState<ArtistFeature[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function load() {
            try {
                const [productsRes, artistsRes, shoutsRes, polaroidsRes, artistFeaturesRes] = await Promise.all([
                    fetch("/api/products", { cache: "no-store" }),
                    fetch("/api/artists", { cache: "no-store" }),
                    fetch("/api/fan-shouts", { cache: "no-store" }),
                    fetch("/api/polaroids", { cache: "no-store" }),
                    fetch("/api/artist-features", { cache: "no-store" }),
                ]);
                const [productsJson, artistsJson, shoutsJson, polaroidsJson, artistFeaturesJson] = await Promise.all([
                    productsRes.json(),
                    artistsRes.json(),
                    shoutsRes.json(),
                    polaroidsRes.json(),
                    artistFeaturesRes.json(),
                ]);
                if (!mounted) return;
                setProducts(Array.isArray(productsJson.products) ? productsJson.products.slice(0, 16) : []);
                setArtists(Array.isArray(artistsJson.artists) ? artistsJson.artists.slice(0, 6) : []);
                setFanShouts(Array.isArray(shoutsJson.shouts) ? shoutsJson.shouts.slice(0, 6) : []);
                setPolaroids(Array.isArray(polaroidsJson.images) ? polaroidsJson.images.slice(0, 4) : []);
                setArtistFeatures(Array.isArray(artistFeaturesJson.features) ? artistFeaturesJson.features.slice(0, 6) : []);
            } catch {
                if (!mounted) {
                    return;
                }
                setProducts([]);
                setArtists([]);
                setFanShouts([]);
                setPolaroids([]);
                setArtistFeatures([]);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();
        return () => {
            mounted = false;
        };
    }, []);

    const heroProducts = useMemo(() => shuffledOneProductPerArtist(products, 4), [products]);
    const rackProducts = useMemo(() => fill(products, 12), [products]);
    const artistList = useMemo(() => fill(artists, 4), [artists]);

    return (
        <main className="min-h-screen bg-[#080808] text-white">
            <style>{`
                @keyframes home-new-marquee {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
            `}</style>
            <Hero products={heroProducts} loading={loading} />
            <SceneTicker />
            <QuickRacks products={rackProducts} loading={loading} />
            <RotatingArtistFeature features={artistFeatures} fallbackArtists={artistList} products={heroProducts} loading={loading} />
            <SceneEngine products={heroProducts} loading={loading} />
            <CommunityScene artists={artistList} />
            <AccountPaths />
            <LatestDropWall products={rackProducts} loading={loading} />
            <FeaturedArtistsNew artists={artistList} loading={loading} />
            <CollectionBundle products={heroProducts} loading={loading} />
            <SocialFeed polaroids={polaroids} loading={loading} />
            <RealLifeAndReviews fanShouts={fanShouts} />
            <StartBridge />
            <JoinTheListNew />
        </main>
    );
}

function Hero({ products, loading }: { products: Product[]; loading: boolean }) {
    const cards = loading ? Array.from({ length: 4 }) : products;

    return (
        <section className="relative overflow-hidden border-b border-neutral-800 bg-[#080808]">
            <div className="relative min-h-[472px] overflow-hidden md:min-h-[520px]">
                <Image src={heroMerchImage} alt="" fill priority sizes="100vw" className="object-cover object-[58%_center]" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,7,7,0.2)_0%,rgba(7,7,7,0.12)_43%,rgba(7,7,7,0)_62%,rgba(7,7,7,0.06)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(255,255,255,0.1),transparent_22%)] opacity-70" />
                <div className="absolute inset-y-0 left-0 w-[49%] bg-[linear-gradient(90deg,rgba(0,0,0,0.08),rgba(0,0,0,0))]" />
                <div className="absolute bottom-0 left-0 h-24 w-full bg-gradient-to-t from-[#080808] to-transparent" />
                <div className="absolute left-[45%] top-0 hidden h-full w-20 -skew-x-6 bg-[linear-gradient(90deg,transparent,rgba(242,240,234,0.12),transparent)] opacity-70 lg:block" />
                <div className="absolute inset-0 mix-blend-screen opacity-[0.16] [background-image:radial-gradient(circle_at_20%_20%,white_0_1px,transparent_1px_5px)]" />

                <div className="relative z-10 flex min-h-[472px] items-center px-5 py-10 md:min-h-[520px] md:px-12">
                    <div className="max-w-[690px]">
                        <h1 className="max-w-[690px] font-black leading-[0.86] text-[#f2f0ea] drop-shadow-[0_5px_0_rgba(0,0,0,0.45)] [font-stretch:condensed] [text-shadow:0_8px_20px_rgba(0,0,0,0.62)]">
                            <span
                                className="block text-[72px] tracking-[-0.065em] text-[#f2f0ea] md:text-[106px] xl:text-[126px]"
                            >
                                Build the drop.
                            </span>
                            <span
                                className="block text-[70px] tracking-[-0.07em] text-[#ef0000] md:text-[104px] xl:text-[124px]"
                            >
                                Back the band.
                            </span>
                        </h1>
                        <p className="mt-6 max-w-lg text-2xl leading-tight text-neutral-200 md:text-[28px]">
                            Design merch. Launch drops.
                            <span className="block">Sell after checkout.</span>
                        </p>
                        <div className="mt-7 flex flex-wrap gap-4">
                            <Link href="/new" className="inline-flex h-14 items-center gap-3 bg-[#ef0000] px-7 text-base font-black shadow-[8px_8px_0_rgba(0,0,0,0.32)] hover:bg-red-500">
                                Shop the scene <ArrowRight className="h-5 w-5" />
                            </Link>
                            <Link href="/auth/sign-up?type=artist" className="inline-flex h-14 items-center gap-3 border border-lime-300 bg-black/25 px-7 text-base font-black text-lime-300 shadow-[0_0_22px_rgba(190,242,100,0.18),8px_8px_0_rgba(0,0,0,0.22)] hover:bg-lime-300 hover:text-black">
                                Start as artist <Zap className="h-5 w-5 fill-lime-300" />
                            </Link>
                            <Link href="/auth/sign-up?type=fan" className="inline-flex h-14 items-center gap-3 border border-white/35 bg-black/45 px-7 text-base font-black shadow-[8px_8px_0_rgba(0,0,0,0.22)] hover:border-white">
                                Start as fan <Users className="h-5 w-5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative z-20 mt-6 px-3 pb-0 md:px-8">
                <div
                    className="pointer-events-none absolute bottom-0 left-0 top-0 hidden w-[13vw] bg-cover bg-center opacity-95 md:block"
                    style={{ backgroundImage: `url(${streetTransitionLeftImage})` }}
                >
                    <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-black to-transparent" />
                </div>
                <div
                    className="pointer-events-none absolute bottom-0 right-0 top-0 hidden w-[13vw] bg-cover bg-center opacity-95 md:block"
                    style={{ backgroundImage: `url(${streetTransitionRightImage})` }}
                >
                    <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-black to-transparent" />
                </div>
                <div className="relative mx-auto grid max-w-[1600px] border border-neutral-900 shadow-[0_24px_100px_rgba(0,0,0,0.55)] lg:grid-cols-[1.18fr_0.82fr_0.7fr]">
                    <div className="relative bg-[#f2f0ea] p-5 text-black md:p-6">
                        <div className="absolute -top-3 left-0 h-4 w-full bg-[#f2f0ea] [clip-path:polygon(0_45%,7%_20%,16%_54%,27%_28%,39%_58%,50%_20%,61%_54%,72%_30%,83%_58%,93%_25%,100%_48%,100%_100%,0_100%)]" />
                        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,0,0,0.06)_0_1px,transparent_1px_18px)] opacity-40" />
                        <div className="relative flex items-center justify-between gap-3">
                            <h2 className="text-2xl font-black">Live drops</h2>
                            <Link href="/new" className="inline-flex items-center gap-2 text-sm font-black">
                                View all drops <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                        <div className="relative mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                            {cards.map((product, index) => {
                                const item = product as Product | undefined;
                                return <DropCard key={item?.id ?? index} product={item} index={index} compact />;
                            })}
                        </div>
                    </div>

                    <DesignerPreview />
                    <FeatureStack />
                </div>
            </div>
        </section>
    );
}

function DesignerPreview() {
    return (
        <div className="relative overflow-hidden bg-[#101010] p-6 text-white md:-mt-3 md:rounded-t-md">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(190,242,100,0.13),transparent_24%)]" />
            <div className="absolute inset-0 border-x border-white/10" />
            <div className="relative">
                <h2 className="text-2xl font-black">Design your merch</h2>
                <p className="mt-1 text-sm text-neutral-400">Create without limits.</p>
                <div className="mt-4 grid grid-cols-[58px_1fr_34px] gap-3">
                    <div className="space-y-2 text-[10px] text-neutral-300">
                        {[
                            ["T", "Text"],
                            ["▧", "Images"],
                            ["ϟ", "Graphics"],
                            ["◌", "Colors"],
                        ].map(([icon, label]) => (
                            <div key={label} className="grid h-[54px] place-items-center border border-white/10 bg-black/35">
                                <span className="text-base">{icon}</span>
                                <span>{label}</span>
                            </div>
                        ))}
                    </div>
                    <div className="relative min-h-[235px] overflow-hidden rounded-md border border-white/10 bg-[#151515] shadow-inner shadow-white/[0.04]">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(190,242,100,0.12),transparent_38%)]" />
                        <Image
                            src="/images/home-new-designer-shirt-preview.png"
                            alt="Black band tee preview inside the product designer"
                            fill
                            sizes="360px"
                            className="object-contain p-3 drop-shadow-[0_18px_28px_rgba(0,0,0,0.62)]"
                        />
                    </div>
                    <div className="flex flex-col items-center gap-3 pt-9">
                        {["#bef264", "#f8fafc", "#0a0a0a", "#ef0000"].map((color) => (
                            <span key={color} className="h-6 w-6 rounded-full border border-white/20" style={{ backgroundColor: color }} />
                        ))}
                    </div>
                </div>
                <Link href="/dashboard/products/designer" className="mx-auto mt-4 flex h-10 max-w-[210px] items-center justify-center gap-2 rounded bg-lime-300 text-sm font-black text-black shadow-[0_0_28px_rgba(190,242,100,0.22)] hover:bg-lime-200">
                    Start designing <Zap className="h-4 w-4" />
                </Link>
            </div>
        </div>
    );
}

function FeatureStack() {
    const features = [
        {
            title: "Live drops",
            body: "Limited runs. Real-time countdowns. Do not miss out.",
            iconImage: "/images/home-new-icon-live-drop.png",
            iconAlt: "Live drops",
        },
        {
            title: "Artist payouts",
            body: "Fair payouts, transparent fees, paid after checkout.",
            iconImage: "/images/home-new-icon-artist-payouts.png",
            iconAlt: "Artist payouts",
        },
        {
            title: "Fan credits",
            body: "Earn credits for supporting artists and sharing drops.",
            iconImage: "/images/home-new-icon-fan-credits.png",
            iconAlt: "Fan credits",
        },
    ];

    return (
        <aside className="relative bg-[#f2f0ea] p-6 text-black">
            <div className="absolute -top-3 left-0 h-4 w-full bg-[#f2f0ea] [clip-path:polygon(0_35%,10%_60%,22%_24%,34%_55%,45%_24%,58%_62%,70%_25%,82%_58%,93%_28%,100%_50%,100%_100%,0_100%)]" />
            <div className="space-y-5">
                {features.map((feature) => (
                    <div key={feature.title} className="grid grid-cols-[70px_1fr] gap-4 border-b border-black/15 pb-5 last:border-b-0">
                        <span className="relative grid h-14 w-14 place-items-center">
                            <Image src={feature.iconImage} alt={feature.iconAlt} width={88} height={88} className="h-16 w-16 object-contain" />
                        </span>
                        <div>
                            <h3 className="text-2xl font-black">{feature.title}</h3>
                            <p className="mt-1 text-sm leading-5 text-neutral-700">{feature.body}</p>
                        </div>
                    </div>
                ))}
            </div>
            <Link href="/start" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-lime-700">
                Learn how it works <ArrowRight className="h-4 w-4" />
            </Link>
        </aside>
    );
}

function QuickRacks({ products, loading }: { products: Product[]; loading: boolean }) {
    const cards = loading ? Array.from({ length: 12 }) : products;
    const lanes = [
        { title: "Tees", href: "/category/tees", note: "front-row staples", icon: Shirt },
        { title: "Hoodies", href: "/category/hoodies", note: "cold-night merch", icon: Package },
        { title: "Vinyl", href: "/category/vinyl", note: "record crate energy", icon: Disc3 },
        { title: "Posters", href: "/category/posters", note: "flyer wall finds", icon: Camera },
    ];

    return (
        <section className="border-b border-neutral-200 bg-[#f2f0ea] px-4 py-12 text-black md:px-8 md:py-16">
            <div className="mx-auto max-w-[1600px]">
                <div className="flex flex-wrap items-end justify-between gap-5">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-600">Retail floor</p>
                        <h2 className="mt-2 text-5xl font-black uppercase leading-none md:text-7xl">Quick racks from the scene.</h2>
                        <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-neutral-600">
                            A calmer shop rack after the hero: clear categories, visible products, and room to browse.
                        </p>
                    </div>
                    <Link href="/new" className="inline-flex items-center gap-2 border border-black px-5 py-3 text-sm font-black uppercase tracking-[0.12em] hover:bg-lime-300">
                        Shop all <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {lanes.map((lane) => {
                        const Icon = lane.icon;
                        return (
                            <Link key={lane.title} href={lane.href} className="border border-black/15 bg-white p-5 shadow-[6px_6px_0_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:border-lime-400">
                                <Icon className="h-5 w-5 text-red-600" />
                                <p className="mt-4 text-2xl font-black uppercase leading-none">{lane.title}</p>
                                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">{lane.note}</p>
                            </Link>
                        );
                    })}
                </div>
            </div>
            <div className="mx-auto mt-8 grid max-w-[1600px] grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {cards.map((product, index) => {
                    const item = product as Product | undefined;
                    return (
                        <Link key={`${item?.id ?? "rack"}-${index}`} href={item?.slug ? `/product/${item.slug}` : "/new"} className="group border border-black/15 bg-white shadow-[6px_6px_0_rgba(0,0,0,0.08)]">
                            <div className="relative aspect-square bg-[#f8f7f2]">
                                {item?.image ? (
                                    <Image src={item.image} alt={item.title ?? "Product"} fill sizes="20vw" className="object-contain p-5 mix-blend-multiply transition group-hover:scale-105" />
                                ) : (
                                    <div className="h-full w-full animate-pulse bg-neutral-200" />
                                )}
                            </div>
                            <div className="border-t border-black/10 p-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-red-600">{item?.badge ?? "Artist"}</p>
                                <p className="mt-1 line-clamp-2 min-h-8 text-xs font-black leading-4">{item?.title ?? "Loading drop"}</p>
                                <p className="mt-2 text-sm font-black text-lime-700">{typeof item?.price === "number" ? `$${item.price}` : ""}</p>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}

function SceneTicker() {
    const phrases = [
        "Artist-run storefronts",
        "Limited edition drops",
        "Official band merch",
        "Worldwide shipping",
        "Eco friendly print",
        "Built after checkout",
    ];

    return (
        <section className="overflow-hidden border-y border-black bg-[#ef0000] text-black">
            <div className="flex w-max gap-10 py-3 text-[13px] font-black uppercase tracking-[0.24em]" style={{ animation: "home-new-marquee 34s linear infinite" }}>
                {[...phrases, ...phrases].map((phrase, index) => (
                    <span key={`${phrase}-${index}`} className={index % 2 ? "text-white" : ""}>
                        {phrase} <ArrowRight className="ml-2 inline h-3.5 w-3.5" />
                    </span>
                ))}
            </div>
        </section>
    );
}

function SceneEngine({ products, loading }: { products: Product[]; loading: boolean }) {
    const cards = loading ? Array.from({ length: 3 }) : products.slice(0, 3);

    return (
        <section className="relative overflow-hidden border-b border-neutral-800 bg-[#080808]">
            <Image src={crowdImage} alt="" fill sizes="100vw" className="object-cover opacity-22 grayscale" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#080808_0%,rgba(8,8,8,0.82)_48%,rgba(8,8,8,0.94)_100%)]" />
            <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(90deg,rgba(255,255,255,0.24)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:80px_80px]" />
            <div className="relative z-10 grid min-h-[520px] lg:grid-cols-[0.92fr_1.08fr]">
                <div className="flex flex-col justify-between border-b border-white/10 p-6 md:p-10 lg:border-b-0 lg:border-r">
                    <div>
                        <span className="inline-flex bg-lime-300 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-black">
                            Why Merch Tent
                        </span>
                        <h2 className="mt-5 max-w-3xl text-5xl font-black uppercase leading-[0.9] md:text-7xl">
                            The drop should launch before the boxes exist.
                        </h2>
                        <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-300">
                            Artists design once, fans shop straight away, and fulfilment only starts when someone buys. Less risk for bands, more fresh merch for the scene.
                        </p>
                    </div>
                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                        <Link href="/start" className="group flex min-h-24 items-end justify-between border border-lime-300 bg-lime-300 p-5 text-black">
                            <span>
                                <span className="block text-[11px] font-black uppercase tracking-[0.2em]">For artists</span>
                                <span className="mt-2 block text-2xl font-black uppercase leading-none">Build a drop</span>
                            </span>
                            <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                        </Link>
                        <Link href="/new" className="group flex min-h-24 items-end justify-between border border-white/20 bg-black/50 p-5 text-white">
                            <span>
                                <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-[#ef0000]">For fans</span>
                                <span className="mt-2 block text-2xl font-black uppercase leading-none">Shop live merch</span>
                            </span>
                            <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                        </Link>
                    </div>
                </div>
                <div className="grid bg-[#f2f0ea] text-black md:grid-cols-[0.95fr_1.05fr]">
                    <div className="border-b border-black/15 p-6 md:p-8 lg:border-b-0 lg:border-r">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#ef0000]">Live products</p>
                        <h3 className="mt-3 text-4xl font-black uppercase leading-none">Fresh merch fans can buy now.</h3>
                        <div className="mt-6 space-y-3">
                            {cards.map((product, index) => {
                                const item = product as Product | undefined;
                                return (
                                    <Link
                                        key={item?.id ?? index}
                                        href={item?.slug ? `/product/${item.slug}` : "/new"}
                                        className="group grid grid-cols-[96px_1fr_auto] items-center gap-4 border border-black/15 bg-white p-2 transition hover:-translate-y-0.5 hover:border-[#ef0000]"
                                    >
                                        <div className="relative aspect-square overflow-hidden rounded-sm bg-neutral-100">
                                            {item?.image ? (
                                                <Image src={item.image} alt={item.title ?? "Product"} fill sizes="120px" className="object-contain p-2" />
                                            ) : (
                                                <div className="h-full w-full animate-pulse bg-neutral-200" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ef0000]">
                                                {index === 0 ? "Counter pick" : "New drop"}
                                            </p>
                                            <p className="mt-1 line-clamp-2 text-sm font-black leading-5">{item?.title ?? "Loading drop"}</p>
                                            <p className="mt-1 text-lg font-black text-lime-700">${Number(item?.price ?? 39).toFixed(2)}</p>
                                        </div>
                                        <ArrowRight className="mr-2 h-5 w-5 text-[#ef0000] transition group-hover:translate-x-1" />
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex flex-col justify-between bg-black p-6 text-white md:p-8">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-lime-300">How it works</p>
                            <h3 className="mt-3 text-4xl font-black uppercase leading-none">One loop. Everyone knows their part.</h3>
                        </div>
                        <div className="mt-8 space-y-4">
                            {[
                                ["01", "Design", "Artist builds the product and mockups in the designer."],
                                ["02", "Publish", "The listing goes live without buying stock first."],
                                ["03", "Order", "Fan buys, earns credits, and triggers fulfilment."],
                                ["04", "Payout", "Artist sees units sold and profit owed."],
                            ].map(([label, title, body]) => (
                                <div key={label} className="grid grid-cols-[44px_1fr] gap-4 border-t border-white/12 pt-4">
                                    <span className="text-2xl font-black text-lime-300">{label}</span>
                                    <div>
                                        <p className="text-lg font-black uppercase">{title}</p>
                                        <p className="mt-1 text-sm leading-5 text-neutral-400">{body}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 grid grid-cols-3 border border-white/12">
                            {[
                                ["No upfront stock", "For artists"],
                                ["Fan credits", "For buyers"],
                                ["Supplier routing", "For ops"],
                            ].map(([title, label]) => (
                                <div key={title} className="border-r border-white/12 p-4 last:border-r-0">
                                    <p className="text-sm font-black">{title}</p>
                                    <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-neutral-500">{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function RotatingArtistFeature({
    features,
    fallbackArtists,
    products,
    loading,
}: {
    features: ArtistFeature[];
    fallbackArtists: Artist[];
    products: Product[];
    loading: boolean;
}) {
    const [activeIndex, setActiveIndex] = useState(0);
    const fallbackFeatures = fallbackArtists.map((artist, index) => ({
        id: artist.id ?? `fallback-${index}`,
        name: artist.display_name ?? artist.name ?? "Featured artist",
        slug: artist.slug ?? artist.id ?? "artists",
        bio: "Real photos, fresh drops, and a storefront that feels connected to the band, not just the product grid.",
        image: artist.image ?? "/images/artist-photos/spank-01.jpg",
        photos: [
            { id: `spank-01-${index}`, image: "/images/artist-photos/spank-01.jpg", caption: "Live room energy." },
            { id: `spank-02-${index}`, image: "/images/artist-photos/spank-02.jpg", caption: "Promo moments for the artist page." },
            { id: `spank-03-${index}`, image: "/images/artist-photos/spank-03.jpg", caption: "A real band feed for real merch." },
        ],
        products: products.slice(index, index + 4),
    }));
    const items = features.length ? features : fallbackFeatures;
    const active = items[activeIndex % Math.max(items.length, 1)];
    const activeProducts = active?.products?.length ? active.products : products.slice(0, 4);
    const activePhotos = active?.photos?.length
        ? active.photos
        : [{ id: "fallback-photo", image: active?.image ?? "/images/artist-photos/spank-01.jpg", caption: active?.name }];

    useEffect(() => {
        if (items.length <= 1) return;
        const timer = window.setInterval(() => {
            setActiveIndex((current) => (current + 1) % items.length);
        }, 6500);
        return () => window.clearInterval(timer);
    }, [items.length]);

    if (loading && !products.length) {
        return (
            <section className="border-b border-neutral-800 bg-black p-5 md:p-10">
                <div className="h-[560px] animate-pulse bg-neutral-950" />
            </section>
        );
    }

    return (
        <section className="border-b border-neutral-800 bg-black px-4 py-14 md:px-8 md:py-20">
            <div className="mx-auto mb-8 max-w-[1600px]">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">Scene feature</p>
                <h2 className="mt-2 max-w-5xl text-5xl font-black uppercase leading-[0.9] md:text-7xl">
                    One artist at a time. Real photos, real merch.
                </h2>
            </div>
            <div className="mx-auto grid max-w-[1600px] border border-neutral-800 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="relative min-h-[620px] overflow-hidden border-b border-neutral-800 lg:border-b-0 lg:border-r">
                    {activePhotos[0]?.image ? (
                        <Image
                            src={activePhotos[0].image}
                            alt={active?.name ?? "Featured artist"}
                            fill
                            sizes="(max-width: 1024px) 100vw, 45vw"
                            className="object-cover opacity-80"
                        />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/52 to-black/8" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(190,242,100,0.16),transparent_22%)]" />
                    <div className="relative z-10 flex min-h-[620px] flex-col justify-between p-5 md:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="inline-flex bg-lime-300 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-black">
                                Artist on the rise
                            </p>
                            <Link
                                href={active?.slug ? `/artists/${active.slug}` : "/artists"}
                                className="inline-flex items-center gap-2 border border-white/20 bg-black/50 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] hover:border-lime-300 hover:text-lime-300"
                            >
                                View artist
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>

                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-500">Featured now</p>
                            <h2 className="mt-3 text-5xl font-black uppercase leading-[0.86] md:text-7xl">
                                {active?.name ?? "Featured artist"}
                            </h2>
                            <p className="mt-5 max-w-2xl text-base font-bold leading-7 text-neutral-200">
                                {active?.bio ||
                                    "Live photos, product drops, and the story behind the artist all in one place."}
                            </p>
                            <div className="mt-7 flex flex-wrap gap-3">
                                {items.slice(0, 5).map((item, index) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setActiveIndex(index)}
                                        className={`h-2.5 w-14 transition ${index === activeIndex % items.length ? "bg-lime-300" : "bg-white/25 hover:bg-white/50"}`}
                                        aria-label={`Show ${item.name}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-[#f2f0ea] text-black">
                    <div className="border-b border-black/15 p-5 md:p-8">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-600">Real artist feed</p>
                        <h2 className="mt-2 max-w-3xl text-4xl font-black uppercase leading-[0.88] md:text-6xl">
                            Photos from the band. Products from the shop.
                        </h2>
                    </div>

                    <div className="grid border-b border-black/15 md:grid-cols-3">
                        {activePhotos.slice(0, 3).map((photo, index) => (
                            <div key={photo.id} className="border-b border-r border-black/15 md:border-b-0">
                                <div className="relative aspect-[4/3] bg-neutral-900">
                                    <Image
                                        src={photo.image}
                                        alt={photo.caption ?? `${active?.name ?? "Artist"} photo`}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 18vw"
                                        className="object-cover"
                                    />
                                    <span className={`absolute left-3 top-3 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${index === 1 ? "bg-lime-300 text-black" : "bg-red-600 text-white"}`}>
                                        Photo 0{index + 1}
                                    </span>
                                </div>
                                <p className="min-h-16 p-3 text-sm font-bold leading-5 text-neutral-700">
                                    {photo.caption ?? "Band photo"}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="p-5 md:p-8">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-lime-700">
                                Current merch
                            </p>
                            <Link href={active?.slug ? `/artists/${active.slug}` : "/new"} className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em]">
                                Shop artist <ArrowRight className="h-4 w-4 text-red-600" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 gap-px bg-black/20 md:grid-cols-4">
                            {fill(activeProducts, 4).map((product, index) => (
                                <Link
                                    key={`${product?.id ?? "artist-feature-product"}-${index}`}
                                    href={product?.slug ? `/product/${product.slug}` : "/new"}
                                    className="group bg-white"
                                >
                                    <div className="relative aspect-square">
                                        {product?.image ? (
                                            <Image
                                                src={product.image}
                                                alt={product.title ?? "Artist product"}
                                                fill
                                                sizes="(max-width: 768px) 50vw, 13vw"
                                                className="object-contain p-5 mix-blend-multiply transition group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="h-full w-full animate-pulse bg-neutral-200" />
                                        )}
                                    </div>
                                    <div className="border-t border-black/10 bg-black p-3 text-white">
                                        <p className="line-clamp-2 min-h-9 text-xs font-black leading-tight">
                                            {product?.title ?? "New drop coming soon"}
                                        </p>
                                        <p className="mt-2 text-sm font-black text-lime-300">
                                            {typeof product?.price === "number" ? `$${product.price}` : "Live soon"}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function AccountPaths() {
    return (
        <section className="grid border-b border-neutral-800 bg-black md:grid-cols-2">
            <div className="border-b border-neutral-800 p-6 md:border-b-0 md:border-r md:p-10">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#ef0000]">Artist or fan</p>
                <h2 className="mt-3 text-5xl font-black uppercase leading-none md:text-7xl">Same scene. Different tools.</h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-400">
                    Artists get design, launch, sales and payout tools. Fans get orders, credits, saved artists and wishlists.
                </p>
            </div>
            <div className="grid sm:grid-cols-2">
                <Link href="/auth/sign-up?type=artist" className="group border-b border-r border-neutral-800 bg-[#ef0000] p-6 text-white md:p-10">
                    <Shirt className="h-7 w-7" />
                    <h3 className="mt-16 text-4xl font-black uppercase leading-none">Artist account</h3>
                    <p className="mt-4 text-sm font-bold leading-6">Open your profile, design products, publish drops and sell without stock risk.</p>
                    <ArrowRight className="mt-8 h-5 w-5 transition group-hover:translate-x-1" />
                </Link>
                <Link href="/auth/sign-up?type=fan" className="group border-b border-neutral-800 bg-neutral-950 p-6 md:p-10">
                    <Users className="h-7 w-7 text-lime-300" />
                    <h3 className="mt-16 text-4xl font-black uppercase leading-none">Fan account</h3>
                    <p className="mt-4 text-sm leading-6 text-neutral-400">Track orders, save artists, earn merch credits and back drops early.</p>
                    <ArrowRight className="mt-8 h-5 w-5 text-lime-300 transition group-hover:translate-x-1" />
                </Link>
            </div>
        </section>
    );
}

function LatestDropWall({ products, loading }: { products: Product[]; loading: boolean }) {
    const cards = loading ? Array.from({ length: 8 }) : fill(products, 8);

    return (
        <section className="border-b border-neutral-200 bg-[#f2f0ea] px-4 py-14 text-black md:px-8 md:py-20">
            <div className="mx-auto max-w-[1600px]">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-600">Fresh from the table</p>
                        <h2 className="mt-2 text-5xl font-black uppercase leading-none md:text-7xl">Latest drop</h2>
                        <p className="mt-2 text-sm font-bold text-neutral-600">Graphic tees, vinyl, posters and more.</p>
                    </div>
                    <Link href="/new" className="hidden items-center gap-2 border border-black px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-black hover:bg-lime-300 md:inline-flex">
                        View all <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
            <div className="mx-auto mt-8 grid max-w-[1600px] gap-4 md:grid-cols-4">
                {cards.map((product, index) => {
                    const item = product as Product | undefined;
                    return (
                        <Link key={`${item?.id ?? "latest"}-${index}`} href={item?.slug ? `/product/${item.slug}` : "/new"} className={`group border border-black/15 bg-white text-black shadow-[8px_8px_0_rgba(0,0,0,0.08)] ${index >= 6 ? "hidden md:block" : ""}`}>
                            <div className="relative aspect-[4/4.5] bg-[#f7f6f1]">
                                <span className={`absolute left-3 top-3 z-10 px-2 py-1 text-[10px] font-black uppercase ${index % 2 === 0 ? "bg-[#ef0000] text-white" : "bg-lime-300 text-black"}`}>
                                    {index === 0 ? "Counter pick" : item?.badge ?? "Live"}
                                </span>
                                <span className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center border border-black/15 bg-white">♡</span>
                                {item?.image ? (
                                    <Image src={item.image} alt={item.title ?? "Product"} fill sizes="25vw" className="object-contain p-10 mix-blend-multiply transition group-hover:scale-105" />
                                ) : (
                                    <div className="h-full w-full animate-pulse bg-neutral-200" />
                                )}
                            </div>
                            <div className="min-h-32 border-t border-black/10 p-4 text-black">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-600">{item?.badge ?? dropNames[index % dropNames.length]}</p>
                                <p className="mt-2 line-clamp-2 text-sm font-black leading-tight">{item?.title ?? "Loading product"}</p>
                                <div className="mt-4 flex items-center justify-between">
                                    <p className="text-lg font-black text-lime-700">{typeof item?.price === "number" ? `$${item.price}` : "$39"}</p>
                                    <span className="grid h-8 w-8 place-items-center bg-black text-white transition group-hover:bg-lime-300 group-hover:text-black">
                                        <ArrowRight className="h-4 w-4" />
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}

function FeaturedArtistsNew({ artists, loading }: { artists: Artist[]; loading: boolean }) {
    const cards = loading ? Array.from({ length: 4 }) : artists.slice(0, 4);

    return (
        <section className="border-b border-neutral-800 bg-black px-5 py-16 md:px-10 md:py-20">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">
                        <Radio className="h-4 w-4" /> Tonight&apos;s lineup
                    </p>
                    <h2 className="mt-2 text-5xl font-black uppercase leading-none md:text-7xl">Featured artists</h2>
                    <p className="mt-2 text-sm text-neutral-400">Handpicked bands, fresh tents, real drops.</p>
                </div>
                <Link href="/artists" className="hidden border border-neutral-700 px-5 py-3 text-sm font-black hover:border-lime-300 md:block">View all</Link>
            </div>
            <div className="mt-7 grid gap-4 md:grid-cols-4">
                {cards.map((artist, index) => {
                    const item = artist as Artist | undefined;
                    const name = item?.display_name ?? item?.name ?? "Artist loading";
                    return (
                        <Link key={item?.id ?? index} href={item?.slug ? `/artists/${item.slug}` : "/artists"} className="group overflow-hidden border border-neutral-800 bg-neutral-950 hover:border-lime-300">
                            <div className="relative aspect-[4/3] bg-neutral-900">
                                {item?.image ? (
                                    <Image src={item.image} alt={name} fill sizes="25vw" className="object-cover transition duration-500 group-hover:scale-105" />
                                ) : (
                                    <div className="grid h-full place-items-center text-5xl font-black text-neutral-700">{name.slice(0, 2).toUpperCase()}</div>
                                )}
                                <span className={`absolute left-3 top-3 px-2 py-1 text-[10px] font-black uppercase ${index % 2 === 0 ? "bg-[#ef0000] text-white" : "bg-lime-300 text-black"}`}>Slot {String(index + 1).padStart(2, "0")}</span>
                            </div>
                            <div className="flex items-center justify-between p-4">
                                <p className="font-black">{name}</p>
                                <ArrowRight className="h-4 w-4 text-lime-300 transition group-hover:translate-x-1" />
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}

function CollectionBundle({ products, loading }: { products: Product[]; loading: boolean }) {
    const collectionCards = [
        { title: "Tees", href: "/category/tees", image: posterWallImage, meta: "tour staples // first drop" },
        { title: "Hoodies", href: "/category/hoodies", image: merchTableImage, meta: "late nights // loud backs" },
        { title: "Tanks", href: "/category/tanks", image: crowdImage, meta: "summer shows // pit ready" },
    ];
    const bundleProducts = loading ? [] : fill(products, 3);

    return (
        <section className="grid border-b border-neutral-800 bg-black lg:grid-cols-[1.15fr_0.85fr]">
            <div className="border-b border-neutral-800 lg:border-b-0 lg:border-r">
                <div className="p-6 md:p-12">
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">Featured collections</p>
                    <h2 className="mt-2 text-5xl font-black uppercase leading-none md:text-7xl">Pick your rack.</h2>
                </div>
                <div className="grid border-t border-neutral-800 md:grid-cols-3">
                    {collectionCards.map((collection) => (
                        <Link key={collection.title} href={collection.href} className="group relative min-h-[340px] overflow-hidden border-b border-r border-neutral-800">
                            <Image src={collection.image} alt="" fill sizes="33vw" className="object-cover opacity-45 grayscale transition group-hover:scale-105 group-hover:opacity-75 group-hover:grayscale-0" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-5">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-lime-300">[ {collection.meta} ]</p>
                                <h3 className="mt-3 text-4xl font-black uppercase leading-none">{collection.title}</h3>
                                <span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-lime-300">
                                    Shop now <ArrowRight className="h-4 w-4" />
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
            <div className="bg-neutral-950">
                <div className="border-b border-neutral-800 p-6 md:p-12">
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">Mixtape bundle</p>
                    <h2 className="mt-2 text-4xl font-black uppercase leading-none md:text-6xl">Band merch on a budget.</h2>
                    <p className="mt-4 text-sm leading-6 text-neutral-400">
                        Bundle tees, hoodies, tour packs and fan credits into one proper scene purchase.
                    </p>
                </div>
                <div className="grid grid-cols-[1fr_150px] gap-4 p-6 md:p-12">
                    <div>
                        <div className="grid grid-cols-3 gap-2">
                            {bundleProducts.map((product, index) => (
                                <div key={`${product.id ?? "bundle"}-${index}`} className="relative aspect-[3/4] bg-white">
                                    {product.image && <Image src={product.image} alt={product.title ?? "Product"} fill sizes="150px" className="object-contain p-3" />}
                                </div>
                            ))}
                        </div>
                        <Link href="/bundles" className="mt-5 inline-flex items-center gap-2 bg-lime-300 px-5 py-3 text-sm font-black text-black">
                            Build a bundle <Gift className="h-4 w-4" />
                        </Link>
                    </div>
                    <div className="border border-neutral-800 bg-black p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-400">Featured item</p>
                        <p className="mt-4 line-clamp-4 text-sm font-black">{bundleProducts[0]?.title ?? "Drop loading"}</p>
                        <p className="mt-3 text-4xl font-black text-lime-300">{typeof bundleProducts[0]?.price === "number" ? `$${bundleProducts[0].price}` : "$39"}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function SocialFeed({ polaroids, loading }: { polaroids: Polaroid[]; loading: boolean }) {
    const fallback = [
        { id: "fallback-1", image: crowdImage, caption: "Gig nights, fan fits, and product stories from the room.", link: "https://www.instagram.com/merchtent.au/" },
        { id: "fallback-2", image: studioImage, caption: "First samples, late design edits, and the bits before launch.", link: "https://www.instagram.com/merchtent.au/" },
        { id: "fallback-3", image: merchTableImage, caption: "The merch table energy, rebuilt online.", link: "https://www.instagram.com/merchtent.au/" },
        { id: "fallback-4", image: posterWallImage, caption: "Fans wearing the scene before everyone else catches on.", link: "https://www.instagram.com/merchtent.au/" },
    ];
    const posts = loading ? fallback : polaroids.length > 0 ? polaroids : fallback;

    return (
        <section className="border-b border-neutral-800 bg-black">
            <div className="px-5 py-16 md:px-10 md:py-20">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">Backstage feed</p>
                        <h2 className="mt-2 text-5xl font-black uppercase leading-none md:text-7xl">Real posts. Real rooms.</h2>
                    </div>
                    <Link href="https://www.instagram.com/merchtent.au/" target="_blank" rel="noopener noreferrer" className="hidden items-center gap-2 border border-neutral-700 px-5 py-3 text-sm font-black text-lime-300 hover:border-lime-300 md:inline-flex">
                        Instagram <Instagram className="h-4 w-4" />
                    </Link>
                </div>
            </div>
            <div className="grid border-t border-neutral-800 md:grid-cols-4">
                {posts.slice(0, 4).map((post, index) => (
                    <Link key={post.id} href={post.link ?? "https://www.instagram.com/merchtent.au/"} target="_blank" rel="noopener noreferrer" className="group relative min-h-[360px] overflow-hidden border-b border-r border-neutral-800">
                        {post.image && <Image src={post.image} alt={post.caption ?? "Backstage post"} fill sizes="25vw" className="object-cover opacity-55 grayscale transition group-hover:scale-105 group-hover:opacity-80 group-hover:grayscale-0" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10" />
                        <div className="absolute inset-x-0 bottom-0 p-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-300">[ post {String(index + 1).padStart(2, "0")} ]</p>
                            <p className="mt-3 line-clamp-3 text-xl font-black leading-tight">{post.caption}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}

function RealLifeAndReviews({ fanShouts }: { fanShouts: FanShout[] }) {
    const fallback = [
        { id: "fallback-a", name: "Mia", text: "This feels like finding a band before the rest of the city does.", rating: 5 },
        { id: "fallback-b", name: "Jase", text: "Bought the tee after the set. The credits idea makes me come back.", rating: 5 },
        { id: "fallback-c", name: "Tara", text: "It feels connected to the artists, not like random merch.", rating: 5 },
    ];
    const shouts = fanShouts.length > 0 ? fanShouts : fallback;

    return (
        <section className="grid border-b border-neutral-800 bg-black lg:grid-cols-[320px_1fr]">
            <div className="border-b border-neutral-800 p-6 md:p-12 lg:border-b-0 lg:border-r">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">Real life in the loop</p>
                <p className="mt-8 text-7xl font-black">4.8</p>
                <div className="mt-2 flex text-lime-300">
                    {Array.from({ length: 5 }).map((_, index) => <Star key={index} className="h-5 w-5 fill-current" />)}
                </div>
                <p className="mt-3 text-sm text-neutral-400">Fan shouts and early proof.</p>
            </div>
            <div className="grid md:grid-cols-3">
                {shouts.slice(0, 3).map((shout, index) => (
                    <div key={shout.id} className="min-h-[300px] border-b border-r border-neutral-800 bg-neutral-950 p-6 md:p-8">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-300">[ shout {String(index + 1).padStart(2, "0")} ]</p>
                        <p className="mt-8 text-2xl font-black leading-tight">&ldquo;{shout.text}&rdquo;</p>
                        <p className="mt-8 text-sm font-black text-neutral-300">{shout.name ?? "Fan"}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function CommunityScene({ artists }: { artists: Artist[] }) {
    const quoteArtist = artists[0]?.display_name ?? artists[0]?.name ?? "Hollow Core";

    return (
        <section className="relative grid border-b border-neutral-800 bg-[#101010] lg:grid-cols-[1.55fr_0.8fr]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(255,255,255,0.08),transparent_23%)]" />
            <div className="relative border-b border-neutral-800 p-6 md:p-10 lg:border-b-0 lg:border-r">
                <div className="flex items-end justify-between gap-4">
                    <h2 className="text-3xl font-black">From the community</h2>
                    <Link href="/artists" className="inline-flex items-center gap-2 text-sm font-black text-lime-300">
                        View all posts <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                    {community.map((post) => (
                        <article key={post.handle} className="overflow-hidden rounded-md border border-white/10 bg-black/35">
                            <div className="relative aspect-[4/3]">
                                <Image src={post.image} alt="" fill sizes="28vw" className="object-cover opacity-78" />
                                <span className="absolute left-3 top-3 text-sm font-bold text-white">
                                    {post.handle}
                                </span>
                                <span className="absolute left-3 top-9 text-xs text-neutral-300">2h ago</span>
                            </div>
                            <p className="p-4 text-sm leading-6 text-neutral-300">{post.text}</p>
                        </article>
                    ))}
                </div>
            </div>
            <aside className="relative flex items-center p-6 md:p-10">
                <div>
                    <p className="text-8xl font-black leading-none text-lime-300">“</p>
                    <blockquote className="-mt-6 max-w-sm text-2xl leading-tight text-neutral-100">
                        Merch Tent makes it easy to launch our ideas and get them to our fans.
                    </blockquote>
                    <div className="mt-6 flex items-center gap-3">
                        <span className="flex -space-x-2">
                            {artists.slice(0, 3).map((artist, index) => (
                                <span key={artist?.id ?? index} className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-[#101010] bg-neutral-700">
                                    {artist?.image ? (
                                        <Image src={artist.image} alt={artist.name ?? ""} fill sizes="32px" className="object-cover" />
                                    ) : null}
                                </span>
                            ))}
                        </span>
                        <p className="text-sm text-neutral-400">- {quoteArtist}</p>
                    </div>
                </div>
            </aside>
        </section>
    );
}

function StartBridge() {
    return (
        <section className="grid border-b border-neutral-800 bg-lime-300 text-black lg:grid-cols-[1fr_auto]">
            <div className="p-6 md:p-10">
                <p className="text-[11px] font-black uppercase tracking-[0.28em]">Want the full artist flow?</p>
                <h2 className="mt-2 max-w-5xl text-5xl font-black uppercase leading-none md:text-7xl">
                    See how a drop goes from artwork to checkout.
                </h2>
                <p className="mt-4 max-w-2xl text-sm font-bold leading-6 text-black/70">
                    The homepage is the front table. The start page explains the designer, mockups, fulfilment routing, fan credits, and artist payouts.
                </p>
            </div>
            <div className="flex items-center p-6 md:p-10">
                <Link href="/start" className="inline-flex items-center gap-3 bg-black px-6 py-4 text-sm font-black text-white">
                    Walk through the platform <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </section>
    );
}

function JoinTheListNew() {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage(null);
        setError(null);

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            setError("Enter a real email so we can reach you.");
            return;
        }

        try {
            setLoading(true);
            const response = await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    name: name || undefined,
                    source: "home-new:join-the-list",
                }),
            });
            const json = await response.json();
            if (!response.ok) throw new Error(json?.error || "Subscription failed");
            setMessage("You are on the list. First drops, platform notes and early access will land there.");
            setEmail("");
            setName("");
        } catch {
            setError("Could not join the list right now. Try again in a moment.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="border-b border-neutral-800 bg-black px-5 py-12 md:px-10">
            <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">Join the list</p>
                    <h2 className="mt-3 text-5xl font-black uppercase leading-none md:text-7xl">First dibs on drops.</h2>
                    <p className="mt-4 text-sm leading-6 text-neutral-400">
                        Early artist invites, fresh merch, fan credit updates and scene news without the corporate fluff.
                    </p>
                </div>
                <form onSubmit={onSubmit} className="grid gap-3 self-end sm:grid-cols-[1fr_1fr_auto]">
                    <input
                        type="text"
                        placeholder="Name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className="h-14 border border-neutral-800 bg-neutral-950 px-4 text-sm font-bold text-white outline-none focus:border-red-500"
                    />
                    <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="h-14 border border-neutral-800 bg-neutral-950 px-4 text-sm font-bold text-white outline-none focus:border-red-500"
                    />
                    <button type="submit" disabled={loading} className="h-14 bg-[#ef0000] px-7 text-sm font-black text-white disabled:opacity-60">
                        {loading ? "Joining" : "Join"}
                    </button>
                    {message && <p className="text-sm font-bold text-lime-300 sm:col-span-3">{message}</p>}
                    {error && <p className="text-sm font-bold text-red-400 sm:col-span-3">{error}</p>}
                </form>
            </div>
        </section>
    );
}

function DropCard({ product, index, compact = false }: { product?: Product; index: number; compact?: boolean }) {
    return (
        <Link
            href={product?.slug ? `/product/${product.slug}` : "/new"}
            className="group bg-[#f8f7f2] shadow-[8px_8px_0_rgba(0,0,0,0.08)]"
        >
            <div className={`relative overflow-hidden rounded-t-[6px] bg-[#d8d5cc] ${compact ? "aspect-[4/4.45]" : "aspect-[4/5]"}`}>
                <span className="absolute left-2 top-2 z-10 rounded-sm bg-lime-300 px-2 py-1 text-[10px] font-black leading-none text-black">{`0${index + 1}:4${index + 2}:13`}</span>
                {product?.image ? (
                    <Image src={product.image} alt={product.title ?? "Product"} fill sizes="23vw" className="object-contain p-2 mix-blend-multiply transition group-hover:scale-105" />
                ) : (
                    <div className="h-full w-full animate-pulse bg-neutral-200" />
                )}
            </div>
            <div className="p-3">
                <p className="line-clamp-1 text-sm font-black leading-none">{product?.badge ?? dropNames[index] ?? "Scene artist"}</p>
                <p className="mt-1 line-clamp-2 min-h-9 text-sm leading-[1.15] text-neutral-700">{product?.title ?? "Loading product"}</p>
            </div>
            <div className="flex items-center justify-between px-3 text-sm">
                <span className="font-black text-lime-700">{typeof product?.price === "number" ? `$${product.price}` : "$39"}</span>
                <span className="font-black text-[#ef0000]">{12 + index * 5} left</span>
            </div>
            <div className="mx-3 mb-3 mt-2 h-1 bg-neutral-200">
                <div className="h-full bg-[#ef0000]" style={{ width: `${48 + index * 9}%` }} />
            </div>
        </Link>
    );
}
