// app/artists/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { Users } from "lucide-react";
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
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            <section className="border-b border-neutral-800 bg-neutral-950">
                <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
                    <div className="grid gap-6 border border-neutral-800 bg-black p-5 md:grid-cols-[1fr_auto] md:items-end md:p-7">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-500">
                                Scene directory
                            </p>
                            <h1 className="mt-2 text-5xl font-black uppercase leading-none md:text-7xl">
                                Artists
                            </h1>
                        </div>
                        <div className="hidden border border-neutral-800 bg-neutral-950 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white md:block">
                            <span>
                                {count} {count === 1 ? "artist" : "artists"}
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Content */}
            <section className="mx-auto max-w-7xl space-y-10 px-4 py-8 md:px-6 lg:px-8">
                {count === 0 ? (
                    <div className="flex items-center justify-between border border-neutral-800 bg-neutral-950 p-6">
                        <div>
                            <p className="text-lg font-black uppercase">No artists yet.</p>
                            <p className="text-sm text-neutral-400 mt-1">
                                Be the first to drop merch.
                            </p>
                        </div>
                        <Link
                            href="/auth/sign-up"
                            className="inline-flex h-11 items-center border border-red-500 bg-red-600 px-4 font-black tracking-wide text-white shadow-lg shadow-red-900/30 hover:bg-red-500"
                            style={{ clipPath: "polygon(1% 0,100% 0,99% 100%,0 100%)" }}
                        >
                            <Users className="h-4 w-4 mr-2" />
                            Create artist
                        </Link>
                    </div>
                ) : (
                    orderedKeys.map((letter) => (
                        <div key={letter} id={`letter-${letter}`}>
                            {/* Section header */}
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-black uppercase tracking-[0.25em] text-red-500">
                                    {letter}
                                </h2>
                                <div className="h-px flex-1 ml-4 bg-neutral-800" />
                            </div>

                            {/* Grid */}
                            <ul className="grid gap-px bg-neutral-800 sm:grid-cols-2 lg:grid-cols-3">
                                {groups.get(letter)!.map((a) => {
                                    const heroUrl = publicStorageUrl("artist-images", a.hero_image_path);
                                    return (
                                        <li
                                            key={a.id}
                                            className="group relative overflow-hidden bg-neutral-950 transition-colors hover:bg-black"
                                        >
                                            <Link href={`/artists/${a.slug}`} className="block">
                                                {/* Top banner / hero */}
                                                <div className="h-28 w-full overflow-hidden bg-neutral-800">
                                                    {heroUrl ? (
                                                        <Image
                                                            src={heroUrl}
                                                            alt={a.display_name ?? "Artist hero"}
                                                            width={640}
                                                            height={192}
                                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                                        />
                                                    ) : (
                                                        <div className="h-full w-full bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.06)_50%,rgba(255,255,255,0.06)_75%,transparent_75%,transparent)] bg-[length:12px_12px]" />
                                                    )}
                                                </div>

                                                {/* Body */}
                                                <div className="flex items-center justify-between gap-3 border-t border-neutral-800 p-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="grid h-10 w-10 place-items-center border border-neutral-700 bg-black font-black">
                                                            {initials(a.display_name)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="truncate font-black">
                                                                {a.display_name ?? "Unnamed artist"}
                                                            </p>
                                                            <p className="text-xs text-neutral-400">
                                                                View products
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
                                                        ARTIST
                                                    </span>
                                                </div>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))
                )}
            </section>
        </main>
    );
}
