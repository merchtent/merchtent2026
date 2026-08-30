import "server-only";

import { getServerSupabase } from "@/lib/supabase/server";
import type { CatalogProduct, CatalogProductColor, CatalogProviderOption } from "@/lib/product-catalog";

type SupplierCatalogProductRow = {
    id: string;
    supplier: "printify" | "printful" | "local";
    supplier_product_id: string;
    supplier_product_name: string;
    supplier_brand: string | null;
    supplier_model: string | null;
    supplier_provider_id: string | null;
    supplier_provider_name: string | null;
    supplier_product_url: string | null;
    merch_tent_name: string;
    category: CatalogProduct["category"];
    garment_kind: CatalogProduct["garmentKind"];
    default_price_cents: number;
    currency: string;
    cost_tax_mode: string;
    cost_tax_rate_bps: number | null;
    automation_mode: CatalogProduct["supplier"]["automationMode"];
    print_areas: CatalogProduct["printAreas"];
    colors: CatalogProductColor[];
    sizes: string[];
    production_data: {
        method?: string;
        placements?: string[];
        notes?: string[];
        printify_blueprint_id?: number;
        printify_print_provider_id?: number | null;
        printify_variant_ids?: number[];
        provider_location?: {
            country?: string | null;
            region?: string | null;
            city?: string | null;
        };
    };
    pricing?: {
        artist_profit_cents: number;
        platform_profit_cents: number;
        included_print_sides: number;
        additional_print_side_cents: number;
        additional_print_side_retail_cents: number | null;
    };
    supplier_catalog_variants?: Array<{
        supplier_variant_id: string;
        size_label: string | null;
        color_label: string | null;
        cost_cents: number | null;
        is_enabled: boolean | null;
    }>;
};

type SupplierCatalogProductPricingRow = {
    supplier: string;
    supplier_product_id: string;
    default_price_cents: number;
    artist_profit_cents: number;
    platform_profit_cents: number;
    included_print_sides: number;
    additional_print_side_cents: number;
    additional_print_side_retail_cents: number | null;
};

function catalogRowToProviderOption(row: SupplierCatalogProductRow): CatalogProviderOption {
    const enabledVariants = row.supplier_catalog_variants?.filter((variant) => variant.is_enabled !== false) ?? [];
    const costs = enabledVariants
        .map((variant) => variant.cost_cents)
        .filter((cost): cost is number => Number.isFinite(cost));

    return {
        key: row.id,
        supplier: row.supplier,
        supplierProductId: row.supplier_product_id,
        supplierProviderId: row.supplier_provider_id,
        supplierProviderName: row.supplier_provider_name,
        location: row.production_data.provider_location,
        variantIds: enabledVariants
            .map((variant) => Number(variant.supplier_variant_id))
            .filter((variantId) => Number.isInteger(variantId) && variantId > 0),
        minCostCents: costs.length ? Math.min(...costs) : null,
        maxCostCents: costs.length ? Math.max(...costs) : null,
        colors: uniqueSorted(enabledVariants.map((variant) => variant.color_label)),
        sizes: uniqueSorted(enabledVariants.map((variant) => variant.size_label)),
    };
}

export function catalogRowToDesignerProduct(
    row: SupplierCatalogProductRow,
    providerOptions: CatalogProviderOption[] = [catalogRowToProviderOption(row)]
): CatalogProduct {
    const printifyBlueprintId =
        row.production_data.printify_blueprint_id ?? Number(row.supplier_product_id);
    const preferredProvider = providerOptions
        .filter((provider) => provider.minCostCents !== null)
        .sort((a, b) => (a.minCostCents ?? Number.MAX_SAFE_INTEGER) - (b.minCostCents ?? Number.MAX_SAFE_INTEGER))[0] ?? providerOptions[0];
    const allVariantIds = Array.from(new Set(providerOptions.flatMap((provider) => provider.variantIds)));
    const additionalPrintSideCents = row.pricing?.additional_print_side_cents ?? 0;
    const additionalPrintSideTaxCents =
        row.cost_tax_mode === "ex_gst"
            ? Math.round((additionalPrintSideCents * (row.cost_tax_rate_bps ?? 0)) / 10000)
            : 0;

    return {
        key: `${row.supplier}-${row.supplier_product_id}`,
        name: row.merch_tent_name,
        brand: row.supplier_brand ?? row.supplier,
        model: row.supplier_model ?? row.supplier_product_id,
        category: row.category,
        garmentKind: row.garment_kind,
        defaultPrice: (row.default_price_cents / 100).toFixed(2),
        supplier: {
            key: row.supplier,
            name: supplierLabel(row.supplier),
            externalProductId: row.supplier_product_id,
            productUrl: row.supplier_product_url ?? "",
            automationMode: row.automation_mode,
            printify:
                row.supplier === "printify"
                    ? {
                        blueprintId: Number.isFinite(printifyBlueprintId) ? printifyBlueprintId : 0,
                        printProviderId: preferredProvider?.supplierProviderId
                            ? Number(preferredProvider.supplierProviderId)
                            : null,
                        variantIds: allVariantIds,
                    }
                    : undefined,
        },
        providerOptions,
        sizes: uniqueSorted([...row.sizes, ...providerOptions.flatMap((provider) => provider.sizes)]),
        colors: mergeColors(row.colors, providerOptions.flatMap((provider) => provider.colors)),
        printAreas: row.print_areas,
        printAsset: {
            width: 2400,
            height: 3200,
            format: "image/png",
        },
        production: {
            method: row.production_data.method ?? "DTG",
            placements: row.production_data.placements ?? ["Front side", "Back side"],
            notes: row.production_data.notes ?? [],
            includedPrintSides: row.pricing?.included_print_sides ?? 1,
            additionalPrintSideCents,
            additionalPrintSideRetailCents:
                row.pricing?.additional_print_side_retail_cents ?? additionalPrintSideCents + additionalPrintSideTaxCents,
            artistProfitCents: row.pricing?.artist_profit_cents,
            platformProfitCents: row.pricing?.platform_profit_cents,
        },
    };
}

