import Link from "next/link";
import { Camera, Megaphone, Radio, Shirt } from "lucide-react";

const communityCards = [
    {
        icon: Camera,
        title: "Backstage shots",
        text: "Gig photos, studio corners, first samples, and the small moments behind each drop.",
    },
    {
        icon: Shirt,
        title: "Drop stories",
        text: "Why the design exists, what song or show it belongs to, and what fans are helping fund.",
    },
    {
        icon: Megaphone,
        title: "Fan proof",
        text: "Shouts, supporter notes, and real people wearing unsigned merch in the wild.",
    },
];

export default function BackstagePolaroids() {
    return (
        <section className="relative overflow-hidden border-y border-neutral-800 bg-black py-12 md:py-16 text-white">
            <div className="absolute inset-x-0 top-0 h-px bg-red-500/50" />

            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-8 lg:gap-10">
                    <div>
                        <div className="inline-flex items-center gap-2 border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-neutral-300">
                            <Radio className="h-3.5 w-3.5 text-red-400" />
                            Community feed
                        </div>

                        <h3 className="mt-5 text-3xl md:text-5xl font-black leading-[0.95]">
                            Backstage is part of the product.
                        </h3>

                        <p className="mt-4 max-w-xl text-neutral-300">
                            The next version of Merch Tent should not just list products. It should make each artist
                            feel active, followed, and worth backing.
                        </p>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                                href="/artists"
                                className="rounded-md bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-red-200"
                            >
                                Find artists
                            </Link>
                            <Link
                                href="/start"
                                className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-bold text-white transition hover:border-red-400"
                            >
                                Open your merch tent
                            </Link>
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                        {communityCards.map((card, index) => {
                            const Icon = card.icon;

                            return (
                                <div
                                    key={card.title}
                                    className="min-h-[220px] border border-neutral-800 bg-neutral-950 p-5 rounded-lg"
                                    style={{
                                        transform: index === 1 ? "rotate(1deg)" : index === 2 ? "rotate(-1deg)" : undefined,
                                    }}
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <h4 className="mt-5 text-lg font-black">{card.title}</h4>
                                    <p className="mt-3 text-sm leading-relaxed text-neutral-400">{card.text}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
