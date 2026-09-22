"use client";

import Image from "next/image";
import { useState } from "react";
import ProductImageGallery, { type ProductGalleryImage } from "@/components/shop/ProductImageGallery";
import type { LifestyleModelSet, LifestyleModelSetId } from "@/lib/products/mockup-templates";

export type DesignerMockupPreview = {
    front: string;
    back: string | null;
    colorMockups: { label: string; value: string; front: string; back: string }[];
    lifestyle: { id: string; label: string; src: string }[];
};

type Props = {
    preview: DesignerMockupPreview;
    modelSets: LifestyleModelSet[];
    femaleModelSet: LifestyleModelSetId | null;
    maleModelSet: LifestyleModelSetId | null;
    onSelectFemale: (id: LifestyleModelSetId) => void;
    onSelectMale: (id: LifestyleModelSetId) => void;
    artistName: string;
    title: string;
    description: string;
    category: string;
    priceCents: number;
    sizes: string[];
    hasFrontDesign: boolean;
    hasBackDesign: boolean;
};

function money(cents: number) {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);
}

export default function DesignerListingReview({
    preview,
    modelSets,
    femaleModelSet,
    maleModelSet,
    onSelectFemale,
    onSelectMale,
    artistName,
    title,
    description,
    category,
    priceCents,
    sizes,
    hasFrontDesign,
    hasBackDesign,
}: Props) {
    const [selectedColorLabel, setSelectedColorLabel] = useState(() =>
        preview.colorMockups.find((item) => item.front === preview.front)?.label ?? preview.colorMockups[0]?.label ?? ""
    );
    const selectedColor = preview.colorMockups.find((item) => item.label === selectedColorLabel) ?? preview.colorMockups[0];
    const isPrimaryColor = selectedColor?.front === preview.front;
    const previewImage = (id: string) => preview.lifestyle.find((image) => image.id === id)?.src;
    const selectedSets = [
        modelSets.find((set) => set.id === femaleModelSet),
        modelSets.find((set) => set.id === maleModelSet),
    ].filter((set): set is LifestyleModelSet => Boolean(set));
    const images: ProductGalleryImage[] = selectedColor ? [
        { id: "flat-front", label: "Front", src: selectedColor.front },
        { id: "flat-back", label: "Back", src: selectedColor.back },
    ] : [];
    for (const set of isPrimaryColor ? selectedSets : []) {
        const front = previewImage(set.frontTemplateId);
        const back = previewImage(set.backTemplateId);
        if (front) images.push({ id: `${set.id}-front`, label: `${set.label} - front`, src: front });
        if (back) images.push({ id: `${set.id}-back`, label: `${set.label} - back`, src: back });
    }

    return (
        <div className="min-h-0 flex-1 overflow-y-auto bg-black text-neutral-100">
            {modelSets.length > 0 ? (
                <section className="border-b border-neutral-800 bg-neutral-950 px-4 py-6 md:px-8">
                    <div className="mx-auto max-w-[1500px]">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-lime-300">Listing photos</p>
                        <h2 className="mt-2 text-2xl font-black uppercase md:text-3xl">Choose your model sets.</h2>
                        <div className="mt-5 grid gap-6 lg:grid-cols-2">
                            {(["female", "male"] as const).map((audience) => (
                                <div key={audience}>
                                    <h3 className="mb-2 text-sm font-black uppercase text-white">{audience === "female" ? "Female model" : "Male model"}</h3>
                                    <div className="grid grid-cols-2 gap-2" role="group" aria-label={`${audience} model set`}>
                                        {modelSets.filter((set) => set.audience === audience).map((set) => {
                                            const src = previewImage(set.frontTemplateId);
                                            const available = Boolean(src) && Boolean(previewImage(set.backTemplateId));
                                            const selected = (audience === "female" ? femaleModelSet : maleModelSet) === set.id;
                                            return (
                                                <button
                                                    key={set.id}
                                                    type="button"
                                                    onClick={() => audience === "female" ? onSelectFemale(set.id) : onSelectMale(set.id)}
                                                    disabled={!available}
                                                    aria-pressed={selected}
                                                    className={`flex min-w-0 items-center gap-3 border p-2 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${selected ? "border-lime-300 bg-lime-300/10" : "border-neutral-700 bg-black hover:border-neutral-400"}`}
                                                >
                                                    <span className="relative aspect-[3/4] w-14 shrink-0 overflow-hidden bg-neutral-900 sm:w-20">
                                                        {src ? <Image src={src} alt="" fill unoptimized sizes="80px" className="object-cover" /> : null}
                                                    </span>
                                                    <span className="min-w-0 text-xs font-black uppercase text-white sm:text-sm">{set.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            ) : null}

            <section className="px-4 py-8 md:px-8 md:py-12">
                <div className="mx-auto max-w-[1500px]">
                    <p className="mb-5 text-[11px] font-black uppercase tracking-[0.24em] text-lime-300">Shop listing preview</p>
                    <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10">
                        <div className="order-2 border border-neutral-800 bg-neutral-950 p-5 md:p-8 lg:order-1">
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-400">Artist drop</p>
                            <p className="mt-2 text-sm font-black text-white">{artistName}</p>
                            <p className="mt-10 inline-flex bg-lime-300 px-3 py-1 text-[11px] font-black uppercase text-black">Live from the table</p>
                            <h3 className="mt-6 max-w-3xl text-3xl font-black uppercase leading-tight text-white md:text-5xl">{title}</h3>
                            <p className="mt-5 max-w-2xl text-sm leading-7 text-neutral-300 md:text-base">
                                {description || `A made-after-sale drop from ${artistName}, built for fans backing the scene early.`}
                            </p>
                            <div className="mt-8 border border-neutral-800 bg-black p-4">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-lime-300">Made after sale</p>
                                <p className="mt-3 text-3xl font-black text-lime-300">{money(priceCents)}</p>
                            </div>
                            <div className="mt-7 border-t border-neutral-800 pt-6">
                                <p className="text-xs font-black uppercase text-neutral-400">Colour</p>
                                <div className="mt-2 flex flex-wrap gap-2 text-sm text-white">
                                    {preview.colorMockups.map((item) => <button key={item.label} type="button" onClick={() => setSelectedColorLabel(item.label)} aria-pressed={selectedColor?.label === item.label} className={`inline-flex items-center gap-2 border px-2 py-1 ${selectedColor?.label === item.label ? "border-lime-300 bg-lime-300 text-black" : "border-neutral-700"}`}><span className="h-5 w-5 border border-neutral-500" style={{ backgroundColor: item.value }} />{item.label}</button>)}
                                </div>
                                <p className="mt-5 text-xs font-black uppercase text-neutral-400">Size</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {sizes.map((size) => <span key={size} className="border border-neutral-700 px-2 py-1 text-xs font-bold text-white">{size}</span>)}
                                </div>
                                <button type="button" disabled className="mt-7 h-12 w-full bg-lime-300 text-sm font-black uppercase text-black opacity-60">Add to cart</button>
                            </div>
                            <p className="mt-5 text-xs uppercase text-neutral-500">{category} / {hasFrontDesign && hasBackDesign ? "Front and back print" : hasBackDesign ? "Back print" : "Front print"}</p>
                        </div>
                        <div className="order-1 lg:order-2">
                            <ProductImageGallery key={selectedColor?.label} images={images} title={title} />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
