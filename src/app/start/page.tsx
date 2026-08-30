import Image from "next/image";
import Link from "next/link";
import {
    ArrowRight,
    BadgeDollarSign,
    Check,
    CircleHelp,
    PackageCheck,
    Megaphone,
    Music2,
    Paintbrush,
    Shirt,
    Store,
    Upload,
} from "lucide-react";
import { StartProfitCalculator } from "./StartProfitCalculator";

const launchPaths = [
    {
        title: "I have finished artwork",
        body: "Upload the design, pick the tee, choose colours, and turn it into a shop-ready product.",
        icon: Upload,
        label: "Fastest path",
    },
    {
        title: "I have a logo or artwork",
        body: "Upload it yourself, place it on the product, preview the mockup, and save the drop when it feels right.",
        icon: Shirt,
        label: "Good first drop",
    },
    {
        title: "I know the band vibe",
        body: "Use your own images, artwork, text, and product choices to build a merch page that feels like the artist.",
        icon: Music2,
        label: "Self-guided",
    },
];

const simpleSteps = [
    {
        title: "Design",
        body: "Build the product and mockups in the designer.",
        icon: Paintbrush,
    },
    {
        title: "Publish",
        body: "The listing goes live without buying stock first.",
        icon: Store,
    },
    {
        title: "Order",
        body: "Fan buys, earns credits, and triggers fulfilment.",
        icon: PackageCheck,
    },
    {
        title: "Payout",
        body: "Artist sees units sold and profit owed.",
        icon: BadgeDollarSign,
    },
];

const setupHelp = [
    "Artist profile",
    "Catalogue blank",
    "Artwork upload",
    "Mockup preview",
    "Draft or publish",
    "Order-ready data",
];

const examples = [
    {
        artist: "Spank The 90s",
        product: "Logo hoodie",
        note: "A tribute act can turn a recognisable show identity into a simple first drop.",
        src: "/images/home-new-hero-merch-table.png",
    },
    {
        artist: "Lionel Loves Vinyl",
        product: "Classic logo tee",
        note: "A small logo can still feel like proper merch when the placement and mockups are right.",
        src: "/images/home-new-designer-shirt-preview.png",
    },
    {
        artist: "Madre Monte",
        product: "Artwork tee",
        note: "A poster, cover, or gig visual can become a wearable drop for existing fans.",
        src: "/images/merch-tent-logo-badge.png",
    },
];

