import Image from "next/image";
import Link from "next/link";
import {
    ArrowRight,
    BadgeDollarSign,
    Boxes,
    Check,
    ClipboardList,
    ImagePlus,
    Megaphone,
    PackageCheck,
    Paintbrush,
    Sparkles,
    Store,
    Truck,
} from "lucide-react";

const heroImages = [
    {
        src: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
        alt: "Live band on stage",
    },
    {
        src: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80",
        alt: "Crowd at a live show",
    },
    {
        src: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80",
        alt: "Singer performing in a small venue",
    },
];

const productTiles = [
    {
        title: "Tees",
        note: "First drop staple",
        src: "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=900&q=80",
    },
    {
        title: "Hoodies",
        note: "Cold night merch",
        src: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80",
    },
    {
        title: "Posters",
        note: "Wall-ready art",
        src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    },
    {
        title: "Tour packs",
        note: "Bundles for fans",
        src: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80",
    },
];

const steps = [
    {
        eyebrow: "01",
        title: "Create the drop",
        body: "Open the designer, place artwork, add text, choose product colours, and save the design data behind the listing.",
        icon: Paintbrush,
    },
    {
        eyebrow: "02",
        title: "Publish mockups",
        body: "Merch Tent generates shop-ready product images so the drop can go live without waiting for a production run.",
        icon: ImagePlus,
    },
    {
        eyebrow: "03",
        title: "Sell to fans",
        body: "Fans buy from your artist page, earn credits, and get a proper checkout and order trail.",
        icon: Store,
    },
    {
        eyebrow: "04",
        title: "Fulfil after sale",
        body: "When an order lands, the saved design data and product details are ready for fulfilment and reporting.",
        icon: PackageCheck,
    },
];

const promises = [
    {
        title: "No boxes first",
        body: "You do not need to buy a bulk run before you know what fans want.",
        icon: Boxes,
    },
    {
        title: "Made after sale",
        body: "Products are created when ordered, so dead stock is not the business model.",
        icon: Truck,
    },
    {
        title: "Artist records",
        body: "Drops stay tied to artist profiles, sales, product data, and payout reporting.",
        icon: ClipboardList,
    },
    {
        title: "Fan momentum",
        body: "Fans can discover artists early, buy merch, and build credits over time.",
        icon: Sparkles,
    },
];

