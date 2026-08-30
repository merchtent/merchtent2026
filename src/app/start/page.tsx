import Image from "next/image";
import Link from "next/link";
import {
    ArrowRight,
    BadgeDollarSign,
    Check,
    CircleHelp,
    ImagePlus,
    Mail,
    Megaphone,
    Music2,
    Paintbrush,
    Shirt,
    Store,
    Upload,
} from "lucide-react";

const launchPaths = [
    {
        title: "I have finished artwork",
        body: "Upload the design, pick the tee, choose colours, and turn it into a shop-ready product.",
        icon: Upload,
        label: "Fastest path",
    },
    {
        title: "I only have a logo",
        body: "Send it through and we can help set up a clean first tee so you can see the idea live.",
        icon: Shirt,
        label: "Good first drop",
    },
    {
        title: "I have the band, not the merch",
        body: "Tell us the vibe, music links, and rough direction. We will help shape the first product.",
        icon: Music2,
        label: "Guided setup",
    },
];

const simpleSteps = [
    {
        title: "Send the basics",
        body: "Band name, logo or artwork, links, and what kind of merch you want to start with.",
        icon: Mail,
    },
    {
        title: "Make the first tee",
        body: "Use the designer yourself or ask us to help place the artwork and set up a first product.",
        icon: Paintbrush,
    },
    {
        title: "Preview the drop",
        body: "Mockups show fans what they are buying before anything needs to be printed.",
        icon: ImagePlus,
    },
    {
        title: "Go live",
        body: "Publish to your artist page, share the link, and start taking real orders.",
        icon: Store,
    },
];

const setupHelp = [
    "Logo or artwork cleanup",
    "First tee layout",
    "Product name and description",
    "Pricing guidance",
    "Artist profile setup",
    "Shop launch checklist",
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
                                Artist onboarding
                            </p>
                            <h1 className="mt-5 text-5xl font-black uppercase leading-[0.88] md:text-7xl xl:text-8xl">
                                Start with a logo. Leave with a merch drop.
                            </h1>
                            <p className="mt-5 max-w-2xl text-base font-bold leading-7 text-neutral-200 md:text-lg">
                                Merch Tent is built for artists who want to try merch without ordering boxes first.
                                Bring artwork, a logo, or just a rough idea. We will help you get the first tee ready.
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
                                    href="mailto:support@merchtent.com.au?subject=Help%20me%20set%20up%20my%20first%20tee"
                                    className="inline-flex items-center gap-2 border border-white/30 bg-black/60 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white hover:border-lime-300 hover:text-lime-300"
                                >
                                    Send us your logo
                                    <Mail className="h-4 w-4" />
                                </Link>
                            </div>
                            <p className="mt-4 text-sm font-bold text-neutral-400">
                                Not ready to design alone? Send us what you have and we will help make the first product feel real.
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
                                    We help
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
                        ["Logo is enough", "we can help shape it"],
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
                        href="/contact"
                        className="inline-flex items-center gap-2 border border-neutral-700 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white hover:border-lime-300 hover:text-lime-300"
                    >
                        Ask for help
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

            <section className="border-b border-neutral-800 bg-[#f3f1e8] text-black">
                <div className="grid lg:grid-cols-[0.88fr_1.12fr]">
                    <div className="border-b border-neutral-300 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-600">We can set it up with you</p>
                        <h2 className="mt-2 max-w-2xl text-5xl font-black uppercase leading-[0.88] md:text-7xl">
                            Send us your logo and first tee idea.
                        </h2>
                        <p className="mt-5 max-w-xl text-base leading-7 text-neutral-700">
                            If the designer feels like too much on day one, start by emailing the logo. We can help make a first
                            tee, get mockups ready, and show you what your artist page could look like before you go public.
                        </p>
                        <div className="mt-7 flex flex-wrap gap-3">
                            <Link
                                href="mailto:support@merchtent.com.au?subject=Artist%20first%20tee%20setup&body=Band%20name:%0D%0ALinks:%0D%0AWhat%20I%20want%20to%20make:%0D%0A"
                                className="inline-flex items-center gap-2 bg-red-600 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white hover:bg-red-500"
                            >
                                Email the logo
                                <Mail className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/auth/sign-up?type=artist"
                                className="inline-flex items-center gap-2 border border-black px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-black hover:bg-lime-300"
                            >
                                Create artist account
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
                <div className="border-b border-neutral-800 p-5 md:p-8">
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-500">Simple flow</p>
                    <h2 className="mt-2 max-w-5xl text-5xl font-black uppercase leading-[0.88] md:text-7xl">
                        From rough idea to shop link.
                    </h2>
                </div>
                <div className="grid md:grid-cols-4">
                    {simpleSteps.map((step, index) => {
                        const Icon = step.icon;
                        return (
                            <article key={step.title} className="border-b border-r border-neutral-800 bg-neutral-950 p-5 md:min-h-[310px] md:p-6">
                                <div className="flex items-start justify-between gap-4">
                                    <span className="bg-red-600 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
                                        0{index + 1}
                                    </span>
                                    <Icon className="h-6 w-6 text-lime-300" />
                                </div>
                                <h3 className="mt-16 text-3xl font-black uppercase leading-none">{step.title}</h3>
                                <p className="mt-4 text-sm leading-6 text-neutral-400">{step.body}</p>
                            </article>
                        );
                    })}
                </div>
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