export default function StartPage() {
    return (
        <main className="bg-black text-white">
            <section className="relative overflow-hidden border-b border-neutral-800">
                <div className="grid min-h-[calc(100vh-6rem)] lg:grid-cols-[0.92fr_1.08fr]">
                    <div className="relative flex flex-col justify-end border-b border-neutral-800 p-5 pb-10 md:p-8 md:pb-12 lg:border-b-0 lg:border-r">
                        <div className="absolute inset-0">
                            <Image
                                src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1800&q=80"
                                alt="Fans at a live music show"
                                fill
                                sizes="(max-width: 1024px) 100vw, 46vw"
                                className="object-cover opacity-45"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/72 to-black/20" />
                        </div>

                        <div className="relative z-10 max-w-3xl">
                            <p className="inline-flex bg-lime-300 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-black">
                                Artist self-service
                            </p>
                            <h1 className="mt-5 text-5xl font-black uppercase leading-[0.88] md:text-7xl xl:text-8xl">
                                Build your own drop. Publish when ready.
                            </h1>
                            <p className="mt-5 max-w-2xl text-base font-bold leading-7 text-neutral-200 md:text-lg">
                                Merch Tent is built for artists who want to design merch, preview mockups, and launch
                                without ordering boxes first. Bring your own artwork, choose a blank, and use the tools
                                to make the product yourself.
                            </p>
                            <div className="mt-7 flex flex-wrap gap-3">
                                <Link
                                    href="/auth/sign-up?type=artist"
                                    className="inline-flex items-center gap-2 bg-lime-300 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-black hover:bg-lime-200"
                                >
                                    Start as artist
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                                <Link
                                    href="/start#how-it-works"
                                    className="inline-flex items-center gap-2 border border-white/30 bg-black/60 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white hover:border-lime-300 hover:text-lime-300"
                                >
                                    See the steps
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                            <p className="mt-4 text-sm font-bold text-neutral-400">
                                Start with one product, keep it simple, and publish only when the mockup and listing are ready.
                            </p>
                        </div>
                    </div>

                    <div className="grid bg-neutral-950 md:grid-cols-2">
                        <div className="relative min-h-[360px] overflow-hidden border-b border-neutral-800 md:border-r">
                            <Image
                                src="https://images.unsplash.com/photo-1521337581100-8ca9a73a5f79?auto=format&fit=crop&w=1200&q=80"
                                alt="Merch hanging on a rack"
                                fill
                                sizes="(max-width: 768px) 100vw, 27vw"
                                className="object-cover"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
                            <div className="absolute bottom-5 left-5 right-5">
                                <p className="w-fit bg-red-600 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                                    Example
                                </p>
                                <p className="mt-3 text-3xl font-black uppercase leading-none">
                                    A tee can be enough to start.
                                </p>
                            </div>
                        </div>
                        <div className="relative min-h-[360px] overflow-hidden border-b border-neutral-800">
                            <Image
                                src="https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80"
                                alt="Music desk and creative workspace"
                                fill
                                sizes="(max-width: 768px) 100vw, 27vw"
                                className="object-cover opacity-80"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
                            <div className="absolute bottom-5 left-5 right-5">
                                <p className="w-fit bg-lime-300 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black">
                                    You build
                                </p>
                                <p className="mt-3 text-3xl font-black uppercase leading-none">
                                    Artwork, mockups, listing.
                                </p>
                            </div>
                        </div>
                        <div className="border-b border-neutral-800 bg-black p-5 md:col-span-2 md:p-8">
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-500">
                                First drop promise
                            </p>
                            <h2 className="mt-3 max-w-3xl text-4xl font-black uppercase leading-[0.9] md:text-6xl">
                                No merch jargon. No big buy-in. Just a clear first launch.
                            </h2>
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-neutral-950">
                <div className="grid md:grid-cols-4">
                    {[
                        ["Logo is enough", "upload it yourself"],
                        ["Start with one tee", "keep the first drop simple"],
                        ["Mockups before print", "show fans the product"],
                        ["Built after checkout", "less upfront risk"],
                    ].map(([label, detail]) => (
                        <div key={label} className="border-b border-r border-neutral-800 p-5 md:border-b-0">
                            <p className="text-2xl font-black uppercase">{label}</p>
                            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-lime-300">{detail}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-black p-5 md:p-8">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-500">Choose your start</p>
                        <h2 className="mt-2 text-5xl font-black uppercase leading-[0.88] md:text-7xl">
                            Come in wherever you are.
                        </h2>
                    </div>
                    <Link
                        href="#how-it-works"
                        className="inline-flex items-center gap-2 border border-neutral-700 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white hover:border-lime-300 hover:text-lime-300"
                    >
                        See the flow
                        <CircleHelp className="h-4 w-4" />
                    </Link>
                </div>

                <div className="grid gap-px bg-neutral-800 lg:grid-cols-3">
                    {launchPaths.map((path) => {
                        const Icon = path.icon;
                        return (
                            <article key={path.title} className="bg-neutral-950 p-5 md:p-7">
                                <div className="flex items-start justify-between gap-4">
                                    <span className="bg-lime-300 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-black">
                                        {path.label}
                                    </span>
                                    <Icon className="h-7 w-7 text-red-500" />
                                </div>
                                <h3 className="mt-16 text-3xl font-black uppercase leading-none">{path.title}</h3>
                                <p className="mt-4 text-sm leading-6 text-neutral-400">{path.body}</p>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section id="how-it-works" className="border-b border-neutral-800 bg-[#f3f1e8] text-black">
                <div className="grid lg:grid-cols-[0.88fr_1.12fr]">
                    <div className="border-b border-neutral-300 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-600">Self-service setup</p>
                        <h2 className="mt-2 max-w-2xl text-5xl font-black uppercase leading-[0.88] md:text-7xl">
                            Your artwork. Your product. Your launch.
                        </h2>
                        <p className="mt-5 max-w-xl text-base leading-7 text-neutral-700">
                            The artist path is built to be direct: create the profile, choose a catalogue product, upload
                            your artwork, preview the mockups, then save a draft or publish to your shop.
                        </p>
                        <div className="mt-7 flex flex-wrap gap-3">
                            <Link
                                href="/auth/sign-up?type=artist"
                                className="inline-flex items-center gap-2 bg-red-600 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white hover:bg-red-500"
                            >
                                Create artist account
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/dashboard/products/designer"
                                className="inline-flex items-center gap-2 border border-black px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-black hover:bg-lime-300"
                            >
                                Open product designer
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2">
                        {setupHelp.map((item) => (
                            <div key={item} className="flex min-h-32 items-center gap-4 border-b border-r border-neutral-300 p-5">
                                <span className="grid h-10 w-10 shrink-0 place-items-center bg-lime-300">
                                    <Check className="h-5 w-5" />
                                </span>
                                <p className="text-xl font-black uppercase leading-none">{item}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-black">
                <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">How it works</p>
                        <h2 className="mt-2 max-w-3xl text-5xl font-black uppercase leading-[0.88] md:text-7xl">
                            One loop. Everyone knows their part.
                        </h2>
                        <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-300">
                            The journey stays simple for artists and fans: design the drop, publish the listing, take the
                            order, then track the payout.
                        </p>
                    </div>
                    <div className="relative min-h-[420px] overflow-hidden">
                        <Image
                            src="/images/home-new-designer-shirt-preview.png"
                            alt="Product designer mockup preview"
                            fill
                            sizes="(max-width: 1024px) 100vw, 54vw"
                            className="object-cover opacity-40"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/72 to-black/35" />
                        <div className="relative grid h-full content-end gap-px bg-black/20 p-5 md:p-8 sm:grid-cols-3">
                            {[
                                ["No upfront stock", "For artists"],
                                ["Fan credits", "For buyers"],
                                ["Supplier routing", "For ops"],
                            ].map(([title, label]) => (
                                <div key={title} className="border border-white/15 bg-black/70 p-5 backdrop-blur-sm">
                                    <p className="text-xl font-black uppercase leading-none">{title}</p>
                                    <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                                        {label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="grid md:grid-cols-4">
                    {simpleSteps.map((step, index) => {
                        const Icon = step.icon;
                        return (
                            <article key={step.title} className="border-b border-r border-neutral-800 bg-black p-5 md:min-h-[240px] md:p-6">
                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-4xl font-black leading-none text-lime-300">
                                        0{index + 1}
                                    </span>
                                    <Icon className="h-6 w-6 text-red-500" />
                                </div>
                                <h3 className="mt-10 text-3xl font-black uppercase leading-none">{step.title}</h3>
                                <p className="mt-4 text-sm leading-6 text-neutral-400">{step.body}</p>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-black">
                <StartProfitCalculator />
            </section>

            <section className="border-b border-neutral-800 bg-neutral-950 p-5 md:p-8">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">Real examples</p>
                        <h2 className="mt-2 text-5xl font-black uppercase leading-[0.88] md:text-7xl">
                            First drops do not need to be huge.
                        </h2>
                    </div>
                    <Link
                        href="/artists"
                        className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.08em] text-lime-300 hover:text-white"
                    >
                        See artists
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                <div className="grid gap-px bg-neutral-800 lg:grid-cols-3">
                    {examples.map((example) => (
                        <article key={example.artist} className="bg-black">
                            <div className="relative aspect-[4/3] bg-neutral-900">
                                <Image
                                    src={example.src}
                                    alt={`${example.artist} merch example`}
                                    fill
                                    sizes="(max-width: 1024px) 100vw, 33vw"
                                    className="object-contain p-8"
                                />
                            </div>
                            <div className="border-t border-neutral-800 p-5">
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-500">{example.artist}</p>
                                <h3 className="mt-2 text-3xl font-black uppercase leading-none">{example.product}</h3>
                                <p className="mt-4 text-sm leading-6 text-neutral-400">{example.note}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className="relative overflow-hidden bg-red-600 text-white">
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
                            Open the tent. Launch the first tee.
                        </h2>
                        <p className="mt-5 max-w-2xl text-base font-bold leading-7 text-white/85">
                            Start small, see what fans back, then build the next drop with more confidence.
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[460px]">
                        <Link
                            href="/auth/sign-up?type=artist"
                            className="inline-flex items-center justify-center gap-2 bg-lime-300 px-5 py-4 text-sm font-black uppercase tracking-[0.08em] text-black hover:bg-lime-200"
                        >
                            Start artist account
                            <BadgeDollarSign className="h-4 w-4" />
                        </Link>
                        <Link
                            href="/contact"
                            className="inline-flex items-center justify-center gap-2 border border-white/60 bg-black px-5 py-4 text-sm font-black uppercase tracking-[0.08em] text-white hover:bg-neutral-900"
                        >
                            Talk to us first
                            <Megaphone className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
