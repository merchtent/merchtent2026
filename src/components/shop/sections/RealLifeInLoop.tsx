"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Instagram } from "lucide-react";

type Polaroid = {
    id: string;
    image: string | null;
    caption: string | null;
    link: string | null;
};

const fallbackPosts = [
    {
        id: "fallback-venue",
        image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=85",
        caption: "Gig nights, fan fits, and product stories from the room.",
        link: "https://www.instagram.com/merchtent.au/",
    },
    {
        id: "fallback-studio",
        image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85",
        caption: "First samples, late design edits, and the bits before launch.",
        link: "https://www.instagram.com/merchtent.au/",
    },
    {
        id: "fallback-table",
        image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=85",
        caption: "The merch table energy, rebuilt online.",
        link: "https://www.instagram.com/merchtent.au/",
    },
    {
        id: "fallback-crowd",
        image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=85",
        caption: "Fans wearing the scene before everyone else catches on.",
        link: "https://www.instagram.com/merchtent.au/",
    },
];

export default function RealLifeInLoop() {
    const [posts, setPosts] = useState<Polaroid[] | null>(null);

    useEffect(() => {
        let mounted = true;

        async function loadPosts() {
            try {
                const response = await fetch("/api/polaroids", { cache: "no-store" });
                const json = await response.json();
                const images = Array.isArray(json.images) ? (json.images as Polaroid[]) : [];

                if (mounted) {
                    setPosts(images.filter((post) => post.image).slice(0, 4));
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
            <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                            Backstage feed
                        </p>
                        <h2 className="mt-2 text-4xl font-black uppercase leading-none md:text-6xl">
                            Real life in the loop.
                        </h2>
                    </div>
                    <Link
                        href="https://www.instagram.com/merchtent.au/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-fit items-center gap-2 border border-neutral-700 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] hover:border-red-500"
                    >
                        Instagram
                        <Instagram className="h-4 w-4" />
                    </Link>
                </div>
            </div>

            <div className="grid border-t border-neutral-800 md:grid-cols-4">
                {visiblePosts.map((post, index) => (
                    <Link
                        key={post.id}
                        href={post.link ?? "https://www.instagram.com/merchtent.au/"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative min-h-[340px] overflow-hidden border-b border-r border-neutral-800"
                    >
                        {post.image && (
                            <Image
                                src={post.image}
                                alt={post.caption ?? "Backstage post"}
                                fill
                                sizes="(max-width: 768px) 100vw, 25vw"
                                className="object-cover opacity-55 grayscale transition duration-700 group-hover:scale-105 group-hover:opacity-80 group-hover:grayscale-0"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
                        <div className="absolute inset-x-0 bottom-0 p-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
                                [ post {String(index + 1).padStart(2, "0")} ]
                            </p>
                            <p className="mt-3 line-clamp-3 text-xl font-black leading-tight">
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
        </section>
    );
}
