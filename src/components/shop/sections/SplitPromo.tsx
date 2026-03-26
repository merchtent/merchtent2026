"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function timeAgo(date: string) {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);

    const intervals: any = {
        year: 31536000,
        month: 2592000,
        day: 86400,
        hour: 3600,
        minute: 60,
    };

    for (const key in intervals) {
        const interval = Math.floor(seconds / intervals[key]);
        if (interval >= 1) {
            return `${interval} ${key}${interval > 1 ? "s" : ""} ago`;
        }
    }

    return "just now";
}

type Journal = {
    id: string;
    slug: string;
    title: string;
    description: string;
    image: string;
    avatar: string;
    artist: string;
    createdAt: string;
    tag: string;
};

export default function SplitPromo() {
    const router = useRouter();

    const [data, setData] = useState<Journal[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const res = await fetch("/api/journal", { cache: "no-store" });
                const json = await res.json();

                if (mounted) {
                    setData(Array.isArray(json.journal) ? json.journal : []);
                }
            } catch {
                if (mounted) setData([]);
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    const list = data ?? [];

    return (
        <section className="relative">
            <div className="max-w-7xl mx-auto px-4 py-10">
                <div className="mb-6">
                    <p className="uppercase text-xs text-neutral-400">Journal</p>
                    <h2 className="text-2xl font-black">Latest from the Scene</h2>
                </div>

                {/* LOADING */}
                {loading && list.length === 0 ? (
                    <div className="flex gap-4 overflow-x-auto">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="min-w-[280px] h-64 rounded-2xl bg-neutral-900 animate-pulse"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex gap-4 overflow-x-auto md:grid md:grid-cols-3 md:overflow-visible">
                        {list.map((entry) => (
                            <div
                                key={entry.id}
                                onClick={() => router.push(`/journal/${entry.slug}`)}
                                className="min-w-[280px] group rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden cursor-pointer hover:-translate-y-1 transition"
                            >
                                <div className="relative h-40">
                                    <Image
                                        src={entry.avatar}
                                        alt={entry.title}
                                        fill
                                        className="object-cover"
                                    />
                                </div>

                                <div className="p-4">
                                    <h3 className="font-bold">{entry.title}</h3>

                                    <p className="text-sm text-neutral-400 mt-2">
                                        {entry.description}
                                    </p>

                                    <div className="flex items-center justify-between mt-4">
                                        <div className="flex items-center gap-2">
                                            <Image
                                                src={entry.avatar}
                                                alt=""
                                                width={24}
                                                height={24}
                                                className="rounded-full"
                                            />
                                            <span className="text-xs text-neutral-400">
                                                {entry.artist}
                                            </span>
                                        </div>

                                        <span className="text-xs text-neutral-500">
                                            {timeAgo(entry.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}