import Link from "next/link";
import { ArrowRight, Database, Search } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/admin";
import {
    getPrintifyBlueprint,
    listAllPrintifyPrintProviders,
    listPrintifyBlueprints,
    listPrintifyPrintProviders,
} from "@/lib/printify/catalog";
import { updateSupplierCatalogProductPriceAction } from "./actions";
import PrintifySupplierPanel from "./PrintifySupplierPanel";

type SearchParams = {
    blueprint?: string;
    q?: string;
    supplier?: string;
};

type CatalogueRow = {
    id: string;
    supplier: string;
    supplier_product_id: string;
    supplier_product_name: string;
    supplier_provider_id: string | null;
    supplier_provider_name: string | null;
    merch_tent_name: string;
    category: string;
    status: string;
    default_price_cents: number | null;
    created_at: string;
};

type CataloguePricingRow = {
    supplier: string;
    supplier_product_id: string;
    default_price_cents: number;
};

const supplierTabs = [
    {
        key: "printify",
        label: "Printify",
        description: "Live API catalogue import",
        status: "Connected",
    },
    {
        key: "printful",
        label: "Printful",
        description: "Prepared for API import",
        status: "Next",
    },
    {
        key: "local",
        label: "Local suppliers",
        description: "Manual blanks and printers",
        status: "Planned",
    },
] as const;

type SupplierTabKey = (typeof supplierTabs)[number]["key"];

function resolveSupplierTab(value?: string): SupplierTabKey {
    return supplierTabs.some((tab) => tab.key === value) ? (value as SupplierTabKey) : "printify";
}

