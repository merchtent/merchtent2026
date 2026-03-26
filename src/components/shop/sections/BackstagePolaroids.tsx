"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Polaroid = {
    id: string;
    image: string;
    caption?: string | null;
    link?: string | null;
};

export default function BackstagePolaroids() {
    const [images, setImages] = useState<Polaroid[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const res = await fetch("/api/polaroids", { cache: "no-store" });
                const json = await res.json();

                if (mounted) {
                    setImages(Array.isArray(json.images) ? json.images : []);
                }
            } catch {
                if (mounted) setImages([]);
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    const list =
        images.length > 0
            ? images
            : Array.from({ length: 18 }).map((_, i) => ({
                id: `fallback-${i}`,
                image: `https://picsum.photos/seed/pol-${i}/600/600`,
                caption: `#${i + 1}`,
                link: null,
            }));

    return (
        <section className="py-10 md:py-14">
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">

                {/* HEADER */}
                <div className="flex items-end justify-between mb-6">
                    <div>
                        <h3 className="text-xl md:text-2xl font-black">
                            Backstage Polaroids
                        </h3>
                        <p className="text-sm text-neutral-400">
                            Behind the scenes — gigs, drops, and chaos
                        </p>
                    </div>
                </div>

                {/* GRID */}
                <div className="grid grid-cols-2 md:grid-cols-6 auto-rows-[120px] gap-3 md:gap-4">

                    {list.map((img, i) => {
                        const span =
                            i % 7 === 0
                                ? "md:row-span-3 md:col-span-2"
                                : i % 5 === 0
                                    ? "md:row-span-2"
                                    : i % 4 === 0
                                        ? "md:col-span-2"
                                        : "";

                        const rot = i % 2 ? "rotate-2" : "-rotate-2";

                        const content = (
                            <div
                                className={`relative rounded-xl overflow-hidden border border-neutral-800 group ${span} ${rot}`}
                            >
                                {/* IMAGE */}
                                <Image
                                    src={img.image}
                                    alt={img.caption || "Polaroid"}
                                    fill
                                    className="object-cover group-hover:scale-105 transition duration-300"
                                />

                                {/* OVERLAY */}
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition" />

                                {/* CAPTION */}
                                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px]">
                                    <span className="bg-neutral-950/80 px-2 py-0.5 rounded">
                                        {img.caption || `#${i + 1}`}
                                    </span>

                                    {img.link && (
                                        <span className="bg-red-600 text-white px-2 py-0.5 rounded">
                                            View
                                        </span>
                                    )}
                                </div>
                            </div>
                        );

                        // clickable if IG link exists
                        if (img.link) {
                            return (
                                <a
                                    key={img.id}
                                    href={img.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {content}
                                </a>
                            );
                        }

                        return <div key={img.id}>{content}</div>;
                    })}
                </div>

                {/* LOADING STATE */}
                {loading && (
                    <div className="mt-4 text-xs text-neutral-500">
                        Loading polaroids...
                    </div>
                )}
            </div>
        </section>
    );
}