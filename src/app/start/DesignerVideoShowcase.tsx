"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function DesignerVideoShowcase({ hasVideo }: { hasVideo: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (!hasVideo || !window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        videoRef.current?.pause();
    }, [hasVideo]);

    function togglePlayback() {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            void video.play();
            setPaused(false);
        } else {
            video.pause();
            setPaused(true);
        }
    }

    return (
        <div className="relative min-h-[420px] overflow-hidden bg-[#111] sm:min-h-[520px] lg:min-h-[620px]">
            {hasVideo ? (
                <video
                    ref={videoRef}
                    className="absolute inset-0 h-full w-full object-cover object-center max-md:scale-[1.34] md:scale-[1.12]"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    poster="/images/start/designer-loop-poster.png"
                    aria-label="A Merch Tent artist creating and previewing a tee in the product designer"
                    onPlay={() => setPaused(false)}
                    onPause={() => setPaused(true)}
                >
                    <source src="/videos/designer-loop.webm" type="video/webm" />
                    <source src="/videos/designer-loop.mp4" type="video/mp4" />
                </video>
            ) : (
                <Image
                    src="/images/start/designer-loop-poster.png"
                    alt="The Merch Tent product designer showing a blank black tee ready for artwork"
                    fill
                    sizes="(max-width: 1024px) 100vw, 56vw"
                    className="object-cover object-center max-md:scale-[1.34] md:scale-[1.12]"
                />
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 md:p-6">
                <div className="pointer-events-none max-w-md">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-lime-300">
                        Built in Merch Tent
                    </p>
                    <p className="mt-2 text-2xl font-black uppercase leading-none text-white md:text-3xl">
                        From blank tee to live listing.
                    </p>
                </div>
                <div className="flex shrink-0 gap-2">
                    {hasVideo ? (
                        <button
                            type="button"
                            onClick={togglePlayback}
                            className="grid h-12 w-12 place-items-center border border-white/40 bg-black/75 text-white hover:border-lime-300 hover:text-lime-300"
                            aria-label={paused ? "Play designer demo" : "Pause designer demo"}
                            title={paused ? "Play" : "Pause"}
                        >
                            {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                        </button>
                    ) : null}
                    <Link
                        href="/dashboard/products/designer"
                        className="inline-flex h-12 items-center gap-2 bg-lime-300 px-4 text-xs font-black uppercase tracking-[0.08em] text-black hover:bg-white md:px-5 md:text-sm"
                    >
                        Try the designer
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