export default async function SupplierCatalogPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const { supabase } = await requireAdminPage();
    const params = await searchParams;
    const activeSupplier = resolveSupplierTab(params.supplier);
    const blueprintId = Number(params.blueprint ?? 145);
    const query = String(params.q ?? "").trim();
    const [catalogueRows, cataloguePricing, blueprints, preview] = await Promise.all([
        supabase
            .from("supplier_catalog_products")
            .select("id, supplier, supplier_product_id, supplier_product_name, supplier_provider_id, supplier_provider_name, merch_tent_name, category, status, default_price_cents, created_at")
            .order("created_at", { ascending: false }),
        supabase
            .from("supplier_catalog_product_pricing")
            .select("supplier, supplier_product_id, default_price_cents"),
        activeSupplier === "printify" ? loadPrintifyBlueprints() : Promise.resolve(null),
        activeSupplier === "printify" ? loadPrintifyPreview(blueprintId) : Promise.resolve(null),
    ]);
    const priceMap = new Map(
        ((cataloguePricing.data ?? []) as CataloguePricingRow[]).map((row) => [
            `${row.supplier}:${row.supplier_product_id}`,
            row.default_price_cents,
        ])
    );
    const catalogueGroups = groupCatalogueRows((catalogueRows.data ?? []) as CatalogueRow[], priceMap);

    return (
        <div className="min-h-screen bg-black p-5 text-white md:p-8">
            <section className="border border-neutral-800 bg-neutral-950">
                <div className="grid gap-6 border-b border-neutral-800 p-6 lg:grid-cols-[1fr_380px]">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-500">
                            Supplier catalogue
                        </p>
                        <h1 className="mt-3 text-4xl font-black uppercase leading-none md:text-6xl">
                            Curate blanks. Do not sync the world.
                        </h1>
                        <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-400">
                            Pull live supplier data only when we choose a product. Imported blanks become Merch Tent
                            catalogue products artists can design against.
                        </p>
                    </div>
                    {activeSupplier === "printify" ? (
                    <form className="self-end">
                        <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-neutral-500">
                            Printify blueprint id
                        </label>
                        <div className="mt-2 flex border border-neutral-800 bg-black">
                            <input
                                name="blueprint"
                                defaultValue={Number.isFinite(blueprintId) ? blueprintId : 145}
                                className="h-12 min-w-0 flex-1 bg-transparent px-4 text-sm outline-none"
                            />
                            <button className="inline-flex h-12 items-center gap-2 bg-red-600 px-5 text-sm font-black uppercase">
                                <Search className="h-4 w-4" />
                                Fetch
                            </button>
                        </div>
                    </form>
                    ) : null}
                </div>

                <nav className="grid border-b border-neutral-800 md:grid-cols-3">
                    {supplierTabs.map((tab) => {
                        const href = `/admin/supplier-catalog?supplier=${tab.key}${tab.key === "printify" ? `&blueprint=${Number.isFinite(blueprintId) ? blueprintId : 145}${query ? `&q=${encodeURIComponent(query)}` : ""}` : ""}`;
                        const isActive = activeSupplier === tab.key;

                        return (
                            <a
                                key={tab.key}
                                href={href}
                                className={`border-b border-neutral-800 p-5 transition md:border-b-0 md:border-r ${isActive
                                    ? "bg-red-600 text-white"
                                    : "bg-black text-neutral-400 hover:bg-neutral-900 hover:text-white"
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <h2 className="text-xl font-black uppercase">{tab.label}</h2>
                                    <span className={`border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${isActive
                                        ? "border-black/20 bg-black text-white"
                                        : "border-neutral-800 text-red-400"
                                        }`}>
                                        {tab.status}
                                    </span>
                                </div>
                                <p className={`mt-2 text-xs uppercase tracking-[0.16em] ${isActive ? "text-white/80" : "text-neutral-500"}`}>
                                    {tab.description}
                                </p>
                            </a>
                        );
                    })}
                </nav>

                <div className="grid divide-y divide-neutral-800 lg:grid-cols-[380px_1fr] lg:divide-x lg:divide-y-0">
                    <aside className="p-6">
                        <div className="flex items-center gap-2 text-sm font-black uppercase">
                            <Database className="h-4 w-4 text-red-500" />
                            Approved catalogue
                        </div>
                        <div className="mt-5 space-y-3">
                            {catalogueRows.error || cataloguePricing.error ? (
                                <p className="text-sm text-red-300">
                                    Catalogue tables are not available yet. Run the latest Supabase migration.
                                </p>
                            ) : (catalogueRows.data ?? []).length === 0 ? (
                                <p className="text-sm text-neutral-500">
                                    No imported blanks yet. Import one Printify provider to unlock the database-backed
                                    designer catalogue.
                                </p>
                            ) : (
                                catalogueGroups.map((group) => (
                                    <div key={group.key} className="border border-neutral-800 bg-black p-4">
                                        <Link
                                            href={`/admin/supplier-catalog/${encodeURIComponent(group.supplier)}/${encodeURIComponent(group.supplierProductId)}`}
                                            className="group block"
                                        >
                                            <span className="flex items-start justify-between gap-3">
                                                <span className="text-sm font-black uppercase group-hover:text-red-400">
                                                    {group.name}
                                                </span>
                                                <ArrowRight className="h-4 w-4 text-neutral-500 transition group-hover:translate-x-1 group-hover:text-red-400" />
                                            </span>
                                        </Link>
                                        <p className="mt-1 text-xs text-neutral-500">
                                            {group.supplier} #{group.supplierProductId} / {group.providerCount} provider
                                            {group.providerCount === 1 ? "" : "s"}
                                        </p>
                                        <form action={updateSupplierCatalogProductPriceAction} className="mt-4">
                                            <input type="hidden" name="supplier" value={group.supplier} />
                                            <input type="hidden" name="supplier_product_id" value={group.supplierProductId} />
                                            <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                                                Global retail price
                                            </label>
                                            <div className="mt-2 flex border border-neutral-800 bg-neutral-950">
                                                <input
                                                    name="default_price"
                                                    defaultValue={((group.defaultPriceCents ?? 3900) / 100).toFixed(2)}
                                                    className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                                                />
                                                <button className="bg-red-600 px-3 text-[11px] font-black uppercase">
                                                    Save
                                                </button>
                                            </div>
                                            <p className="mt-2 text-[11px] leading-5 text-neutral-500">
                                                Used as the default product price for every artist product built from
                                                this blank.
                                            </p>
                                        </form>
                                        <div className="mt-3 flex items-center justify-between text-xs">
                                            <span className="uppercase tracking-wide text-red-400">{group.status}</span>
                                            <span>{group.category}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </aside>

                    <section className="p-6">
                        {activeSupplier === "printify" ? (
                            blueprints?.ok && preview ? (
                                <PrintifySupplierPanel
                                    initialBlueprints={blueprints.items}
                                    initialPreview={preview}
                                    initialBlueprintId={Number.isFinite(blueprintId) ? blueprintId : 145}
                                    initialQuery={query}
                                    initialImportedProviderIds={importedProviderIdsForBlueprint(
                                        (catalogueRows.data ?? []) as CatalogueRow[],
                                        Number.isFinite(blueprintId) ? blueprintId : 145
                                    )}
                                />
                            ) : (
                                <div className="border border-red-900/60 bg-red-950/20 p-5">
                                    <h2 className="text-xl font-black uppercase">Could not load Printify</h2>
                                    <p className="mt-2 text-sm leading-6 text-red-100/80">
                                        {blueprints?.message ?? "Printify catalogue request failed."}
                                    </p>
                                </div>
                            )
                        ) : (
                            <div className="border border-neutral-800 bg-black p-6">
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-500">
                                    {activeSupplier} setup
                                </p>
                                <h2 className="mt-2 text-3xl font-black uppercase">
                                    Supplier connector not built yet.
                                </h2>
                                <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
                                    The catalogue tables already support this supplier. Next step is adding an importer
                                    that maps their products, variants, costs, print areas and shipping into the same
                                    Merch Tent catalogue structure.
                                </p>
                            </div>
                        )}
                    </section>
                </div>
            </section>
        </div>
    );
}

async function loadPrintifyBlueprints() {
    try {
        const blueprints = await listPrintifyBlueprints();

        return {
            ok: true as const,
            items: blueprints,
        };
    } catch (error) {
        return {
            ok: false as const,
            message: error instanceof Error ? error.message : "Could not load Printify blueprints.",
        };
    }
}

async function loadPrintifyPreview(blueprintId: number) {
    if (!Number.isInteger(blueprintId) || blueprintId <= 0) {
        return { ok: false as const, message: "Enter a valid Printify blueprint id." };
    }

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

        return { ok: true as const, blueprint, providers };
    } catch (error) {
        return {
            ok: false as const,
            message: error instanceof Error ? error.message : "Printify catalogue request failed.",
        };
    }
}

function groupCatalogueRows(rows: CatalogueRow[], priceMap = new Map<string, number>()) {
    const groups = new Map<
        string,
        {
            key: string;
            supplier: string;
            supplierProductId: string;
            name: string;
            category: string;
            status: string;
            defaultPriceCents: number | null;
            providerIds: Set<string>;
        }
    >();

    for (const row of rows) {
        const key = `${row.supplier}:${row.supplier_product_id}`;
        const existing = groups.get(key);

        if (existing) {
            existing.providerIds.add(row.supplier_provider_id ?? row.id);
            existing.defaultPriceCents = priceMap.get(key) ?? existing.defaultPriceCents;
            continue;
        }

        groups.set(key, {
            key,
            supplier: row.supplier,
            supplierProductId: row.supplier_product_id,
            name: row.merch_tent_name || row.supplier_product_name,
            category: row.category,
            status: row.status,
            defaultPriceCents: priceMap.get(key) ?? row.default_price_cents,
            providerIds: new Set([row.supplier_provider_id ?? row.id]),
        });
    }

    return Array.from(groups.values()).map((group) => ({
        ...group,
        providerCount: group.providerIds.size,
    }));
}

function importedProviderIdsForBlueprint(rows: CatalogueRow[], blueprintId: number) {
    return rows
        .filter((row) => row.supplier === "printify" && row.supplier_product_id === String(blueprintId))
        .map((row) => Number(row.supplier_provider_id))
        .filter((id) => Number.isInteger(id) && id > 0);
}
