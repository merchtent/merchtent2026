// app/artists/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import { Users } from "lucide-react";

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

function publicArtistImage(path: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artist-images/${encodeURIComponent(
        path
    )}`;
}

export default async function ArtistsIndex() {
    const supabase = getServerSupabase();

    // 👇 pull hero_image_path now
    const { data: artists, error } = await supabase
        .from("artists_public")
        .select("id, display_name, slug, hero_image_path")
        .order("display_name", { ascending: true });

    if (error) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                ARTISTS // ERROR
                            </h1>
                        </div>
                    </div>
                </section>
                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        <p className="text-red-400">
                            Error loading artists: {error.message}
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
            {/* Angled banner */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">
                                Directory
                            </p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                Artists
                            </h1>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-white">
                                {count} {count === 1 ? "artist" : "artists"}
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Content */}
            <section className="max-w-6xl mx-auto px-4 py-8 space-y-10">
                {count === 0 ? (
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 flex items-center justify-between">
                        <div>
                            <p className="text-lg font-semibold">No artists yet.</p>
                            <p className="text-sm text-neutral-400 mt-1">
                                Be the first to drop merch.
                            </p>
                        </div>
                        <Link
                            href="/auth/sign-up"
                            className="inline-flex items-center h-11 px-4 font-black tracking-wide bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 border border-red-500 rounded-xl"
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
                                <h2 className="text-sm uppercase tracking-[0.25em] text-neutral-400">
                                    {letter}
                                </h2>
                                <div className="h-px flex-1 ml-4 bg-neutral-800" />
                            </div>

                            {/* Grid */}
                            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {groups.get(letter)!.map((a) => {
                                    const heroUrl = publicArtistImage(a.hero_image_path);
                                    return (
                                        <li
                                            key={a.id}
                                            className="group relative rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden hover:border-neutral-700 transition-colors"
                                            style={{ clipPath: "polygon(1% 0,100% 0,99% 100%,0 100%)" }}
                                        >
                                            <Link href={`/artists/${a.slug}`} className="block">
                                                {/* Top banner / hero */}
                                                <div className="h-24 w-full overflow-hidden bg-neutral-800">
                                                    {heroUrl ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={heroUrl}
                                                            alt={a.display_name ?? "Artist hero"}
                                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                                        />
                                                    ) : (
                                                        <div className="h-full w-full bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.06)_50%,rgba(255,255,255,0.06)_75%,transparent_75%,transparent)] bg-[length:12px_12px]" />
                                                    )}
                                                </div>

                                                {/* Body */}
                                                <div className="p-5 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-neutral-900 border border-neutral-700 grid place-items-center font-black">
                                                            {initials(a.display_name)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="truncate font-semibold">
                                                                {a.display_name ?? "Unnamed artist"}
                                                            </p>
                                                            <p className="text-xs text-neutral-400">
                                                                View products →
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded rotate-2">
                                                        FEATURED
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
