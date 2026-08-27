import Link from "next/link";
import { ArrowRight, Play, Radio } from "lucide-react";

const YOUTUBE_VIDEO_ID = "Z7TXlvknhCQ";
const YOUTUBE_EMBED_SRC = `https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=1&controls=0&loop=1&playlist=${YOUTUBE_VIDEO_ID}&playsinline=1&rel=0&modestbranding=1&disablekb=1&fs=0&iv_load_policy=3`;

export default function SceneVideoHero() {
    return (
        <section className="relative min-h-[52vh] overflow-hidden border-b border-neutral-800 bg-black text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(239,68,68,0.35),transparent_28%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.18),transparent_24%),linear-gradient(135deg,#050505_0%,#171717_45%,#7f1d1d_100%)]" />

            <iframe
                className="pointer-events-none absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 opacity-65"
                src={YOUTUBE_EMBED_SRC}
                title="Merch Tent live scene video"
                allow="autoplay; encrypted-media; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                aria-hidden="true"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/65 to-black/10" />
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.05)_0,rgba(255,255,255,0.05)_1px,transparent_1px,transparent_9px)] opacity-20" />

            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-14 md:py-20">
                <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 border border-white/20 bg-black/60 px-3 py-1 text-xs font-black uppercase tracking-[0.24em] text-red-300">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                        </span>
                        Live from the floor
                    </div>

                    <h2 className="mt-5 text-4xl md:text-7xl font-black leading-[0.86]">
                        This should feel like walking into the room.
                    </h2>

                    <p className="mt-5 max-w-xl text-base md:text-lg text-neutral-200">
                        New bands, fresh merch, fans finding the drop before the algorithm does.
                        Merch Tent is the table, the flyer wall, and the first wave of support.
                    </p>

                    <div className="mt-7 flex flex-wrap gap-3">
                        <Link
                            href="/new"
                            className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-red-200"
                        >
                            <Play className="h-4 w-4 fill-current" />
                            Enter the drops
                        </Link>
                        <Link
                            href="/start"
                            className="inline-flex items-center gap-2 rounded-md border border-white/25 bg-black/50 px-5 py-3 text-sm font-black text-white transition hover:border-red-400"
                        >
                            Start a tent
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>

                <div className="mt-10 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                        ["Drop energy", "Built for release moments"],
                        ["Fan momentum", "Support becomes visible"],
                        ["Artist control", "Design, publish, sell"],
                    ].map(([label, detail]) => (
                        <div key={label} className="border border-white/15 bg-black/55 p-4 backdrop-blur-sm">
                            <Radio className="h-4 w-4 text-red-400" />
                            <p className="mt-3 text-sm font-black">{label}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-neutral-400">{detail}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
