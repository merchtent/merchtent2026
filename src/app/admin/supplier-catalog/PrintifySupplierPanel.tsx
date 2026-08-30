"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
    AlertTriangle,
    ArrowRight,
    BarChart3,
    CheckCircle2,
    Download,
    Loader2,
    Search,
    X,
} from "lucide-react";
import type { PrintifyBlueprint, PrintifyPrintProvider } from "@/lib/printify/catalog";
import { importPrintifyCatalogueProductAction } from "./actions";

type PrintifyPreview =
    | {
        ok: true;
        blueprint: PrintifyBlueprint;
        providers: PrintifyPrintProvider[];
    }
    | {
        ok: false;
        message: string;
    };

type BlueprintResponse =
    | {
        success: true;
        blueprint: PrintifyBlueprint;
        providers: PrintifyPrintProvider[];
        importedProviderIds: number[];
    }
    | {
        success: false;
        message: string;
    };

export default function PrintifySupplierPanel({
    initialBlueprints,
    initialPreview,
    initialBlueprintId,
    initialQuery,
    initialImportedProviderIds,
}: {
    initialBlueprints: PrintifyBlueprint[];
    initialPreview: PrintifyPreview;
    initialBlueprintId: number;
    initialQuery: string;
    initialImportedProviderIds: number[];
}) {
    const [query, setQuery] = useState(initialQuery);
    const [selectedBlueprintId, setSelectedBlueprintId] = useState(initialBlueprintId);
    const [preview, setPreview] = useState<PrintifyPreview>(initialPreview);
    const [importedProviderIds, setImportedProviderIds] = useState(() => new Set(initialImportedProviderIds));
    const [importingProviderId, setImportingProviderId] = useState<number | null>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [successModal, setSuccessModal] = useState<{
        providerName: string;
        blueprintTitle: string;
    } | null>(null);
    const [isPending, startTransition] = useTransition();

    const filteredBlueprints = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        const filtered = normalizedQuery
            ? initialBlueprints.filter((blueprint) =>
                [
                    blueprint.title,
                    blueprint.brand ?? "",
                    blueprint.model ?? "",
                    String(blueprint.id),
                ]
                    .join(" ")
                    .toLowerCase()
                    .includes(normalizedQuery)
            )
            : initialBlueprints;

        return filtered.slice(0, 60);
    }, [initialBlueprints, query]);

    function selectBlueprint(blueprintId: number) {
        setSelectedBlueprintId(blueprintId);
        setImportError(null);
        setImportedProviderIds(new Set());
        startTransition(async () => {
            try {
                const response = await fetch(
                    `/api/admin/supplier-catalog/printify/blueprint/${blueprintId}`,
                    { cache: "no-store" }
                );
                const data = (await response.json()) as BlueprintResponse;

                if (!response.ok || !data.success) {
                    setPreview({
                        ok: false,
                        message: data.success ? "Printify catalogue request failed." : data.message,
                    });
                    return;
                }

                setPreview({
                    ok: true,
                    blueprint: data.blueprint,
                    providers: data.providers,
                });
                setImportedProviderIds(new Set(data.importedProviderIds));
            } catch (error) {
                setPreview({
                    ok: false,
                    message: error instanceof Error ? error.message : "Printify catalogue request failed.",
                });
            }
        });
    }

    async function submitProviderImport(event: React.FormEvent<HTMLFormElement>, provider: PrintifyPrintProvider) {
        event.preventDefault();
        if (!preview.ok || importingProviderId || importedProviderIds.has(provider.id)) return;

        setImportingProviderId(provider.id);
        setImportError(null);

        try {
            await importPrintifyCatalogueProductAction(new FormData(event.currentTarget));
            setImportedProviderIds((current) => new Set([...current, provider.id]));
            setSuccessModal({
                providerName: provider.title,
                blueprintTitle: preview.blueprint.title,
            });
        } catch (error) {
            setImportError(error instanceof Error ? error.message : "Could not import this provider.");
        } finally {
            setImportingProviderId(null);
        }
    }

    return (
        <>
            {successModal ? (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
                    <div className="w-full max-w-lg border border-neutral-700 bg-neutral-950 p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-500">
                                    Provider imported
                                </p>
                                <h2 className="mt-3 text-3xl font-black uppercase leading-tight">
                                    Ready for the catalogue.
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSuccessModal(null)}
                                className="grid h-10 w-10 place-items-center border border-neutral-800 text-neutral-400 hover:border-red-500 hover:text-white"
                                aria-label="Close import success message"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-neutral-300">
                            {successModal.providerName} has been added as a fulfilment option for{" "}
                            <b>{successModal.blueprintTitle}</b>. The button is now locked so you do not import the same
                            provider twice.
                        </p>
                        <button
                            type="button"
                            onClick={() => setSuccessModal(null)}
                            className="mt-6 inline-flex h-11 items-center justify-center bg-red-600 px-5 text-sm font-black uppercase text-white hover:bg-red-500"
                        >
                            Done
                        </button>
                    </div>
                </div>
            ) : null}

            <div className="border-b border-neutral-800 p-6">
                <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-500">
                            Browse blueprints
                        </p>
                        <h2 className="mt-2 text-2xl font-black uppercase">
                            Find products by name.
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-neutral-400">
                            This reads the live Printify blueprint list, then only imports the product/provider you
                            approve below.
                        </p>
                        <div className="mt-5 flex border border-neutral-800 bg-black">
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search tees, hoodies, caps..."
                                className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                            />
                            <span className="inline-flex h-11 items-center gap-2 bg-neutral-900 px-4 text-xs font-black uppercase">
                                <Search className="h-4 w-4" />
                                Search
                            </span>
                        </div>
                    </div>

                    <div className="grid max-h-[420px] gap-3 overflow-auto pr-2 md:grid-cols-2 xl:grid-cols-3">
                        {filteredBlueprints.map((blueprint) => (
                            <button
                                key={blueprint.id}
                                type="button"
                                onClick={() => selectBlueprint(blueprint.id)}
                                className={`group border p-4 text-left transition hover:border-red-500 hover:bg-red-500/10 ${blueprint.id === selectedBlueprintId
                                    ? "border-red-500 bg-red-500/10"
                                    : "border-neutral-800 bg-black"
                                    }`}
                            >
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-400">
                                    Blueprint #{blueprint.id}
                                </p>
                                <h3 className="mt-2 line-clamp-2 text-sm font-black uppercase leading-tight">
                                    {blueprint.title}
                                </h3>
                                <p className="mt-2 text-xs text-neutral-500">
                                    {[blueprint.brand, blueprint.model].filter(Boolean).join(" / ") || "Printify"}
                                </p>
                                <span className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase text-white">
                                    {blueprint.id === selectedBlueprintId ? "Selected" : "Select"}
                                    <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" />
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <section className="p-6">
                {isPending ? (
                    <div className="border border-neutral-800 bg-black p-5 text-sm font-black uppercase tracking-[0.18em] text-neutral-400">
                        Loading providers...
                    </div>
                ) : preview.ok ? (
                    <div>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-500">
                                    Printify preview
                                </p>
                                <h2 className="mt-2 text-3xl font-black uppercase">
                                    {preview.blueprint.title}
                                </h2>
                                <p className="mt-2 text-sm text-neutral-400">
                                    {preview.blueprint.brand ?? "Printify"} /{" "}
                                    {preview.blueprint.model ?? `Blueprint ${preview.blueprint.id}`}
                                </p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="border border-neutral-800 bg-black p-4 text-sm">
                                    <b>{preview.providers.length}</b> providers available
                                </div>
                                <Link
                                    href={`/admin/supplier-catalog/compare?blueprint=${preview.blueprint.id}`}
                                    className="inline-flex items-center justify-center gap-2 border border-neutral-700 bg-neutral-950 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:border-red-500 hover:bg-red-600"
                                >
                                    <BarChart3 className="h-4 w-4" />
                                    Compare costs
                                </Link>
                            </div>
                        </div>

                        {importError ? (
                            <div className="mt-5 border border-red-900/60 bg-red-950/20 p-4 text-sm leading-6 text-red-100">
                                {importError}
                            </div>
                        ) : null}

                        <div className="mt-6 space-y-3">
                            {preview.providers.map((provider) => {
                                const alreadyImported = importedProviderIds.has(provider.id);
                                const isImporting = importingProviderId === provider.id;

                                return (
                                <form
                                    key={provider.id}
                                    onSubmit={(event) => submitProviderImport(event, provider)}
                                    className={`grid gap-4 border bg-black p-4 md:grid-cols-[1fr_220px_170px] ${alreadyImported
                                        ? "border-red-900/50"
                                        : "border-neutral-800"
                                        }`}
                                >
                                    <input type="hidden" name="blueprint_id" value={preview.blueprint.id} />
                                    <input type="hidden" name="print_provider_id" value={provider.id} />
                                    <input type="hidden" name="print_provider_name" value={provider.title} />
                                    <input type="hidden" name="print_provider_country" value={providerCountry(provider)} />
                                    <input type="hidden" name="print_provider_region" value={providerRegion(provider)} />
                                    <input type="hidden" name="print_provider_city" value={providerCity(provider)} />
                                    <div>
                                        <p className="text-lg font-black uppercase">{provider.title}</p>
                                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                                            Provider #{provider.id}
                                        </p>
                                        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                                            <span className="border border-neutral-800 bg-neutral-950 px-3 py-2">
                                                <b className="block text-white">Printed in</b>
                                                {providerCountryLabel(provider)}
                                            </span>
                                            <span className="border border-neutral-800 bg-neutral-950 px-3 py-2">
                                                <b className="block text-white">Region</b>
                                                {providerRegionLabel(provider)}
                                            </span>
                                        </div>
                                        <p className="mt-3 inline-flex items-center gap-2 text-xs text-neutral-400">
                                            <CheckCircle2 className="h-4 w-4 text-red-500" />
                                            Import one provider, or import multiple providers for wider colour and
                                            fulfilment coverage.
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="block">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                                                Merch Tent name
                                            </span>
                                            <input
                                                name="merch_tent_name"
                                                defaultValue="Classic Tee"
                                                className="mt-1 h-10 w-full border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none"
                                            />
                                        </label>
                                        <p className="border border-neutral-800 bg-neutral-950 px-3 py-3 text-xs leading-5 text-neutral-500">
                                            Retail price is set once on the imported catalogue product, not per provider.
                                        </p>
                                        <input type="hidden" name="category" value="tees" />
                                    </div>
                                    <button
                                        disabled={alreadyImported || isImporting || importingProviderId !== null}
                                        className={`inline-flex h-12 items-center justify-center gap-2 self-end px-5 text-sm font-black uppercase text-white ${alreadyImported
                                            ? "cursor-not-allowed border border-red-900/50 bg-neutral-900 text-red-300"
                                            : "bg-red-600 hover:bg-red-500 disabled:cursor-wait disabled:bg-red-900/70"
                                            }`}
                                    >
                                        {isImporting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Importing
                                            </>
                                        ) : alreadyImported ? (
                                            <>
                                                <CheckCircle2 className="h-4 w-4" />
                                                Imported
                                            </>
                                        ) : (
                                            <>
                                                <Download className="h-4 w-4" />
                                                Import
                                                <ArrowRight className="h-4 w-4" />
                                            </>
                                        )}
                                    </button>
                                </form>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="border border-red-900/60 bg-red-950/20 p-5">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-1 h-5 w-5 text-red-400" />
                            <div>
                                <h2 className="text-xl font-black uppercase">Could not load Printify</h2>
                                <p className="mt-2 text-sm leading-6 text-red-100/80">{preview.message}</p>
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </>
    );
}

function providerCountry(provider: PrintifyPrintProvider) {
    return provider.location?.country ?? provider.location?.address?.country ?? "";
}

function providerRegion(provider: PrintifyPrintProvider) {
    return provider.location?.region ?? provider.location?.address?.region ?? "";
}

function providerCity(provider: PrintifyPrintProvider) {
    return provider.location?.city ?? "";
}

function providerCountryLabel(provider: PrintifyPrintProvider) {
    return providerCountry(provider) || "Not supplied";
}

function providerRegionLabel(provider: PrintifyPrintProvider) {
    return [providerCity(provider), providerRegion(provider)].filter(Boolean).join(", ") || "Not supplied";
}
