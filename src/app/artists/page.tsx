// app/artists/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Camera, Disc3, Search, Sparkles, Users } from "lucide-react";
import { publicStorageUrl } from "@/lib/storage";
import { logger } from "@/lib/logger";

export const revalidate = 60;

type Artist = {
    id: string;
    display_name: string | null;
    slug: string | null;
    hero_image_path: string | null;
};

function initialKey(name: string | null): string {
    const n = (name || "").trim();
    const k = n[0]?.toUpperCase();
    return k && /[A-Z]/.test(k) ? k : "#";
}

function initials(name: string | null): string {
    const n = (name || "").trim();
    if (!n) return "??";
    const parts = n.split(/\s+/).slice(0, 2);
    return (
        parts.map((p) => p[0]?.toUpperCase() || "").join("") || "??"
    );
}

export default async function ArtistsIndex() {
    const supabase = getServerSupabase();

    // 👇 pull hero_image_path now
    const { data: artists, error } = await supabase
        .from("artists_public")
        .select("id, display_name, slug, hero_image_path")
        .order("display_name", { ascending: true });

    if (error) {
        logger.error("Artists index failed to load artists", {
            error: error.message,
        });

        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <section className="border-b border-neutral-800 bg-neutral-950">
                    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
                        <div className="border border-neutral-800 bg-black p-5">
                            <h1 className="text-4xl font-black uppercase leading-none">
                                ARTISTS // ERROR
                            </h1>
                        </div>
                    </div>
                </section>
                <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:px-8">
                    <div className="border border-neutral-800 bg-neutral-950 p-6">
                        <p className="text-red-400">
                            Could not load artists right now.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    const list = Array.isArray(artists) ? (artists as Artist[]) : [];
    const count = list.length;
    const featuredArtists = list.filter((artist) => artist.hero_image_path).slice(0, 4);
    const remainingFeatured = featuredArtists.length ? featuredArtists : list.slice(0, 4);

    // group A–Z
    const groups = new Map<string, Artist[]>();
    for (const a of list) {
        const k = initialKey(a.display_name);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(a);
    }

    const orderedKeys = Array.from(groups.keys()).sort((a, b) => {
        if (a === "#") return 1;
        if (b === "#") return -1;
        return a.localeCompare(b);
    });

    return (
        <main className="min-h-screen bg-black text-neutral-100">
            <section className="relative overflow-hidden border-b border-neutral-800 bg-black">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(190,242,100,0.14),transparent_28%),radial-gradient(circle_at_82%_20%,rgba(239,0,0,0.2),transparent_24%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.05)_0_1px,transparent_1px_28px)] opacity-35" />

                <div className="relative mx-auto grid max-w-[1680px] gap-px bg-neutral-800 lg:grid-cols-[0.92fr_1.08fr]">
                    <div className="bg-black p-5 py-12 md:p-10 md:py-16 xl:p-14">
                        <div className="inline-flex items-center gap-2 bg-lime-300 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-black">
                            <Disc3 className="h-3.5 w-3.5" />
                            Scene directory
                        </div>
                        <h1 className="mt-5 max-w-4xl text-6xl font-black uppercase leading-[0.88] tracking-tight md:text-8xl xl:text-9xl">
                            Find the band. Back the drop.
                        </h1>
                        <p className="mt-6 max-w-2xl text-base leading-7 text-neutral-300 md:text-lg">
                            Browse artist-run storefronts, save the bands you want to follow, and discover merch that starts with the scene.
                        </p>

                        <div className="mt-8 grid max-w-2xl gap-px bg-neutral-800 sm:grid-cols-3">
                            <DirectoryStat value={String(count)} label={count === 1 ? "Artist" : "Artists"} />
                            <DirectoryStat value="Live" label="Storefronts" />
                            <DirectoryStat value="Fan" label="Ready" />
                        </div>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <a
                                href="#artist-directory"
                                className="inline-flex items-center gap-2 bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-500"
                            >
                                Browse artists <ArrowRight className="h-4 w-4" />
                            </a>
                            <Link
                                href="/start"
                                className="inline-flex items-center gap-2 border border-lime-300 bg-black px-5 py-3 text-sm font-black text-lime-300 transition hover:bg-lime-300 hover:text-black"
                            >
                                Start as artist <Sparkles className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>

                    <div className="grid bg-neutral-950 md:grid-cols-2">
                        {remainingFeatured.map((artist, index) => {
                            const heroUrl = publicStorageUrl("artist-images", artist.hero_image_path);
                            return (
                                <Link
                                    key={artist.id}
                                    href={`/artists/${artist.slug}`}
                                    className={`group relative min-h-[230px] overflow-hidden border-b border-r border-neutral-800 bg-neutral-950 md:min-h-[310px] ${
                                        index === 0 ? "md:col-span-2" : ""
                                    }`}
                                >
                                    {heroUrl ? (
                                        <Image
                                            src={heroUrl}
                                            alt={artist.display_name ?? "Artist"}
                                            fill
                                            sizes={index === 0 ? "(max-width: 1024px) 100vw, 56vw" : "(max-width: 1024px) 50vw, 28vw"}
                                            className="object-cover opacity-74 transition duration-700 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(190,242,100,0.2),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.07)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.07)_50%,rgba(255,255,255,0.07)_75%,transparent_75%,transparent)] bg-[length:16px_16px]" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/42 to-transparent" />
                                    <div className="absolute left-4 top-4 bg-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                                        Slot {String(index + 1).padStart(2, "0")}
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 p-5">
                                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-lime-300">
                                            Artist storefront
                                        </p>
                                        <div className="mt-2 flex items-end justify-between gap-4">
                                            <h2 className="text-3xl font-black uppercase leading-none md:text-5xl">
                                                {artist.display_name ?? "Unnamed artist"}
                                            </h2>
                                            <ArrowRight className="h-5 w-5 shrink-0 text-lime-300 transition group-hover:translate-x-1" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-[#f2f0ea] text-black">
                <div className="mx-auto grid max-w-[1680px] gap-px bg-black/20 md:grid-cols-3">
                    <SceneCard
                        icon={<Camera className="h-5 w-5" />}
                        title="Real photos"
                        body="Artist pages can carry live shots, promo photos and behind-the-scenes moments."
                    />
                    <SceneCard
                        icon={<Users className="h-5 w-5" />}
                        title="Save the scene"
                        body="Fans can follow artists, come back to favourites and keep track of drops."
                    />
                    <SceneCard
                        icon={<Search className="h-5 w-5" />}
                        title="Discover early"
                        body="The directory keeps new and local artists visible before they are everywhere else."
                    />
                </div>
            </section>

            <section id="artist-directory" className="border-b border-neutral-800 bg-black">
                <div className="mx-auto max-w-[1680px] px-4 py-12 md:px-8 md:py-16">
                    <div className="mb-8 grid gap-5 md:grid-cols-[0.85fr_1.15fr] md:items-end">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">
                                All artists
                            </p>
                            <h2 className="mt-2 text-5xl font-black uppercase leading-none md:text-7xl">
                                The full lineup.
                            </h2>
                        </div>
                        <p className="max-w-2xl text-sm leading-6 text-neutral-400 md:justify-self-end">
                            Jump through the artist list, open a storefront, shop current merch, or save an artist for later.
                        </p>
                    </div>

                    {count === 0 ? (
                        <div className="flex flex-col gap-5 border border-neutral-800 bg-neutral-950 p-6 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-3xl font-black uppercase leading-none">No artists yet.</p>
                                <p className="mt-2 text-sm text-neutral-400">
                                    Be the first to bring a drop into the tent.
                                </p>
                            </div>
                            <Link
                                href="/auth/sign-up?type=artist"
                                className="inline-flex h-12 w-fit items-center bg-lime-300 px-5 text-sm font-black uppercase tracking-[0.12em] text-black hover:bg-lime-200"
                            >
                                <Users className="mr-2 h-4 w-4" />
                                Create artist
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {orderedKeys.map((letter) => (
                                <div key={letter} id={`letter-${letter}`}>
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="bg-red-600 px-3 py-1 text-sm font-black uppercase tracking-[0.25em] text-white">
                                            {letter}
                                        </h3>
                                        <div className="ml-4 h-px flex-1 bg-neutral-800" />
                                    </div>

                                    <ul className="grid gap-px bg-neutral-800 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                        {groups.get(letter)!.map((a, index) => {
                                            const heroUrl = publicStorageUrl("artist-images", a.hero_image_path);
                                            return (
                                                <li key={a.id} className="bg-neutral-950">
                                                    <Link
                                                        href={`/artists/${a.slug}`}
                                                        className="group block transition hover:bg-neutral-900"
                                                    >
                                                        <div className="relative aspect-[5/3] overflow-hidden bg-neutral-900">
                                                            {heroUrl ? (
                                                                <Image
                                                                    src={heroUrl}
                                                                    alt={a.display_name ?? "Artist hero"}
                                                                    fill
                                                                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 25vw"
                                                                    className="object-cover opacity-78 transition duration-500 group-hover:scale-105"
                                                                />
                                                            ) : (
                                                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(190,242,100,0.16),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.07)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.07)_50%,rgba(255,255,255,0.07)_75%,transparent_75%,transparent)] bg-[length:14px_14px]" />
                                                            )}
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/24 to-transparent" />
                                                            <span className={`absolute left-3 top-3 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${index % 3 === 0 ? "bg-lime-300 text-black" : "bg-red-600 text-white"}`}>
                                                                Artist
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center justify-between gap-4 border-t border-neutral-800 p-4">
                                                            <div className="flex min-w-0 items-center gap-3">
                                                                <div className="grid h-11 w-11 shrink-0 place-items-center border border-neutral-700 bg-black text-sm font-black text-lime-300">
                                                                    {initials(a.display_name)}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-lg font-black leading-none">
                                                                        {a.display_name ?? "Unnamed artist"}
                                                                    </p>
                                                                    <p className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-neutral-500 group-hover:text-lime-300">
                                                                        View storefront
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <ArrowRight className="h-4 w-4 shrink-0 text-red-500 transition group-hover:translate-x-1 group-hover:text-lime-300" />
                                                        </div>
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}

function DirectoryStat({ value, label }: { value: string; label: string }) {
    return (
        <div className="bg-neutral-950 p-4">
            <p className="text-3xl font-black leading-none text-lime-300">{value}</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">{label}</p>
        </div>
    );
}

function SceneCard({
    icon,
    title,
    body,
}: {
    icon: ReactNode;
    title: string;
    body: string;
}) {
    return (
        <div className="bg-[#f2f0ea] p-6 md:p-8">
            <div className="text-red-600">{icon}</div>
            <h2 className="mt-5 text-3xl font-black uppercase leading-none">{title}</h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-neutral-700">{body}</p>
        </div>
    );
}
