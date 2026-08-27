"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink, Instagram, Radio, Youtube } from "lucide-react";

const YOUTUBE_VIDEO_ID = "Z7TXlvknhCQ";
const YOUTUBE_EMBED_SRC = `https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=0&controls=1&rel=0&modestbranding=1`;

type Polaroid = {
    id: string;
    image: string | null;
    caption: string | null;
    link: string | null;
};

const fallbackPosts = [
    {
        id: "fallback-studio",
        image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80",
        caption: "Studio merch sketches, first samples, and the quiet bits before a drop goes live.",
        link: "https://www.instagram.com/merchtent.au/",
    },
    {
        id: "fallback-venue",
        image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80",
        caption: "Gig nights, fan fits, and local artists moving from the room to the rack.",
        link: "https://www.instagram.com/merchtent.au/",
    },
    {
        id: "fallback-table",
        image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80",
        caption: "The table outside the venue, rebuilt online for drops that fans can actually find.",
        link: "https://www.instagram.com/merchtent.au/",
    },
];

const activity = [
    "New artist added",
    "Backstage post queued",
    "Drop mockup published",
    "Fan shout received",
];

export default function SceneSocialFeed() {
    const [posts, setPosts] = useState<Polaroid[] | null>(null);

    useEffect(() => {
        let mounted = true;

        async function loadPosts() {
            try {
                const response = await fetch("/api/polaroids", { cache: "no-store" });
                const json = await response.json();
                const images = Array.isArray(json.images) ? (json.images as Polaroid[]) : [];

                if (mounted) {
                    setPosts(images.filter((post) => post.image).slice(0, 3));
                }
            } catch {
                if (mounted) setPosts([]);
            }
        }

        loadPosts();

        return () => {
            mounted = false;
        };
    }, []);

    const visiblePosts = posts === null
        ? fallbackPosts
        : posts.length > 0
            ? posts
            : fallbackPosts;

    return (
        <section className="border-y border-neutral-800 bg-black text-white">
            <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10 lg:px-8">
                <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                            Scene feed
                        </p>
                        <h2 className="mt-2 max-w-2xl text-4xl font-black uppercase leading-none md:text-6xl">
                            Real posts. Real rooms.
                        </h2>
                    </div>
                    <div>
                        <p className="max-w-2xl text-sm leading-6 text-neutral-400 md:text-base">
                            Merch Tent should feel connected to what is happening off the site: artists posting,
                            fans wearing drops, videos going up, and backstage moments turning into product stories.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Link
                                href="https://www.instagram.com/merchtent.au/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-500"
                            >
                                <Instagram className="h-4 w-4" />
                                Instagram
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                            <Link
                                href={`https://www.youtube.com/watch?v=${YOUTUBE_VIDEO_ID}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm font-black hover:border-red-400"
                            >
                                <Youtube className="h-4 w-4" />
                                YouTube
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid border-t border-neutral-800 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="grid border-neutral-800 md:grid-cols-3">
                    {visiblePosts.map((post, index) => (
                        <Link
                            key={post.id}
                            href={post.link ?? "https://www.instagram.com/merchtent.au/"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative min-h-[320px] overflow-hidden border-b border-r border-neutral-800 md:min-h-[420px]"
                        >
                            {post.image && (
                                <Image
                                    src={post.image}
                                    alt={post.caption ?? "Backstage scene post"}
                                    fill
                                    sizes="(max-width: 1024px) 100vw, 25vw"
                                    className="object-cover opacity-70 grayscale transition duration-700 group-hover:scale-105 group-hover:opacity-90 group-hover:grayscale-0"
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/5" />
                            <div className="absolute left-4 top-4 inline-flex items-center gap-2 bg-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
                                <Instagram className="h-3.5 w-3.5" />
                                {posts && posts.length > 0 ? "Latest post" : "Feed preview"}
                            </div>
                            <div className="absolute inset-x-0 bottom-0 p-5">
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-400">
                                    [ post {String(index + 1).padStart(2, "0")} {"//"} backstage ]
                                </p>
                                <p className="mt-3 line-clamp-3 text-lg font-black leading-tight">
                                    {post.caption}
                                </p>
                                <span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-red-400">
                                    Open post
                                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="grid border-b border-neutral-800 bg-neutral-950 lg:border-b-0">
                    <div className="border-b border-neutral-800 p-4 md:p-5">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-400">
                                    YouTube preview
                                </p>
                                <h3 className="mt-1 text-2xl font-black">Watch the scene move</h3>
                            </div>
                            <Youtube className="h-7 w-7 text-red-400" />
                        </div>
                    </div>
                    <div className="relative aspect-video bg-black">
                        <iframe
                            src={YOUTUBE_EMBED_SRC}
                            title="Merch Tent YouTube preview"
                            className="absolute inset-0 h-full w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    </div>
                    <div className="grid grid-cols-2 border-t border-neutral-800">
                        {activity.map((item) => (
                            <div key={item} className="border-r border-t border-neutral-800 p-4 first:border-t-0 even:border-r-0 md:p-5">
                                <Radio className="h-4 w-4 text-red-400" />
                                <p className="mt-3 text-sm font-black">{item}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
