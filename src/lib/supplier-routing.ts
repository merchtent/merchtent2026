import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service";

type SupplierCatalogProductRow = {
    id: string;
    supplier: "printify" | "printful" | "local";
    supplier_product_id: string;
    supplier_provider_id: string | null;
    supplier_provider_name: string | null;
    production_data: {
        printify_blueprint_id?: number;
        printify_print_provider_id?: number | null;
        printify_variant_ids?: number[];
        provider_location?: {
            country?: string | null;
            region?: string | null;
            city?: string | null;
        };
    };
};

type SupplierCatalogVariantRow = {
    catalog_product_id: string;
    supplier_variant_id: string;
    size_label: string | null;
    color_label: string | null;
    cost_cents: number | null;
    price_cents: number | null;
    is_enabled: boolean | null;
};

type SupplierProviderShippingRow = {
    catalog_product_id: string;
    first_item_cents: number | null;
    additional_item_cents: number | null;
    destination_country: string;
    shipping_method: string;
};

export type SupplierRouteChoice = {
    supplier: "printify" | "printful" | "local";
    supplierProductId: string;
    supplierProviderId: string;
    supplierProviderName: string | null;
    supplierVariantId: string;
    costCents: number | null;
    firstItemShippingCents: number | null;
    landedCostCents: number | null;
    priceCents: number | null;
    blueprintId: number | null;
    printProviderId: number | null;
    allProviderVariantIds: number[];
    providerLocation?: {
        country?: string | null;
        region?: string | null;
        city?: string | null;
    };
};

function normalise(value?: string | null) {
    return (value ?? "").trim().toLowerCase();
}

export async function resolveLeastCostSupplierRoute(input: {
    supplier: "printify" | "printful" | "local";
    supplierProductId: string;
    sizeLabel?: string | null;
    colorLabel?: string | null;
    destinationCountry?: string | null;
    shippingMethod?: string | null;
}) {
    const supabase = getServiceSupabase();
    const { data: products, error: productError } = await supabase
        .from("supplier_catalog_products")
        .select("id, supplier, supplier_product_id, supplier_provider_id, supplier_provider_name, production_data")
        .eq("status", "active")
        .eq("supplier", input.supplier)
        .eq("supplier_product_id", input.supplierProductId);

    if (productError) {
        throw new Error(`Supplier route lookup failed: ${productError.message}`);
    }

    const providerRows = (products ?? []) as SupplierCatalogProductRow[];
    if (!providerRows.length) return null;

    const { data: variants, error: variantError } = await supabase
        .from("supplier_catalog_variants")
        .select("catalog_product_id, supplier_variant_id, size_label, color_label, cost_cents, price_cents, is_enabled")
        .in("catalog_product_id", providerRows.map((row) => row.id));

    if (variantError) {
        throw new Error(`Supplier variant route lookup failed: ${variantError.message}`);
    }

    const destinationCountry = normalise(input.destinationCountry || "AU").toUpperCase();
    const shippingMethod = normalise(input.shippingMethod || "standard");
    const { data: shippingRows, error: shippingError } = await supabase
        .from("supplier_catalog_provider_shipping")
        .select("catalog_product_id, first_item_cents, additional_item_cents, destination_country, shipping_method")
        .in("catalog_product_id", providerRows.map((row) => row.id))
        .eq("destination_country", destinationCountry)
        .eq("shipping_method", shippingMethod);

    if (shippingError) {
        throw new Error(`Supplier shipping route lookup failed: ${shippingError.message}`);
    }

    const size = normalise(input.sizeLabel);
    const color = normalise(input.colorLabel);
    const providerById = new Map(providerRows.map((row) => [row.id, row]));
    const shippingByCatalogProductId = new Map(
        ((shippingRows ?? []) as SupplierProviderShippingRow[]).map((row) => [row.catalog_product_id, row])
    );
    const candidates = ((variants ?? []) as SupplierCatalogVariantRow[])
        .filter((variant) => variant.is_enabled !== false)
        .filter((variant) => !size || normalise(variant.size_label) === size)
        .filter((variant) => !color || normalise(variant.color_label) === color)
        .map((variant) => ({
            variant,
            provider: providerById.get(variant.catalog_product_id),
            shipping: shippingByCatalogProductId.get(variant.catalog_product_id),
        }))
        .filter((candidate): candidate is {
            variant: SupplierCatalogVariantRow;
            provider: SupplierCatalogProductRow;
            shipping: SupplierProviderShippingRow | undefined;
        } =>
            Boolean(candidate.provider?.supplier_provider_id)
        )
        .sort((a, b) => {
            const costA = landedCost(a.variant.cost_cents, a.shipping?.first_item_cents);
            const costB = landedCost(b.variant.cost_cents, b.shipping?.first_item_cents);
            if (costA !== costB) return costA - costB;
            return (a.provider.supplier_provider_name ?? "").localeCompare(b.provider.supplier_provider_name ?? "");
        });

    const selected = candidates[0];
    if (!selected || !selected.provider.supplier_provider_id) return null;

    const allProviderVariantIds = ((variants ?? []) as SupplierCatalogVariantRow[])
        .filter((variant) => variant.catalog_product_id === selected.provider.id)
        .filter((variant) => variant.is_enabled !== false)
        .map((variant) => Number(variant.supplier_variant_id))
        .filter((variantId) => Number.isInteger(variantId) && variantId > 0);

    return {
        supplier: selected.provider.supplier,
        supplierProductId: selected.provider.supplier_product_id,
        supplierProviderId: selected.provider.supplier_provider_id,
        supplierProviderName: selected.provider.supplier_provider_name,
        supplierVariantId: selected.variant.supplier_variant_id,
        costCents: selected.variant.cost_cents,
        firstItemShippingCents: selected.shipping?.first_item_cents ?? null,
        landedCostCents:
            selected.variant.cost_cents === null || selected.variant.cost_cents === undefined
                ? null
                : selected.variant.cost_cents + (selected.shipping?.first_item_cents ?? 0),
        priceCents: selected.variant.price_cents,
        blueprintId: selected.provider.production_data.printify_blueprint_id ?? null,
        printProviderId: selected.provider.production_data.printify_print_provider_id ?? null,
        allProviderVariantIds,
        providerLocation: selected.provider.production_data.provider_location,
    } satisfies SupplierRouteChoice;
}

function landedCost(costCents?: number | null, firstItemShippingCents?: number | null) {
    if (costCents === null || costCents === undefined) return Number.MAX_SAFE_INTEGER;
    return costCents + (firstItemShippingCents ?? 0);
}
