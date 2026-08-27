"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeDollarSign, ImagePlus, MousePointer2, Shirt, Sparkles, Store } from "lucide-react";

const productTypes = [
    { label: "Tee", cost: 22, icon: Shirt },
    { label: "Hoodie", cost: 42, icon: Shirt },
    { label: "Poster", cost: 12, icon: ImagePlus },
    { label: "Tote", cost: 16, icon: Store },
];

const creatorSteps = [
    {
        icon: Shirt,
        title: "Pick the blank",
        text: "Start with a tee, hoodie, poster, or accessory template built for artist merch.",
    },
    {
        icon: MousePointer2,
        title: "Design in the browser",
        text: "Drop in artwork, text, logos, and scene references. Move it around until it feels like the band.",
    },
    {
        icon: ImagePlus,
        title: "Mockups go live",
        text: "Merch Tent generates storefront mockups and stores the production design data for fulfillment.",
    },
];

export default function CreatorLaunchPad() {
    const [selected, setSelected] = useState(productTypes[0]);
    const [sellPrice, setSellPrice] = useState(45);
    const [dailySales, setDailySales] = useState(2);

    const monthly = useMemo(() => {
        const margin = Math.max(sellPrice - selected.cost, 0);
        return Math.round(margin * dailySales * 30);
    }, [dailySales, selected.cost, sellPrice]);

    return (
        <section className="relative overflow-hidden border-y border-neutral-800 bg-neutral-950 text-white">
            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(239,68,68,0.18),transparent_38%,rgba(255,255,255,0.05)_72%,transparent)]" />

            <div className="relative max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-14 md:py-18">
                <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-8 lg:gap-10 items-stretch">
                    <div className="flex flex-col justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-red-300">
                                <Sparkles className="h-3.5 w-3.5" />
                                Artist product creator
                            </div>

                            <h2 className="mt-5 text-4xl md:text-6xl font-black leading-[0.9]">
                                Make the merch before you make the boxes.
                            </h2>

                            <p className="mt-5 max-w-xl text-neutral-300">
                                The artist path should feel simple: design the drop, publish the mockups, and only
                                push production when fans actually buy.
                            </p>
                        </div>

                        <div className="mt-8 grid sm:grid-cols-3 gap-3">
                            {creatorSteps.map((step) => {
                                const Icon = step.icon;

                                return (
                                    <div key={step.title} className="border border-neutral-800 bg-black p-4 rounded-md">
                                        <Icon className="h-5 w-5 text-red-400" />
                                        <p className="mt-3 text-sm font-black">{step.title}</p>
                                        <p className="mt-2 text-xs leading-relaxed text-neutral-400">{step.text}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="border border-neutral-800 bg-black p-5 md:p-6 rounded-lg">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Drop maths</p>
                                <h3 className="mt-1 text-2xl md:text-3xl font-black">What could one design do?</h3>
                            </div>
                            <BadgeDollarSign className="h-8 w-8 text-red-400" />
                        </div>

                        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {productTypes.map((product) => {
                                const Icon = product.icon;
                                const active = product.label === selected.label;

                                return (
                                    <button
                                        key={product.label}
                                        type="button"
                                        onClick={() => setSelected(product)}
                                        className={`border px-3 py-3 text-left transition ${
                                            active
                                                ? "border-red-500 bg-red-500 text-white"
                                                : "border-neutral-800 bg-neutral-950 hover:border-neutral-600"
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span className="mt-2 block text-sm font-black">{product.label}</span>
                                        <span className={active ? "text-xs text-red-100" : "text-xs text-neutral-500"}>
                                            Est. base ${product.cost}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-6 grid md:grid-cols-2 gap-4">
                            <label className="block">
                                <span className="text-xs uppercase tracking-[0.18em] text-neutral-500">Sell price</span>
                                <input
                                    type="range"
                                    min={25}
                                    max={120}
                                    step={5}
                                    value={sellPrice}
                                    onChange={(event) => setSellPrice(Number(event.target.value))}
                                    className="mt-3 w-full accent-red-500"
                                />
                                <span className="mt-1 block text-2xl font-black">${sellPrice}</span>
                            </label>

                            <label className="block">
                                <span className="text-xs uppercase tracking-[0.18em] text-neutral-500">Daily sales</span>
                                <input
                                    type="range"
                                    min={1}
                                    max={20}
                                    step={1}
                                    value={dailySales}
                                    onChange={(event) => setDailySales(Number(event.target.value))}
                                    className="mt-3 w-full accent-red-500"
                                />
                                <span className="mt-1 block text-2xl font-black">{dailySales}/day</span>
                            </label>
                        </div>

                        <div className="mt-6 border border-red-500/40 bg-red-500/10 p-5">
                            <p className="text-xs uppercase tracking-[0.22em] text-red-300">Illustrative monthly margin</p>
                            <p className="mt-2 text-5xl font-black">${monthly}</p>
                            <p className="mt-2 text-xs text-neutral-400">
                                Estimate only. Final artist earnings depend on fulfillment cost, shipping, taxes,
                                discounts, payout rules, and platform settings.
                            </p>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                                href="/dashboard/products/designer"
                                className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-black text-black hover:bg-red-200"
                            >
                                Open designer
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/start"
                                className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-5 py-3 text-sm font-black hover:border-red-400"
                            >
                                How artists launch
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
