"use client";

import { useMemo, useState } from "react";

type PricingAnalysisClientProps = {
    initialArtistProfitCents: number;
    initialPlatformProfitCents: number;
    averageBaseCostExGstCents: number;
    averageBaseCostGstCents: number;
    averageShippingExGstCents: number;
    averageShippingGstCents: number;
    initialIncludedPrintSides: number;
    initialAdditionalPrintSideCents: number;
    initialAdditionalPrintSideRetailCents: number | null;
    cheapestProductCostIncGstCents: number;
    cheapestProviderName: string;
    cheapestVariantLabel: string;
    taxLabel: string;
};

function centsToInput(cents: number) {
    return (cents / 100).toFixed(2);
}

function inputToCents(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : 0;
}

function formatMoney(cents: number) {
    return (cents / 100).toLocaleString("en-AU", {
        style: "currency",
        currency: "AUD",
    });
}

export default function PricingAnalysisClient({
    initialArtistProfitCents,
    initialPlatformProfitCents,
    averageBaseCostExGstCents,
    averageBaseCostGstCents,
    averageShippingExGstCents,
    averageShippingGstCents,
    initialIncludedPrintSides,
    initialAdditionalPrintSideCents,
    initialAdditionalPrintSideRetailCents,
    cheapestProductCostIncGstCents,
    cheapestProviderName,
    cheapestVariantLabel,
    taxLabel,
}: PricingAnalysisClientProps) {
    const [artistProfit, setArtistProfit] = useState(centsToInput(initialArtistProfitCents));
    const [platformProfit, setPlatformProfit] = useState(centsToInput(initialPlatformProfitCents));
    const [includedPrintSides, setIncludedPrintSides] = useState(String(initialIncludedPrintSides === 2 ? 2 : 1));
    const [additionalPrintSide, setAdditionalPrintSide] = useState(centsToInput(initialAdditionalPrintSideCents));
    const initialRetailAddOn = initialAdditionalPrintSideRetailCents ?? initialAdditionalPrintSideCents;
    const [additionalPrintSideRetail, setAdditionalPrintSideRetail] = useState(centsToInput(initialRetailAddOn));

    const totals = useMemo(() => {
        const artistProfitCents = inputToCents(artistProfit);
        const platformProfitCents = inputToCents(platformProfit);
        const includedPrintSideCount = includedPrintSides === "2" ? 2 : 1;
        const additionalPrintSideCents = inputToCents(additionalPrintSide);
        const additionalPrintSideRetailCents = inputToCents(additionalPrintSideRetail);
        const averageBaseCostIncGstCents = averageBaseCostExGstCents + averageBaseCostGstCents;
        const averageShippingIncGstCents = averageShippingExGstCents + averageShippingGstCents;
        const taxRate = averageBaseCostExGstCents > 0 ? averageBaseCostGstCents / averageBaseCostExGstCents : 0;
        const additionalPrintSideGstCents = Math.round(additionalPrintSideCents * taxRate);
        const twoSideCostAddOnIncGstCents =
            includedPrintSideCount >= 2 ? 0 : additionalPrintSideCents + additionalPrintSideGstCents;
        const twoSideRetailAddOnCents =
            includedPrintSideCount >= 2 ? 0 : additionalPrintSideRetailCents;
        const singleSideRrpCents = averageBaseCostIncGstCents + artistProfitCents + platformProfitCents;
        const doubleSideProductCostIncGstCents = averageBaseCostIncGstCents + twoSideCostAddOnIncGstCents;
        const doubleSideRrpCents = singleSideRrpCents + twoSideRetailAddOnCents;

        return {
            artistProfitCents,
            platformProfitCents,
            includedPrintSideCount,
            additionalPrintSideCents,
            additionalPrintSideGstCents,
            additionalPrintSideRetailCents,
            averageBaseCostIncGstCents,
            averageShippingIncGstCents,
            singleSideRrpCents,
            doubleSideProductCostIncGstCents,
            doubleSideRrpCents,
            twoSideCostAddOnIncGstCents,
            twoSideRetailAddOnCents,
        };
    }, [
        additionalPrintSide,
        additionalPrintSideRetail,
        artistProfit,
        includedPrintSides,
        platformProfit,
        averageBaseCostExGstCents,
        averageBaseCostGstCents,
        averageShippingExGstCents,
        averageShippingGstCents,
    ]);

    return (
        <section className="border border-neutral-800 bg-black xl:col-span-6">
            <div className="grid gap-5 border-b border-neutral-800 p-5 lg:grid-cols-[1fr_360px]">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-500">
                        Pricing analysis
                    </p>
                    <h2 className="mt-2 text-2xl font-black uppercase">
                        Fulfilment charge flow
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
                        Use this as a margin guide while setting the Global Retail Price above. If a design uses back
                        artwork, the designer adds the customer back-print add-on to the saved Global Retail Price.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                        <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                            Band profit
                        </span>
                        <input
                            name="artist_profit"
                            value={artistProfit}
                            onChange={(event) => setArtistProfit(event.target.value)}
                            className="mt-2 h-11 w-full border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none"
                        />
                    </label>
                    <label className="block">
                        <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                            Our profit
                        </span>
                        <input
                            name="platform_profit"
                            value={platformProfit}
                            onChange={(event) => setPlatformProfit(event.target.value)}
                            className="mt-2 h-11 w-full border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none"
                        />
                    </label>
                    <label className="block">
                        <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                            Included sides
                        </span>
                        <select
                            name="included_print_sides"
                            value={includedPrintSides}
                            onChange={(event) => setIncludedPrintSides(event.target.value)}
                            className="mt-2 h-11 w-full border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none"
                        >
                            <option value="1">Front included</option>
                            <option value="2">Front + back included</option>
                        </select>
                    </label>
                    <label className="block">
                        <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                            Back print add-on ex GST
                        </span>
                        <input
                            name="additional_print_side"
                            value={additionalPrintSide}
                            onChange={(event) => setAdditionalPrintSide(event.target.value)}
                            className="mt-2 h-11 w-full border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none"
                        />
                    </label>
                    <label className="block">
                        <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                            Customer add-on inc GST
                        </span>
                        <input
                            name="additional_print_side_retail"
                            value={additionalPrintSideRetail}
                            onChange={(event) => setAdditionalPrintSideRetail(event.target.value)}
                            className="mt-2 h-11 w-full border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none"
                        />
                    </label>
                </div>
            </div>

            <div className="grid border-b border-neutral-800 md:grid-cols-3 xl:grid-cols-6">
                <AnalysisMetric label="One-side base ex GST" value={formatMoney(averageBaseCostExGstCents)} />
                <AnalysisMetric label="Base GST" value={formatMoney(averageBaseCostGstCents)} />
                <AnalysisMetric label="One-side cost inc GST" value={formatMoney(totals.averageBaseCostIncGstCents)} />
                <AnalysisMetric label="Band profit" value={formatMoney(totals.artistProfitCents)} />
                <AnalysisMetric label="Our profit" value={formatMoney(totals.platformProfitCents)} />
                <AnalysisMetric label="One-side RRP" value={formatMoney(totals.singleSideRrpCents)} highlight />
            </div>

            <div className="grid border-b border-neutral-800 md:grid-cols-5">
                <AnalysisMetric label="Extra side ex GST" value={formatMoney(totals.additionalPrintSideCents)} />
                <AnalysisMetric label="Extra side GST" value={formatMoney(totals.additionalPrintSideGstCents)} />
                <AnalysisMetric label="Two-side cost inc GST" value={formatMoney(totals.doubleSideProductCostIncGstCents)} />
                <AnalysisMetric label="Customer add-on" value={formatMoney(totals.twoSideRetailAddOnCents)} />
                <AnalysisMetric label="Two-side RRP" value={formatMoney(totals.doubleSideRrpCents)} highlight />
            </div>

            <div className="grid border-b border-neutral-800 lg:grid-cols-[1fr_1fr_1fr_1.2fr]">
                <AnalysisMetric label="Ship ex GST" value={formatMoney(averageShippingExGstCents)} />
                <AnalysisMetric label="Ship GST" value={formatMoney(averageShippingGstCents)} />
                <AnalysisMetric label="Shipping charged" value={formatMoney(totals.averageShippingIncGstCents)} />
                <div className="p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                        Shipping treatment
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-300">
                        Fan pays shipping separately at checkout. These costs stay out of product RRP and should be
                        recovered by the selected checkout shipping method.
                    </p>
                </div>
            </div>

            <div className="grid gap-3 p-5 text-xs text-neutral-500 md:grid-cols-3">
                <p>
                    <span className="font-black uppercase text-neutral-300">Cheapest route:</span>{" "}
                    {cheapestProviderName}
                </p>
                <p>
                    <span className="font-black uppercase text-neutral-300">Variant floor:</span>{" "}
                    {cheapestVariantLabel} at {formatMoney(cheapestProductCostIncGstCents)}
                </p>
                <p>
                    <span className="font-black uppercase text-neutral-300">Tax:</span> {taxLabel}. Back print add-on is
                    applied only when the saved design has back artwork.
                </p>
            </div>
        </section>
    );
}

function AnalysisMetric({
    label,
    value,
    highlight = false,
}: {
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div className="border-r border-neutral-800 p-4 last:border-r-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">{label}</p>
            <p className={highlight ? "mt-2 text-2xl font-black text-red-500" : "mt-2 text-xl font-black text-white"}>
                {value}
            </p>
        </div>
    );
}