export async function listDesignerCatalogProducts() {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
        .from("supplier_catalog_products")
        .select("*, supplier_catalog_variants(supplier_variant_id, size_label, color_label, cost_cents, is_enabled)")
        .eq("status", "active")
        .order("created_at", { ascending: false });

    if (error) return [];

    const rows = (data ?? []) as SupplierCatalogProductRow[];
    const priceMap = await loadProductPriceMap(rows);
    return groupCatalogRows(rows, priceMap);
}

export async function getDesignerCatalogProduct(key: string) {
    const supabase = getServerSupabase();
    const [supplier, ...productIdParts] = key.split("-");
    const supplierProductId = productIdParts.join("-");

    if (!supplier || !supplierProductId) return null;

    const { data, error } = await supabase
        .from("supplier_catalog_products")
        .select("*, supplier_catalog_variants(supplier_variant_id, size_label, color_label, cost_cents, is_enabled)")
        .eq("supplier", supplier)
        .eq("supplier_product_id", supplierProductId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

    if (error || !data?.length) return null;

    const rows = data as SupplierCatalogProductRow[];
    const priceMap = await loadProductPriceMap(rows);

    return groupCatalogRows(rows, priceMap)[0] ?? null;
}

async function loadProductPriceMap(rows: SupplierCatalogProductRow[]) {
    const supabase = getServerSupabase();
    const suppliers = Array.from(new Set(rows.map((row) => row.supplier)));
    const supplierProductIds = Array.from(new Set(rows.map((row) => row.supplier_product_id)));

    if (!suppliers.length || !supplierProductIds.length) {
        return new Map<string, SupplierCatalogProductPricingRow>();
    }

    const { data, error } = await supabase
        .from("supplier_catalog_product_pricing")
        .select("supplier, supplier_product_id, default_price_cents, artist_profit_cents, platform_profit_cents, included_print_sides, additional_print_side_cents, additional_print_side_retail_cents")
        .in("supplier", suppliers)
        .in("supplier_product_id", supplierProductIds);

    if (error) {
        return new Map<string, SupplierCatalogProductPricingRow>();
    }

    return new Map(
        ((data ?? []) as SupplierCatalogProductPricingRow[]).map((row) => [
            `${row.supplier}-${row.supplier_product_id}`,
            row,
        ])
    );
}

function groupCatalogRows(rows: SupplierCatalogProductRow[], priceMap = new Map<string, SupplierCatalogProductPricingRow>()) {
    const groups = new Map<string, SupplierCatalogProductRow[]>();

    for (const row of rows) {
        const key = `${row.supplier}-${row.supplier_product_id}`;
        groups.set(key, [...(groups.get(key) ?? []), row]);
    }

    return Array.from(groups.values()).map((group) => {
        const seed = group[0];
        const providerOptions = group.map(catalogRowToProviderOption);
        const pricing = priceMap.get(`${seed.supplier}-${seed.supplier_product_id}`);
        return catalogRowToDesignerProduct(
            pricing === undefined
                ? seed
                : {
                    ...seed,
                    default_price_cents: pricing.default_price_cents,
                    pricing: {
                        artist_profit_cents: pricing.artist_profit_cents,
                        platform_profit_cents: pricing.platform_profit_cents,
                        included_print_sides: pricing.included_print_sides,
                        additional_print_side_cents: pricing.additional_print_side_cents,
                        additional_print_side_retail_cents: pricing.additional_print_side_retail_cents,
                    },
                },
            providerOptions
        );
    });
}

function uniqueSorted(values: Array<string | null | undefined>) {
    return Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));
}

function mergeColors(baseColors: CatalogProductColor[], providerColorLabels: string[]) {
    const byLabel = new Map(baseColors.map((color) => [color.label.toLowerCase(), color]));

    for (const label of providerColorLabels) {
        if (!byLabel.has(label.toLowerCase())) {
            byLabel.set(label.toLowerCase(), {
                label,
                value: fallbackColorHex(label),
                supplierColorName: label,
            });
        }
    }

    return Array.from(byLabel.values());
}

function fallbackColorHex(label: string) {
    const normalized = label.toLowerCase();
    if (normalized.includes("white")) return "#f7f7f2";
    if (normalized.includes("black")) return "#111111";
    if (normalized.includes("navy")) return "#111827";
    if (normalized.includes("red")) return "#b91c1c";
    if (normalized.includes("green") || normalized.includes("forest")) return "#14532d";
    if (normalized.includes("grey") || normalized.includes("gray")) return "#9ca3af";
    if (normalized.includes("blue")) return "#1d4ed8";
    return "#444444";
}

function supplierLabel(supplier: string) {
    if (supplier === "printify") return "Printify";
    if (supplier === "printful") return "Printful";
    return "Local supplier";
}
