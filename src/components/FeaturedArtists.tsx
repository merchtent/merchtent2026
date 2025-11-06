// src/components/home/FeaturedArtists.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

type Artist = {
    id: string;
    display_name: string | null;
    slug: string | null;
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

export default function FeaturedArtistsSection() {
    const [artists, setArtists] = useState<Artist[] | null>(null);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await fetch("/api/artists/featured", { cache: "no-store" });
                const json = await res.json();
                if (!res.ok) throw new Error(json?.error || "Failed to load featured artists");
                if (alive) setArtists(Array.isArray(json.artists) ? json.artists : []);
            } catch (e: any) {
                if (alive) setErr(e?.message ?? "Failed to load featured artists");
            }
        })();
        return () => { alive = false; };
    }, []);

    return (
        <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-0 md:py-0">
            <div className="flex items-end justify-between mb-6">
                <div>
                    <h2 className="text-xl md:text-2xl font-semibold">Featured artists</h2>
                    <p className="text-sm text-neutral-400">Handpicked bands we love</p>
                </div>
                <Link href="/artists" className="text-sm underline">View all</Link>
            </div>

            {/* loading skeleton */}
            {artists === null && !err && (
                <ul className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <li
                            key={i}
                            className="rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 animate-pulse"
                            style={{ clipPath: i % 4 === 0 ? "polygon(1% 0,100% 0,99% 100%,0 100%)" : undefined }}
                        >
                            <div className="h-48 md:h-56 w-full bg-neutral-800" />
                            <div className="p-3 md:p-4">
                                <div className="h-4 w-2/3 bg-neutral-800 rounded" />
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {err && (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                    <p className="text-neutral-300">Couldn’t load featured artists.</p>
                </div>
            )}

            {artists && (artists.length === 0 ? (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                    <p className="text-neutral-300">No featured artists yet.</p>
                </div>
            ) : (
                <ul className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-4">
                    {artists.map((a, i) => (
                        <li
                            key={a.id}
                            className="group relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 hover:border-neutral-700 transition-colors"
                            style={{ clipPath: i % 4 === 0 ? "polygon(1% 0,100% 0,98% 100%,0 100%)" : undefined }}
                        >
                            <Link href={`/artists/${a.slug ?? a.id}`} className="block">
                                <div className="relative h-48 md:h-56 w-full bg-neutral-950">
                                    {a.image ? (
                                        <Image
                                            src={a.image}
                                            alt={a.display_name ?? "Artist"}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width:768px) 50vw, 25vw"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-neutral-800 to-neutral-900 text-3xl font-black">
                                            {initials(a.display_name)}
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3 text-[11px] bg-red-600 text-white px-2 py-0.5 font-bold rounded rotate-[-3deg]">
                                        Featured
                                    </div>
                                </div>
                                <div className="p-3 md:p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm md:text-base font-semibold truncate">
                                            {a.display_name ?? "Artist"}
                                        </p>
                                        <span className="text-xs text-neutral-400 group-hover:text-neutral-200 transition-colors">View →</span>
                                    </div>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            ))}
        </section>
    );
}
