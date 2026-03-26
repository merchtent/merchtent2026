"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

type Artist = {
    id: string;
    name: string;
    slug: string;
    image: string | null;
};

function initials(name?: string | null) {
    const n = (name || "").trim();
    if (!n) return "??";
    return n
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() || "")
        .join("") || "??";
}

export default function AllArtists() {
    const [artists, setArtists] = useState<Artist[] | null>(null);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                const res = await fetch("/api/artists", { cache: "no-store" });
                const json = await res.json();

                if (!res.ok) throw new Error(json?.error || "Failed");

                if (alive) {
                    setArtists(Array.isArray(json.artists) ? json.artists : []);
                }
            } catch (e: any) {
                if (alive) setErr(e?.message ?? "Failed to load");
            }
        })();

        return () => { alive = false; };
    }, []);

    return (
        <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">

            {/* HEADER */}
            <div className="flex items-end justify-between mb-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-semibold">All artists</h2>
                    <p className="text-sm text-neutral-400">
                        Discover every artist on the platform
                    </p>
                </div>

                <Link href="/artists" className="text-sm underline">
                    View all
                </Link>
            </div>

            {/* LOADING */}
            {artists === null && !err && (
                <div className="flex gap-4 overflow-x-auto">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className="min-w-[180px] rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 animate-pulse"
                        >
                            <div className="h-40 bg-neutral-800" />
                            <div className="p-3">
                                <div className="h-4 w-2/3 bg-neutral-800 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ERROR */}
            {err && (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                    <p className="text-neutral-300">Couldn’t load artists.</p>
                </div>
            )}

            {/* CONTENT */}
            {artists && artists.length > 0 && (
                <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">

                    {artists.map((a, i) => (
                        <div
                            key={a.id}
                            className="min-w-[180px] snap-start"
                        >
                            <Link
                                href={`/artists/${a.slug}`}
                                className="block group relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 hover:border-neutral-700 transition-colors"
                                style={{
                                    clipPath:
                                        i % 4 === 0
                                            ? "polygon(1% 0,100% 0,98% 100%,0 100%)"
                                            : undefined,
                                }}
                            >
                                {/* IMAGE */}
                                <div className="relative h-40 w-full bg-neutral-950">
                                    {a.image ? (
                                        <Image
                                            src={a.image}
                                            alt={a.name}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-neutral-800 to-neutral-900 text-2xl font-black">
                                            {initials(a.name)}
                                        </div>
                                    )}

                                    {/* OPTIONAL BADGE */}
                                    <div className="absolute top-2 left-2 text-[10px] bg-red-600 text-white px-2 py-0.5 font-bold rounded rotate-[-3deg]">
                                        Artist
                                    </div>
                                </div>

                                {/* FOOTER */}
                                <div className="p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-semibold truncate">
                                            {a.name}
                                        </p>
                                        <span className="text-xs text-neutral-400 group-hover:text-neutral-200 transition-colors">
                                            View →
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}

                </div>
            )}
        </section>
    );
}