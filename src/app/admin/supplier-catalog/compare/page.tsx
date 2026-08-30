import Link from "next/link";
import { ArrowLeft, Globe2, MapPin, Truck } from "lucide-react";

import { requireAdminPage } from "@/lib/auth/admin";
import {
    getPrintifyBlueprint,
    getPrintifyShipping,
    listAllPrintifyPrintProviders,
    listPrintifyPrintProviders,
    listPrintifyVariants,
    type PrintifyPrintProvider,
    type PrintifyShippingResponse,
} from "@/lib/printify/catalog";

type SearchParams = {
    blueprint?: string;
};

type ProviderAnalysis = {
    providerId: number;
    providerName: string;
    city: string | null;
    region: string | null;
    country: string | null;
    isAustralia: boolean;
    enabledVariantCount: number;
    colourCount: number;
    sizeCount: number;
    minCostCents: number | null;
    maxCostCents: number | null;
    averageCostCents: number | null;
    cheapestVariant: string | null;
    auShippingCents: number | null;
    shippingCurrency: string | null;
    landedCostCents: number | null;
    handlingTime: string | null;
    hasShippingToAustralia: boolean;
    error: string | null;
};

const DEFAULT_BLUEPRINT_ID = 145;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SupplierCostComparePage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    await requireAdminPage();

    const params = await searchParams;
    const blueprintId = Number(params.blueprint ?? DEFAULT_BLUEPRINT_ID);
    const analysis = Number.isInteger(blueprintId) && blueprintId > 0
        ? await loadProviderAnalysis(blueprintId)
        : { ok: false as const, message: "Enter a valid Printify blueprint id." };

    return (
        <div className="min-h-screen bg-black p-5 text-white md:p-8">
            <section className="border border-neutral-800 bg-neutral-950">
                <div className="border-b border-neutral-800 p-6">
                    <div>
                        <Link
                            href={`/admin/supplier-catalog?blueprint=${Number.isFinite(blueprintId) ? blueprintId : DEFAULT_BLUEPRINT_ID}`}
                            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-neutral-400 hover:text-white"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to supplier catalogue
                        </Link>
                        <p className="mt-6 text-[11px] font-black uppercase tracking-[0.3em] text-red-500">
                            Printify cost analysis
                        </p>
                        <h1 className="mt-3 max-w-5xl text-4xl font-black uppercase leading-none md:text-6xl">
                            Compare local speed against global price.
                        </h1>
                        <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-400">
                            Analyse every Printify provider for the selected blueprint before deciding what to import. This view
                            is read-only, so it helps choose between a local premium route, an international budget route,
                            or offering fans both.
                        </p>
                    </div>
                </div>

                {analysis.ok ? (
                    <div>
                        <div className="grid border-b border-neutral-800 lg:grid-cols-[1.1fr_0.9fr]">
                            <div className="p-6">
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-500">
                                    Blueprint #{analysis.blueprint.id}
                                </p>
                                <h2 className="mt-2 text-3xl font-black uppercase md:text-5xl">
                                    {analysis.blueprint.title}
                                </h2>
                                <p className="mt-3 text-sm text-neutral-400">
                                    {analysis.blueprint.brand ?? "Unknown brand"}
                                    {analysis.blueprint.model ? ` / ${analysis.blueprint.model}` : ""}
                                </p>
                            </div>
                            <HybridRecommendation {...analysis.summary} />
                        </div>

                        <div className="grid border-b border-neutral-800 md:grid-cols-2 xl:grid-cols-5">
                            <MetricCard label="Providers" value={String(analysis.summary.totalProviders)} />
                            <MetricCard label="Australian providers" value={String(analysis.summary.australianProviders)} />
                            <MetricCard
                                label="Cheapest global"
                                value={formatMaybeMoney(analysis.summary.cheapestGlobal?.landedCostCents)}
                                detail={analysis.summary.cheapestGlobal?.providerName ?? "No AU shipping found"}
                            />
                            <MetricCard
                                label="Cheapest local"
                                value={formatMaybeMoney(analysis.summary.cheapestAustralia?.landedCostCents)}
                                detail={analysis.summary.cheapestAustralia?.providerName ?? "No AU provider found"}
                            />
                            <MetricCard
                                label="Local premium"
                                value={formatMaybeMoney(analysis.summary.localPremiumCents)}
                                detail="Approx difference before margin"
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse text-left text-sm">
                                <thead className="bg-black text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                                    <tr>
                                        <th className="border-b border-neutral-800 px-5 py-4">Provider</th>
                                        <th className="border-b border-neutral-800 px-5 py-4">Printed in</th>
                                        <th className="border-b border-neutral-800 px-5 py-4">Variants</th>
                                        <th className="border-b border-neutral-800 px-5 py-4">Base cost</th>
                                        <th className="border-b border-neutral-800 px-5 py-4">AU shipping</th>
                                        <th className="border-b border-neutral-800 px-5 py-4">Est. landed</th>
                                        <th className="border-b border-neutral-800 px-5 py-4">Best use</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analysis.providers.map((provider) => (
                                        <tr key={provider.providerId} className="align-top hover:bg-neutral-900/70">
                                            <td className="border-b border-neutral-800 px-5 py-5">
                                                <p className="font-black uppercase">{provider.providerName}</p>
                                                <p className="mt-1 text-xs text-neutral-500">Provider #{provider.providerId}</p>
                                                {provider.error ? (
                                                    <p className="mt-2 text-xs text-red-300">{provider.error}</p>
                                                ) : null}
                                            </td>
                                            <td className="border-b border-neutral-800 px-5 py-5">
                                                <span className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-black uppercase ${provider.isAustralia
                                                    ? "border-red-600 bg-red-600 text-white"
                                                    : "border-neutral-700 text-neutral-300"
                                                    }`}>
                                                    {provider.isAustralia ? <MapPin className="h-4 w-4" /> : <Globe2 className="h-4 w-4" />}
                                                    {formatLocation(provider)}
                                                </span>
                                            </td>
                                            <td className="border-b border-neutral-800 px-5 py-5 text-neutral-300">
                                                <p>{provider.enabledVariantCount} enabled</p>
                                                <p className="mt-1 text-xs text-neutral-500">
                                                    {provider.colourCount} colours / {provider.sizeCount} sizes
                                                </p>
                                            </td>
                                            <td className="border-b border-neutral-800 px-5 py-5">
                                                <p className="font-black">{formatCostRange(provider)}</p>
                                                <p className="mt-1 text-xs text-neutral-500">
                                                    Avg {formatMaybeMoney(provider.averageCostCents)}
                                                </p>
                                                {provider.cheapestVariant ? (
                                                    <p className="mt-1 max-w-52 text-xs text-neutral-500">
                                                        Lowest: {provider.cheapestVariant}
                                                    </p>
                                                ) : null}
                                            </td>
                                            <td className="border-b border-neutral-800 px-5 py-5">
                                                <p className="font-black">{formatMaybeMoney(provider.auShippingCents)}</p>
                                                <p className="mt-1 text-xs text-neutral-500">
                                                    {provider.hasShippingToAustralia
                                                        ? provider.handlingTime ?? "AU shipping profile found"
                                                        : "No AU shipping profile returned"}
                                                </p>
                                            </td>
                                            <td className="border-b border-neutral-800 px-5 py-5">
                                                <p className="text-lg font-black text-red-400">
                                                    {formatMaybeMoney(provider.landedCostCents)}
                                                </p>
                                                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                                                    Cost + first item shipping
                                                </p>
                                            </td>
                                            <td className="border-b border-neutral-800 px-5 py-5">
                                                <ProviderSignal provider={provider} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="border border-red-900/60 bg-red-950/20 p-6">
                        <h2 className="text-xl font-black uppercase">Could not analyse blueprint</h2>
                        <p className="mt-2 text-sm leading-6 text-red-100/80">{analysis.message}</p>
                    </div>
                )}
            </section>
        </div>
    );
}

async function loadProviderAnalysis(blueprintId: number) {
    try {
        const [blueprint, blueprintProviders, allProviders] = await Promise.all([
            getPrintifyBlueprint(blueprintId),
            listPrintifyPrintProviders(blueprintId),
            listAllPrintifyPrintProviders(),
        ]);
        const allProviderById = new Map(allProviders.map((provider) => [provider.id, provider]));
        const providers = blueprintProviders.map((provider) => ({
            ...allProviderById.get(provider.id),
            ...provider,
            location: provider.location ?? allProviderById.get(provider.id)?.location,
        }));

        const analysedProviders = await Promise.all(providers.map((provider) => analyseProvider(blueprintId, provider)));
        const usableProviders = analysedProviders.filter((provider) => provider.landedCostCents !== null);
        const cheapestGlobal =
            [...usableProviders].sort((a, b) => (a.landedCostCents ?? Infinity) - (b.landedCostCents ?? Infinity))[0] ??
            null;
        const cheapestAustralia =
            usableProviders
                .filter((provider) => provider.isAustralia)
                .sort((a, b) => (a.landedCostCents ?? Infinity) - (b.landedCostCents ?? Infinity))[0] ?? null;
        const localPremiumCents =
            cheapestGlobal && cheapestAustralia
                ? Math.max(0, (cheapestAustralia.landedCostCents ?? 0) - (cheapestGlobal.landedCostCents ?? 0))
                : null;

        return {
            ok: true as const,
            blueprint,
            providers: [...analysedProviders].sort((a, b) => {
                if (a.isAustralia !== b.isAustralia) {
                    return a.isAustralia ? -1 : 1;
                }

                return (a.landedCostCents ?? Infinity) - (b.landedCostCents ?? Infinity);
            }),
            summary: {
                totalProviders: analysedProviders.length,
                australianProviders: analysedProviders.filter((provider) => provider.isAustralia).length,
                cheapestGlobal,
                cheapestAustralia,
                localPremiumCents,
            },
        };
    } catch (error) {
        return {
            ok: false as const,
            message: error instanceof Error ? error.message : "Printify catalogue request failed.",
        };
    }
}

async function analyseProvider(blueprintId: number, provider: PrintifyPrintProvider): Promise<ProviderAnalysis> {
    const [variantsResult, shippingResult] = await Promise.allSettled([
        listPrintifyVariants(blueprintId, provider.id),
        getPrintifyShipping(blueprintId, provider.id),
    ]);

    const variants = variantsResult.status === "fulfilled" ? variantsResult.value : [];
    const shipping = shippingResult.status === "fulfilled" ? shippingResult.value : null;
    const enabledVariants = variants.filter((variant) => variant.is_enabled !== false);
    const variantsWithCost = enabledVariants.filter((variant) => typeof variant.cost === "number");
    const minCostVariant =
        [...variantsWithCost].sort((a, b) => (a.cost ?? Infinity) - (b.cost ?? Infinity))[0] ?? null;
    const costs = variantsWithCost.map((variant) => variant.cost ?? 0);
    const location = resolveLocation(provider);
    const auShipping = findAustraliaShipping(shipping);
    const minCostCents = costs.length ? Math.min(...costs) : null;
    const maxCostCents = costs.length ? Math.max(...costs) : null;
    const averageCostCents = costs.length
        ? Math.round(costs.reduce((total, cost) => total + cost, 0) / costs.length)
        : null;

    return {
        providerId: provider.id,
        providerName: provider.title,
        ...location,
        isAustralia: isAustralia(location.country),
        enabledVariantCount: enabledVariants.length,
        colourCount: uniqueCount(enabledVariants.map((variant) => parseVariantTitle(variant.title).colour)),
        sizeCount: uniqueCount(enabledVariants.map((variant) => parseVariantTitle(variant.title).size)),
        minCostCents,
        maxCostCents,
        averageCostCents,
        cheapestVariant: minCostVariant?.title ?? null,
        auShippingCents: auShipping?.first_item.cost ?? null,
        shippingCurrency: auShipping?.first_item.currency ?? null,
        landedCostCents:
            minCostCents !== null && auShipping?.first_item.cost !== undefined
                ? minCostCents + auShipping.first_item.cost
                : null,
        handlingTime: formatHandlingTime(shipping),
        hasShippingToAustralia: Boolean(auShipping),
        error: [
            variantsResult.status === "rejected" ? "Could not load variants." : null,
            shippingResult.status === "rejected" ? "Could not load shipping." : null,
        ].filter(Boolean).join(" ") || null,
    };
}

function resolveLocation(provider: PrintifyPrintProvider) {
    const country = provider.location?.country ?? provider.location?.address?.country ?? null;
    const region = provider.location?.region ?? provider.location?.address?.region ?? null;

    return {
        city: provider.location?.city ?? null,
        region,
        country,
    };
}

function findAustraliaShipping(shipping: PrintifyShippingResponse | null) {
    return shipping?.profiles?.find((profile) =>
        profile.countries.some((country) => isAustralia(country))
    ) ?? null;
}

function isAustralia(value?: string | null) {
    const normalised = String(value ?? "").trim().toLowerCase();

    return ["au", "aus", "australia"].includes(normalised);
}

function parseVariantTitle(title: string) {
    const [colour = "Unknown", size = "Unknown"] = title.split("/").map((part) => part.trim());

    return { colour, size };
}

function uniqueCount(values: Array<string | null | undefined>) {
    return new Set(values.filter(Boolean)).size;
}

function formatHandlingTime(shipping: PrintifyShippingResponse | null) {
    const value = shipping?.handling_time?.value;
    const unit = shipping?.handling_time?.unit;

    if (!value || !unit) {
        return null;
    }

    return `${value} ${unit}${value === 1 ? "" : "s"} handling`;
}

function formatLocation(provider: Pick<ProviderAnalysis, "city" | "region" | "country">) {
    return [provider.city, provider.region, provider.country].filter(Boolean).join(", ") || "Unknown";
}

function formatMaybeMoney(cents?: number | null) {
    return typeof cents === "number" ? `$${(cents / 100).toFixed(2)}` : "Not available";
}

function formatCostRange(provider: Pick<ProviderAnalysis, "minCostCents" | "maxCostCents">) {
    if (provider.minCostCents === null || provider.maxCostCents === null) {
        return "Not available";
    }

    if (provider.minCostCents === provider.maxCostCents) {
        return formatMaybeMoney(provider.minCostCents);
    }

    return `${formatMaybeMoney(provider.minCostCents)} - ${formatMaybeMoney(provider.maxCostCents)}`;
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
    return (
        <div className="border-b border-neutral-800 p-5 md:border-r">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-neutral-500">{label}</p>
            <p className="mt-2 text-2xl font-black uppercase">{value}</p>
            {detail ? <p className="mt-2 text-xs text-neutral-500">{detail}</p> : null}
        </div>
    );
}

function HybridRecommendation({
    cheapestGlobal,
    cheapestAustralia,
    localPremiumCents,
}: {
    cheapestGlobal: ProviderAnalysis | null;
    cheapestAustralia: ProviderAnalysis | null;
    localPremiumCents: number | null;
}) {
    const hasUsefulHybrid = cheapestGlobal && cheapestAustralia && localPremiumCents !== null && localPremiumCents > 300;

    return (
        <div className="border-t border-neutral-800 bg-black p-6 lg:border-l lg:border-t-0">
            <div className="inline-flex items-center gap-2 bg-red-600 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em]">
                <Truck className="h-4 w-4" />
                Hybrid read
            </div>
            <h2 className="mt-4 text-3xl font-black uppercase">
                {hasUsefulHybrid ? "Offer fans a choice." : "Use this as a routing check."}
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
                {hasUsefulHybrid
                    ? "This blueprint looks like a good candidate for two checkout options: a cheaper international print route and a local Australian route for fans who care more about speed."
                    : "The local premium is either small, missing, or not measurable from the returned shipping profiles. This can still guide least-cost routing, but the fan-facing split may not be worth extra checkout complexity yet."}
            </p>
        </div>
    );
}

function ProviderSignal({ provider }: { provider: ProviderAnalysis }) {
    if (provider.isAustralia) {
        return (
            <div>
                <p className="font-black uppercase text-red-400">Local-fast option</p>
                <p className="mt-2 text-xs leading-5 text-neutral-500">
                    Good candidate for Australian buyers who will pay more for a closer printer.
                </p>
            </div>
        );
    }

    if (provider.landedCostCents !== null) {
        return (
            <div>
                <p className="font-black uppercase text-white">Budget option</p>
                <p className="mt-2 text-xs leading-5 text-neutral-500">
                    Good candidate for lowest-cost routing, with delivery expectations made clear at checkout.
                </p>
            </div>
        );
    }

    return (
        <div>
            <p className="font-black uppercase text-neutral-400">Coverage unknown</p>
            <p className="mt-2 text-xs leading-5 text-neutral-500">
                Missing AU shipping data, so avoid importing until the route is understood.
            </p>
        </div>
    );
}