export default function StartPage() {
    return (
        <main className="bg-black text-white">
            <section className="relative overflow-hidden border-b border-neutral-800">
                <div className="grid min-h-[calc(100vh-6rem)] lg:grid-cols-[1.02fr_0.98fr]">
                    <div className="relative flex flex-col justify-end border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <div className="absolute inset-0">
                            <Image
                                src="https://images.unsplash.com/photo-1521337581100-8ca9a73a5f79?auto=format&fit=crop&w=1800&q=80"
                                alt="Band merch and live venue atmosphere"
                                fill
                                sizes="(max-width: 1024px) 100vw, 52vw"
                                className="object-cover opacity-55"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/68 to-black/10" />
                            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_18px)] opacity-25" />
                        </div>

                        <div className="relative z-10 max-w-4xl">
                            <p className="inline-flex bg-red-600 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em]">
                                Artist launch kit
                            </p>
                            <h1 className="mt-5 text-6xl font-black uppercase leading-[0.82] md:text-8xl">
                                Make merch before you make the boxes.
                            </h1>
                            <p className="mt-5 max-w-2xl text-base font-bold leading-7 text-neutral-200 md:text-lg">
                                Build a drop, generate the mockups, publish to the shop, and fulfil only when fans buy.
                                Merch Tent is the merch table, designer, storefront, and order trail in one place.
                            </p>
                            <div className="mt-7 flex flex-wrap gap-3">
                                <Link
                                    href="/auth/sign-up?type=artist"
                                    className="inline-flex items-center gap-2 bg-red-600 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white hover:bg-red-500"
                                >
                                    Start as an artist
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                                <Link
                                    href="/dashboard/products/designer"
                                    className="inline-flex items-center gap-2 border border-white/30 bg-black/60 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white hover:border-red-400"
                                >
                                    See the designer
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="grid min-h-[620px] grid-cols-2 grid-rows-[1fr_0.92fr] bg-neutral-950">
                        <div className="relative col-span-2 overflow-hidden border-b border-neutral-800">
                            <Image
                                src={heroImages[0].src}
                                alt={heroImages[0].alt}
                                fill
                                sizes="(max-width: 1024px) 100vw, 48vw"
                                className="object-cover"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                            <div className="absolute bottom-5 left-5 right-5">
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-300">
                                    From stage to store
                                </p>
                                <p className="mt-2 text-3xl font-black uppercase leading-none">
                                    A real artist flow, not a generic print shop.
                                </p>
                            </div>
                        </div>
                        {heroImages.slice(1).map((image) => (
                            <div key={image.src} className="relative overflow-hidden border-r border-neutral-800 last:border-r-0">
                                <Image
                                    src={image.src}
                                    alt={image.alt}
                                    fill
                                    sizes="(max-width: 1024px) 50vw, 24vw"
                                    className="object-cover opacity-80"
                                />
                                <div className="absolute inset-0 bg-black/20" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800">
                <div className="grid md:grid-cols-4">
                    {[
                        ["0 upfront", "cost to launch"],
                        ["Live mockups", "generated for shop"],
                        ["Fan credits", "built into buying"],
                        ["Payout ready", "artist reporting"],
                    ].map(([label, detail]) => (
                        <div key={label} className="border-b border-r border-neutral-800 bg-neutral-950 p-5 md:border-b-0">
                            <p className="text-2xl font-black uppercase">{label}</p>
                            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">{detail}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-black">
                <div className="border-b border-neutral-800 p-5 md:p-8">
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-500">How artists launch</p>
                    <h2 className="mt-2 max-w-5xl text-5xl font-black uppercase leading-[0.88] md:text-7xl">
                        From first upload to live merch.
                    </h2>
                </div>

                <div className="grid lg:grid-cols-[1fr_1.1fr]">
                    <div className="grid md:grid-cols-2">
                        {steps.map((step) => {
                            const Icon = step.icon;
                            return (
                                <div key={step.title} className="min-h-[260px] border-b border-r border-neutral-800 bg-neutral-950 p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <p className="bg-red-600 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
                                            {step.eyebrow}
                                        </p>
                                        <Icon className="h-6 w-6 text-red-400" />
                                    </div>
                                    <h3 className="mt-14 text-3xl font-black uppercase leading-none">{step.title}</h3>
                                    <p className="mt-4 text-sm leading-6 text-neutral-400">{step.body}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="relative min-h-[620px] overflow-hidden border-neutral-800 lg:border-l">
                        <Image
                            src="https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1400&q=80"
                            alt="Music production desk and artist tools"
                            fill
                            sizes="(max-width: 1024px) 100vw, 54vw"
                            className="object-cover opacity-55"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/58 to-transparent" />
                        <div className="absolute inset-x-5 bottom-5 border border-neutral-700 bg-black/82 p-5 backdrop-blur md:inset-x-8 md:bottom-8 md:p-7">
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-400">
                                Product designer preview
                            </p>
                            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_180px]">
                                <div className="relative aspect-[4/3] border border-neutral-800 bg-neutral-950">
                                    <div className="absolute left-4 top-4 grid gap-2">
                                        {["Product", "Add text", "Artwork", "Layers"].map((label) => (
                                            <span key={label} className="border border-neutral-700 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-300">
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="absolute inset-y-8 left-[36%] right-10 rounded-t-[48%] bg-neutral-800" />
                                    <div className="absolute inset-y-8 left-[36%] right-10 grid place-items-center text-center">
                                        <p className="max-w-[160px] text-4xl font-black uppercase leading-none text-red-500">
                                            Your<br />drop<br />here
                                        </p>
                                    </div>
                                </div>
                                <div className="border border-neutral-800 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">Ready checks</p>
                                    <ul className="mt-4 space-y-3">
                                        {["Mockups", "Price", "Artist cut", "Fulfilment data"].map((item) => (
                                            <li key={item} className="flex items-center gap-2 text-sm font-bold">
                                                <Check className="h-4 w-4 text-red-500" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                    <Link
                                        href="/auth/sign-up?type=artist"
                                        className="mt-6 inline-flex w-full items-center justify-center bg-red-600 px-4 py-3 text-sm font-black hover:bg-red-500"
                                    >
                                        Build first product
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-neutral-950">
                <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-500">What can go live</p>
                        <h2 className="mt-2 text-5xl font-black uppercase leading-[0.9] md:text-7xl">
                            The first rack can be small and loud.
                        </h2>
                        <p className="mt-5 max-w-xl text-sm leading-6 text-neutral-400">
                            Start with a tee, hoodie, poster, or bundle. The point is to get merch into the scene without
                            gambling on cartons of sizes, colours, and designs fans might not buy yet.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2">
                        {productTiles.map((tile) => (
                            <Link
                                key={tile.title}
                                href="/auth/sign-up?type=artist"
                                className="group relative min-h-[320px] overflow-hidden border-b border-r border-neutral-800"
                            >
                                <Image
                                    src={tile.src}
                                    alt={tile.title}
                                    fill
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 28vw"
                                    className="object-cover opacity-55 transition duration-700 group-hover:scale-105 group-hover:opacity-75"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/38 to-transparent" />
                                <div className="absolute inset-x-5 bottom-5">
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-400">
                                        {tile.note}
                                    </p>
                                    <h3 className="mt-2 text-4xl font-black uppercase leading-none">{tile.title}</h3>
                                    <p className="mt-4 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-white">
                                        Launch this
                                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-black">
                <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="relative min-h-[620px] overflow-hidden border-b border-neutral-800 lg:border-b-0 lg:border-r">
                        <Image
                            src="https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?auto=format&fit=crop&w=1400&q=80"
                            alt="Fans at a show with lights"
                            fill
                            sizes="(max-width: 1024px) 100vw, 52vw"
                            className="object-cover opacity-70"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
                        <div className="absolute bottom-6 left-5 right-5 md:bottom-8 md:left-8 md:right-8">
                            <p className="inline-flex bg-red-600 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-white">
                                Fan powered
                            </p>
                            <h2 className="mt-5 max-w-3xl text-5xl font-black uppercase leading-[0.88] md:text-7xl">
                                Sell to people already backing the scene.
                            </h2>
                        </div>
                    </div>

                    <div className="grid content-center gap-px bg-neutral-800">
                        {promises.map((promise) => {
                            const Icon = promise.icon;
                            return (
                                <div key={promise.title} className="bg-neutral-950 p-5 md:p-7">
                                    <div className="flex items-start gap-4">
                                        <div className="grid h-12 w-12 shrink-0 place-items-center bg-red-600">
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black uppercase leading-none">{promise.title}</h3>
                                            <p className="mt-3 text-sm leading-6 text-neutral-400">{promise.body}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="relative overflow-hidden border-b border-neutral-800 bg-red-600 text-white">
                <div className="absolute inset-0 opacity-20">
                    <Image
                        src="https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2?auto=format&fit=crop&w=1800&q=80"
                        alt="Concert crowd background"
                        fill
                        sizes="100vw"
                        className="object-cover"
                    />
                </div>
                <div className="relative grid gap-8 p-5 md:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/80">Ready when you are</p>
                        <h2 className="mt-2 max-w-5xl text-5xl font-black uppercase leading-[0.86] md:text-8xl">
                            Launch the first drop. Keep the scene moving.
                        </h2>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[430px]">
                        <Link
                            href="/auth/sign-up?type=artist"
                            className="inline-flex items-center justify-center gap-2 bg-black px-5 py-4 text-sm font-black uppercase tracking-[0.08em] text-white hover:bg-neutral-900"
                        >
                            Start as an artist
                            <BadgeDollarSign className="h-4 w-4" />
                        </Link>
                        <Link
                            href="/artists"
                            className="inline-flex items-center justify-center gap-2 border border-white/60 bg-white px-5 py-4 text-sm font-black uppercase tracking-[0.08em] text-black hover:bg-neutral-100"
                        >
                            See artists
                            <Megaphone className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
