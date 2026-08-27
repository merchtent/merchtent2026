"use client";

import Link from "next/link";
import { ArrowRight, Play, Radio, Shirt, Users } from "lucide-react";

const YOUTUBE_VIDEO_ID = "Z7TXlvknhCQ";
const YOUTUBE_EMBED_SRC = `https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=0&controls=1&rel=0&modestbranding=1`;

const stats = [
    { label: "Artist drop", value: "design" },
    { label: "Fan moment", value: "wear" },
    { label: "Order path", value: "fulfil" },
];

export default function LowerSceneVideo() {
    return (
        <section className="border-y border-neutral-800 bg-black text-white">
            <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
                <div className="relative min-h-[360px] border-b border-neutral-800 lg:border-b-0 lg:border-r">
                    <iframe
                        src={YOUTUBE_EMBED_SRC}
                        title="Merch Tent scene video"
                        className="absolute inset-0 h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    />
                </div>

                <div className="relative overflow-hidden bg-neutral-950 p-5 md:p-8 lg:p-10">
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_18px,rgba(255,255,255,0.025)_18px,rgba(255,255,255,0.025)_36px)]" />
                    <div className="relative">
                        <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-red-400">
                            <Play className="h-4 w-4" />
                            Watch the drop happen
                        </p>
                        <h2 className="mt-4 text-4xl font-black uppercase leading-none md:text-6xl">
                            This is not just a product grid.
                        </h2>
                        <p className="mt-5 max-w-xl text-sm leading-6 text-neutral-400 md:text-base">
                            The second half of the page should prove the engine: artists launch, fans react, orders move,
                            and the merch keeps pointing back to the real scene.
                        </p>

                        <div className="mt-7 grid grid-cols-3 border border-neutral-800">
                            {stats.map((item, index) => {
                                const Icon = index === 0 ? Shirt : index === 1 ? Users : Radio;

                                return (
                                    <div key={item.label} className="border-r border-neutral-800 p-3 last:border-r-0 md:p-4">
                                        <Icon className="h-4 w-4 text-red-400" />
                                        <p className="mt-3 text-xl font-black uppercase">{item.value}</p>
                                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                                            {item.label}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-7 flex flex-wrap gap-3">
                            <Link
                                href="/dashboard/products/designer"
                                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-5 py-3 text-sm font-black hover:bg-red-500"
                            >
                                Start a drop
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/artists"
                                className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-5 py-3 text-sm font-black hover:border-red-400"
                            >
                                Browse artists
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
