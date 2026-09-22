"use client";

import Image from "next/image";
import { useState, type RefObject } from "react";

export type ProductGalleryImage = {
    id: string;
    src: string;
    label: string;
};

export default function ProductImageGallery({
    images,
    title,
    containerRef,
}: {
    images: ProductGalleryImage[];
    title: string;
    containerRef?: RefObject<HTMLDivElement | null>;
}) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const activeImage = images.find((image) => image.id === selectedId) ?? images[0];

    return (
        <div className="grid min-w-0 content-start gap-4">
            <div
                className="group relative isolate aspect-[4/3] scroll-mt-24 overflow-hidden border border-neutral-700 bg-[#f2f0ea] shadow-[0_26px_80px_rgba(0,0,0,0.55)] sm:aspect-square"
                ref={containerRef}
            >
                <Image
                    src="https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=80"
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 48vw"
                    className="object-cover opacity-75"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_45%,rgba(190,242,100,0.22),transparent_32%),linear-gradient(180deg,rgba(0,0,0,0.16),rgba(0,0,0,0.42))]" />
                <div className="absolute inset-x-[8%] inset-y-[9%] bg-[#f7f4ec]/95 shadow-[0_24px_48px_rgba(0,0,0,0.5)] [clip-path:polygon(2%_1%,98%_0,100%_96%,1%_100%)]" />
                <div className="absolute inset-x-[11%] inset-y-[12%] border border-black/10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.72),rgba(255,255,255,0.24)_52%,transparent_74%)]" />

                {activeImage ? (
                    <Image
                        src={activeImage.src}
                        alt={`${title} - ${activeImage.label}`}
                        fill
                        unoptimized={activeImage.src.startsWith("data:")}
                        sizes="(max-width: 1024px) 100vw, 48vw"
                        className="relative z-10 object-contain p-7 drop-shadow-[0_28px_26px_rgba(0,0,0,0.42)] transition duration-500 group-hover:scale-105 sm:p-10 md:p-16"
                        priority
                    />
                ) : null}

                <span className="absolute left-3 top-3 z-20 bg-red-600 px-3 py-1 text-[11px] font-black uppercase text-white md:left-4 md:top-4">
                    Counter pick
                </span>
                <span className="absolute bottom-4 right-4 z-20 border border-black/15 bg-lime-300 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-black">
                    Artist merch
                </span>
            </div>

            {images.length > 1 ? (
                <div className="flex max-w-full gap-2 overflow-x-auto pb-2 md:gap-3" aria-label="Product image views">
                    {images.map((image) => (
                        <button
                            key={image.id}
                            type="button"
                            onClick={() => setSelectedId(image.id)}
                            aria-label={`Show ${image.label}`}
                            aria-pressed={activeImage?.id === image.id}
                            className={`flex w-20 shrink-0 flex-col gap-1 border bg-neutral-950 p-1 text-left transition hover:border-lime-300 focus-visible:outline-lime-300 md:w-24 ${activeImage?.id === image.id ? "border-lime-300" : "border-neutral-700"}`}
                        >
                            <span className="relative aspect-square w-full overflow-hidden bg-white">
                                <Image
                                    src={image.src}
                                    alt=""
                                    fill
                                    unoptimized={image.src.startsWith("data:")}
                                    sizes="96px"
                                    className="object-contain"
                                />
                            </span>
                            <span className="w-full truncate text-center text-[10px] font-bold uppercase text-neutral-300">{image.label}</span>
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
