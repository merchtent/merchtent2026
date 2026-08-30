"use client";

import { useMemo, useState } from "react";

const productOptions = [
    {
        label: "Tee",
        profit: 10.5,
        note: "A solid first-drop estimate for a standard tee.",
    },
    {
        label: "Hoodie",
        profit: 12,
        note: "Higher selling price, but production cost is higher too.",
    },
    {
        label: "Hat",
        profit: 6.5,
        note: "Smaller items may return less profit per sale.",
    },
];

const formatAud = (value: number) =>
    new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
        minimumFractionDigits: 2,
    }).format(value);

export function StartProfitCalculator() {
    const [product, setProduct] = useState(productOptions[0]);
    const [units, setUnits] = useState(20);

    const estimatedTotal = useMemo(() => units * product.profit, [product.profit, units]);

    return (
        <div className="grid gap-px bg-neutral-800 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="bg-black p-5 md:p-8">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">Artist earnings*</p>
                <h2 className="mt-2 max-w-3xl text-5xl font-black uppercase leading-[0.88] md:text-7xl">
                    Get paid when the drop sells.
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-300">
                    Merch Tent is built around per-sale profit. You do not need to buy boxes upfront: fans buy from the
                    live listing, the order is fulfilled, and the artist profit is tracked per product sold.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-500">
                    * Estimates only. Actual artist profit depends on the blank, supplier, print sides, shipping setup,
                    GST treatment, fees, and the final price configured for that product.
                </p>
            </div>

            <div className="bg-[#f3f1e8] p-5 text-black md:p-8">
                <div className="grid gap-5 md:grid-cols-2">
                    <label className="grid gap-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-red-600">Product type</span>
                        <select
                            value={product.label}
                            onChange={(event) => {
                                const next = productOptions.find((option) => option.label === event.target.value);
                                if (next) setProduct(next);
                            }}
                            className="h-14 border border-black bg-white px-4 text-lg font-black uppercase outline-none focus:border-lime-500"
                        >
                            {productOptions.map((option) => (
                                <option key={option.label} value={option.label}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="grid gap-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-red-600">Units sold</span>
                        <input
                            type="number"
                            min="1"
                            max="500"
                            value={units}
                            onChange={(event) => setUnits(Math.max(1, Number(event.target.value) || 1))}
                            className="h-14 border border-black bg-white px-4 text-lg font-black outline-none focus:border-lime-500"
                        />
                    </label>
                </div>

                <div className="mt-6 grid gap-px bg-neutral-300 sm:grid-cols-3">
                    <div className="bg-white p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                            Est. per sale*
                        </p>
                        <p className="mt-2 text-3xl font-black text-lime-600">{formatAud(product.profit)}</p>
                    </div>
                    <div className="bg-white p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                            Units sold
                        </p>
                        <p className="mt-2 text-3xl font-black">{units}</p>
                    </div>
                    <div className="bg-lime-300 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/60">
                            Est. artist payout*
                        </p>
                        <p className="mt-2 text-3xl font-black">{formatAud(estimatedTotal)}</p>
                    </div>
                </div>

                <p className="mt-4 text-sm font-bold leading-6 text-neutral-700">{product.note}</p>
            </div>
        </div>
    );
}
