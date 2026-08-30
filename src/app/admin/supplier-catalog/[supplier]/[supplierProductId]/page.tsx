import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";

import { requireAdminPage } from "@/lib/auth/admin";
import { SHIPPING_METHOD_OPTIONS, normaliseShippingMethodId } from "@/lib/shipping-methods";
import PricingAnalysisClient from "./PricingAnalysisClient";
import SaveCatalogSettingsButton from "./SaveCatalogSettingsButton";
import {
    addSupplierCatalogProviderShippingAction,
    updateSupplierCatalogProductSettingsAction,
    updateSupplierCatalogProviderShippingAction,
    updateSupplierCatalogVariantsAction,
} from "../../actions";

type CatalogProductRow = {
    id: string;
    status: string;
    supplier: string;
    supplier_product_id: string;
    supplier_product_name: string;
    supplier_brand: string | null;
    supplier_model: string | null;
    supplier_provider_id: string | null;
    supplier_provider_name: string | null;
    merch_tent_name: string;
    category: string;
    garment_kind: string;
    default_price_cents: number | null;
    currency: string;
    cost_tax_mode: string;
    cost_tax_region: string | null;
    cost_tax_rate_bps: number | null;
    automation_mode: string;
    production_data: {
        provider_location?: {
            country?: string | null;
            region?: string | null;
            city?: string | null;
        };
    } | null;
    supplier_catalog_variants: CatalogVariantRow[];
};

type CatalogVariantRow = {
    id: string;
    supplier_variant_id: string;
    supplier_variant_title: string | null;
    size_label: string | null;
    color_label: string | null;
    cost_cents: number | null;
    price_cents: number | null;
    currency: string;
    is_enabled: boolean | null;
};

type ProviderShippingRow = {
    id: string;
    catalog_product_id: string;
    destination_country: string;
    shipping_method: string;
    delivery_time_label: string | null;
    delivery_min_days: number | null;
    delivery_max_days: number | null;
    size_type_label: string;
    first_item_cents: number | null;
    additional_item_cents: number | null;
    currency: string;
};

type PricingRow = {
    default_price_cents: number;
    artist_profit_cents: number;
    platform_profit_cents: number;
    included_print_sides: number;
    additional_print_side_cents: number;
    additional_print_side_retail_cents: number | null;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SupplierCatalogProductPage({
    params,
    searchParams,
}: {
    params: Promise<{ supplier: string; supplierProductId: string }>;
    searchParams: Promise<{ saved?: string }>;
}) {
    const { supabase } = await requireAdminPage();
    const { supplier, supplierProductId } = await params;
    const query = await searchParams;
    const decodedSupplierProductId = decodeURIComponent(supplierProductId);
    const settingsSaved = query.saved === "pricing";

    const [{ data: rows, error }, { data: pricing }] = await Promise.all([
        supabase
            .from("supplier_catalog_products")
            .select(`
                id,
                status,
                supplier,
                supplier_product_id,
                supplier_product_name,
                supplier_brand,
                supplier_model,
                supplier_provider_id,
                supplier_provider_name,
                merch_tent_name,
                category,
                garment_kind,
                default_price_cents,
                currency,
                cost_tax_mode,
                cost_tax_region,
                cost_tax_rate_bps,
                automation_mode,
                production_data,
                supplier_catalog_variants (
                    id,
                    supplier_variant_id,
                    supplier_variant_title,
                    size_label,
                    color_label,
                    cost_cents,
                    price_cents,
                    currency,
                    is_enabled
                )
            `)
            .eq("supplier", supplier)
            .eq("supplier_product_id", decodedSupplierProductId)
            .order("supplier_provider_name", { ascending: true }),
        supabase
            .from("supplier_catalog_product_pricing")
            .select("default_price_cents, artist_profit_cents, platform_profit_cents, included_print_sides, additional_print_side_cents, additional_print_side_retail_cents")
            .eq("supplier", supplier)
            .eq("supplier_product_id", decodedSupplierProductId)
            .maybeSingle(),
    ]);

    if (error || !rows?.length) {
        notFound();
    }

    const products = rows as CatalogProductRow[];
    const seed = products[0];
    const pricingRow = pricing as PricingRow | null;
    const defaultPriceCents = pricingRow?.default_price_cents ?? seed.default_price_cents ?? 3900;
    const artistProfitCents = pricingRow?.artist_profit_cents ?? 800;
    const platformProfitCents = pricingRow?.platform_profit_cents ?? 700;
    const includedPrintSides = pricingRow?.included_print_sides === 2 ? 2 : 1;
    const additionalPrintSideCents = pricingRow?.additional_print_side_cents ?? 0;
    const additionalPrintSideRetailCents = pricingRow?.additional_print_side_retail_cents ?? null;
    const definedBackPrintAddOnCents = includedPrintSides >= 2 ? 0 : additionalPrintSideRetailCents ?? 0;
    const definedDoubleSidePriceCents = defaultPriceCents + definedBackPrintAddOnCents;
    const providerCount = products.length;
    const catalogProductIds = products.map((product) => product.id);
    const { data: shippingRows } = await supabase
        .from("supplier_catalog_provider_shipping")
        .select("id, catalog_product_id, destination_country, shipping_method, delivery_time_label, delivery_min_days, delivery_max_days, size_type_label, first_item_cents, additional_item_cents, currency")
        .in("catalog_product_id", catalogProductIds)
        .order("destination_country", { ascending: true });
    const shippingByCatalogProductId = new Map<string, ProviderShippingRow[]>();
    for (const shippingRow of (shippingRows ?? []) as ProviderShippingRow[]) {
        shippingByCatalogProductId.set(shippingRow.catalog_product_id, [
            ...(shippingByCatalogProductId.get(shippingRow.catalog_product_id) ?? []),
            shippingRow,
        ]);
    }
    const variantCount = products.reduce((total, product) => total + product.supplier_catalog_variants.length, 0);
    const enabledVariantCount = products.reduce(
        (total, product) =>
            total + product.supplier_catalog_variants.filter((variant) => variant.is_enabled !== false).length,
        0
    );
    const pricingAnalysis = buildPricingAnalysis({
        products,
        shippingByCatalogProductId,
    });
    const currentRrpMetrics = pricingAnalysis
        ? buildCurrentRrpMetrics({
              singlePriceCents: defaultPriceCents,
              doublePriceCents: definedDoubleSidePriceCents,
              singleCostIncGstCents:
                  pricingAnalysis.averageBaseCostExGstCents + pricingAnalysis.averageBaseCostGstCents,
              doubleCostIncGstCents:
                  pricingAnalysis.averageBaseCostExGstCents +
                  pricingAnalysis.averageBaseCostGstCents +
                  (includedPrintSides >= 2
                      ? 0
                      : additionalPrintSideCents +
                        Math.round(
                            additionalPrintSideCents *
                                (pricingAnalysis.averageBaseCostExGstCents > 0
                                    ? pricingAnalysis.averageBaseCostGstCents / pricingAnalysis.averageBaseCostExGstCents
                                    : 0)
                        )),
              artistProfitCents,
          })
        : null;

    return (
        <main className="min-h-screen bg-black p-5 text-white md:p-8">
            {settingsSaved ? (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4">
                    <div className="w-full max-w-md border border-red-600 bg-black shadow-[12px_12px_0_rgba(220,38,38,0.35)]">
                        <div className="border-b border-neutral-800 p-5">
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-500">
                                Catalogue saved
                            </p>
                            <h2 className="mt-2 text-2xl font-black uppercase">
                                Pricing rules updated.
                            </h2>
                            <p className="mt-3 text-sm leading-6 text-neutral-300">
                                New designer products will use the saved one-side RRP, and back-side artwork will add
                                the configured second-side print charge.
                            </p>
                        </div>
                        <div className="flex justify-end p-4">
                            <Link
                                href={`/admin/supplier-catalog/${seed.supplier}/${encodeURIComponent(seed.supplier_product_id)}`}
                                className="inline-flex h-10 items-center bg-red-600 px-5 text-sm font-black uppercase hover:bg-red-500"
                            >
                                Done
                            </Link>
                        </div>
                    </div>
                </div>
            ) : null}
            <section className="border border-neutral-800 bg-neutral-950">
                <div className="grid border-b border-neutral-800 lg:grid-cols-[1fr_420px]">
                    <div className="p-6">
                        <Link
                            href="/admin/supplier-catalog"
                            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-neutral-400 hover:text-white"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to supplier catalogue
                        </Link>
                        <p className="mt-6 text-[11px] font-black uppercase tracking-[0.3em] text-red-500">
                            Catalogue product
                        </p>
                        <h1 className="mt-3 max-w-5xl text-4xl font-black uppercase leading-none md:text-6xl">
                            {seed.merch_tent_name}
                        </h1>
                        <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-400">
                            Edit the Merch Tent blank once, then tune each supplier/provider variant underneath it.
                            These settings drive the artist designer, pricing guidance, and fulfilment routing.
                        </p>
                    </div>
                    <div className="grid border-t border-neutral-800 lg:border-l lg:border-t-0">
                        <Metric label="Supplier product" value={`${seed.supplier} #${seed.supplier_product_id}`} />
                        <Metric label="Providers" value={String(providerCount)} />
                        <Metric label="Variants enabled" value={`${enabledVariantCount}/${variantCount}`} />
                    </div>
                </div>

                <form
                    action={updateSupplierCatalogProductSettingsAction}
                    className="grid gap-5 border-b border-neutral-800 p-6 xl:grid-cols-[1.1fr_0.7fr_0.7fr_0.7fr_0.7fr_auto]"
                >
                    <input type="hidden" name="supplier" value={seed.supplier} />
                    <input type="hidden" name="supplier_product_id" value={seed.supplier_product_id} />
                    <Field label="Merch Tent name">
                        <input
                            name="merch_tent_name"
                            defaultValue={seed.merch_tent_name}
                            className="h-11 w-full border border-neutral-800 bg-black px-3 text-sm outline-none"
                        />
                    </Field>
                    <Field label="Global retail price">
                        <input
                            name="default_price"
                            defaultValue={(defaultPriceCents / 100).toFixed(2)}
                            className="h-11 w-full border border-neutral-800 bg-black px-3 text-sm outline-none"
                        />
                    </Field>
                    <Field label="Category">
                        <select
                            name="category"
                            defaultValue={seed.category}
                            className="h-11 w-full border border-neutral-800 bg-black px-3 text-sm outline-none"
                        >
                            <option value="tees">Tees</option>
                            <option value="hoodies">Hoodies</option>
                            <option value="hats">Hats</option>
                            <option value="tanks">Tanks</option>
                            <option value="posters">Posters</option>
                            <option value="vinyl">Vinyl</option>
                            <option value="accessories">Accessories</option>
                            <option value="other">Other</option>
                        </select>
                    </Field>
                    <Field label="Garment kind/Designer template">
                        <select
                            name="garment_kind"
                            defaultValue={seed.garment_kind}
                            className="h-11 w-full border border-neutral-800 bg-black px-3 text-sm outline-none"
                        >
                            <option value="tee">Tee</option>
                            <option value="hoodie">Hoodie</option>
                        </select>
                    </Field>
                    <Field label="Status">
                        <select
                            name="status"
                            defaultValue={seed.status}
                            className="h-11 w-full border border-neutral-800 bg-black px-3 text-sm outline-none"
                        >
                            <option value="active">Active</option>
                            <option value="draft">Draft</option>
                            <option value="archived">Archived</option>
                        </select>
                    </Field>
                    <SaveCatalogSettingsButton />

                    <section className="grid border border-neutral-800 bg-black md:grid-cols-3 xl:col-span-6">
                        <div className="p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-500">
                                Current defined RRP
                            </p>
                            <p className="mt-2 text-sm leading-6 text-neutral-400">
                                These are the prices the designer/shop will use from the saved Global Retail Price.
                            </p>
                        </div>
                        <div className="border-t border-neutral-800 p-4 md:border-l md:border-t-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                                Single-sided product
                            </p>
                            <p className="mt-2 text-2xl font-black text-white">{formatMoney(defaultPriceCents)}</p>
                            {currentRrpMetrics ? (
                                <RrpMarginStats
                                    bandShare={currentRrpMetrics.single.bandShare}
                                    productMargin={currentRrpMetrics.single.productMargin}
                                    ourShare={currentRrpMetrics.single.ourShare}
                                />
                            ) : null}
                        </div>
                        <div className="border-t border-neutral-800 p-4 md:border-l md:border-t-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                                Double-sided product
                            </p>
                            <p className="mt-2 text-2xl font-black text-red-500">
                                {formatMoney(definedDoubleSidePriceCents)}
                            </p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                                {includedPrintSides >= 2
                                    ? "Back print already included"
                                    : `Includes ${formatMoney(definedBackPrintAddOnCents)} back print`}
                            </p>
                            {currentRrpMetrics ? (
                                <RrpMarginStats
                                    bandShare={currentRrpMetrics.double.bandShare}
                                    productMargin={currentRrpMetrics.double.productMargin}
                                    ourShare={currentRrpMetrics.double.ourShare}
                                />
                            ) : null}
                        </div>
                    </section>

                    {pricingAnalysis ? (
                        <PricingAnalysisClient
                            initialArtistProfitCents={artistProfitCents}
                            initialPlatformProfitCents={platformProfitCents}
                            averageBaseCostExGstCents={pricingAnalysis.averageBaseCostExGstCents}
                            averageBaseCostGstCents={pricingAnalysis.averageBaseCostGstCents}
                            averageShippingExGstCents={pricingAnalysis.averageShippingExGstCents}
                            averageShippingGstCents={pricingAnalysis.averageShippingGstCents}
                            initialIncludedPrintSides={includedPrintSides}
                            initialAdditionalPrintSideCents={additionalPrintSideCents}
                            initialAdditionalPrintSideRetailCents={additionalPrintSideRetailCents}
                            cheapestProductCostIncGstCents={pricingAnalysis.cheapestProductCostIncGstCents}
                            cheapestProviderName={pricingAnalysis.cheapestProviderName}
                            cheapestVariantLabel={pricingAnalysis.cheapestVariantLabel}
                            taxLabel={pricingAnalysis.taxLabel}
                        />
                    ) : (
                        <section className="border border-neutral-800 bg-black xl:col-span-6">
                            <div className="border-b border-neutral-800 p-5 text-sm text-neutral-400">
                                Add base costs and standard AU shipping rates to see the fulfilment charge flow.
                            </div>
                        </section>
                    )}
                </form>

                <div className="grid gap-6 p-6">
                    {products.map((product) => (
                        <section key={product.id} className="border border-neutral-800 bg-black">
                            <div className="grid gap-4 border-b border-neutral-800 p-5 lg:grid-cols-[1fr_auto]">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-500">
                                        Provider #{product.supplier_provider_id}
                                    </p>
                                    <h2 className="mt-2 text-2xl font-black uppercase">
                                        {product.supplier_provider_name ?? "Unknown provider"}
                                    </h2>
                                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-neutral-500">
                                        {providerLocation(product) || "Production location not supplied"}
                                    </p>
                                </div>
                                <div className="inline-flex items-center gap-2 self-start border border-neutral-800 px-4 py-3 text-xs font-black uppercase">
                                    <SlidersHorizontal className="h-4 w-4 text-red-500" />
                                    {product.supplier_catalog_variants.length} variants
                                </div>
                            </div>

                            <div className="border-b border-neutral-800 p-5">
                                <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-500">
                                            Shipping
                                        </p>
                                        <h3 className="mt-2 text-xl font-black uppercase">
                                            Provider-level cost
                                        </h3>
                                        <p className="mt-2 text-xs leading-5 text-neutral-500">
                                            Stored separately from product cost so checkout can later compare landed
                                            cost by destination and supplier.
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <form action={updateSupplierCatalogProviderShippingAction}>
                                            <input type="hidden" name="supplier" value={seed.supplier} />
                                            <input type="hidden" name="supplier_product_id" value={seed.supplier_product_id} />
                                            <input type="hidden" name="catalog_product_id" value={product.id} />
                                            <div className="overflow-x-auto">
                                                <table className="min-w-[980px] table-fixed border-collapse text-left text-sm">
                                                    <colgroup>
                                                        <col className="w-[95px]" />
                                                        <col className="w-[150px]" />
                                                        <col className="w-[110px]" />
                                                        <col className="w-[110px]" />
                                                        <col className="w-[120px]" />
                                                        <col className="w-[130px]" />
                                                        <col className="w-[130px]" />
                                                    </colgroup>
                                                    <thead className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                                                        <tr>
                                                            <th className="px-3 py-2">Country</th>
                                                            <th className="px-3 py-2">Method</th>
                                                            <th className="px-3 py-2">Min days</th>
                                                            <th className="px-3 py-2">Max days</th>
                                                            <th className="px-3 py-2">Sizes/type</th>
                                                            <th className="px-3 py-2">First item</th>
                                                            <th className="px-3 py-2">Additional</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(shippingByCatalogProductId.get(product.id) ?? []).map((shipping) => (
                                                            <tr key={shipping.id}>
                                                                <td className="px-3 py-2">
                                                                    <input type="hidden" name="shipping_id" value={shipping.id} />
                                                                    <select
                                                                        name={`shipping_country_${shipping.id}`}
                                                                        defaultValue={shipping.destination_country}
                                                                        className="h-10 w-full border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none"
                                                                    >
                                                                        <option value="AU">AU</option>
                                                                    </select>
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <select
                                                                        name={`shipping_method_${shipping.id}`}
                                                                        defaultValue={shippingMethodValue(shipping.shipping_method)}
                                                                        className="h-10 w-full border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none"
                                                                    >
                                                                        {SHIPPING_METHOD_OPTIONS.map((option) => (
                                                                            <option key={option.id} value={option.id}>
                                                                                {option.label}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        max={20}
                                                                        name={`shipping_delivery_min_${shipping.id}`}
                                                                        defaultValue={shipping.delivery_min_days ?? ""}
                                                                        placeholder="3"
                                                                        className="h-10 w-full border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none"
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        max={20}
                                                                        name={`shipping_delivery_max_${shipping.id}`}
                                                                        defaultValue={shipping.delivery_max_days ?? ""}
                                                                        placeholder="6"
                                                                        className="h-10 w-full border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none"
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <select
                                                                        name={`shipping_size_type_${shipping.id}`}
                                                                        defaultValue={shipping.size_type_label}
                                                                        className="h-10 w-full border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none"
                                                                    >
                                                                        <option value="All">All</option>
                                                                    </select>
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <input
                                                                        name={`shipping_first_${shipping.id}`}
                                                                        defaultValue={formatCentsInput(shipping.first_item_cents)}
                                                                        placeholder="0.00"
                                                                        className="h-10 w-full border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none"
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <input
                                                                        name={`shipping_additional_${shipping.id}`}
                                                                        defaultValue={formatCentsInput(shipping.additional_item_cents)}
                                                                        placeholder="0.00"
                                                                        className="h-10 w-full border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none"
                                                                    />
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {(shippingByCatalogProductId.get(product.id) ?? []).length ? (
                                                <button className="mt-3 inline-flex h-10 items-center justify-center bg-red-600 px-4 text-xs font-black uppercase hover:bg-red-500">
                                                    Save shipping
                                                </button>
                                            ) : (
                                                <p className="text-sm text-neutral-500">
                                                    No shipping row yet. Add the Australian standard rate below.
                                                </p>
                                            )}
                                        </form>

                                        <form
                                            action={addSupplierCatalogProviderShippingAction}
                                            className="grid gap-3 border border-neutral-800 bg-neutral-950 p-3 md:grid-cols-[95px_150px_110px_110px_120px_130px_130px_auto]"
                                        >
                                            <input type="hidden" name="supplier" value={seed.supplier} />
                                            <input type="hidden" name="supplier_product_id" value={seed.supplier_product_id} />
                                            <input type="hidden" name="supplier_provider_id" value={product.supplier_provider_id ?? ""} />
                                            <input type="hidden" name="catalog_product_id" value={product.id} />
                                            <select
                                                name="shipping_country"
                                                defaultValue="AU"
                                                className="h-10 border border-neutral-800 bg-black px-3 text-sm outline-none"
                                            >
                                                <option value="AU">AU</option>
                                            </select>
                                            <select
                                                name="shipping_method"
                                                defaultValue="standard"
                                                className="h-10 border border-neutral-800 bg-black px-3 text-sm outline-none"
                                            >
                                                {SHIPPING_METHOD_OPTIONS.map((option) => (
                                                    <option key={option.id} value={option.id}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                min={1}
                                                max={20}
                                                name="shipping_delivery_min"
                                                placeholder="3"
                                                aria-label="Minimum delivery days"
                                                className="h-10 border border-neutral-800 bg-black px-3 text-sm outline-none"
                                            />
                                            <input
                                                type="number"
                                                min={1}
                                                max={20}
                                                name="shipping_delivery_max"
                                                placeholder="6"
                                                aria-label="Maximum delivery days"
                                                className="h-10 border border-neutral-800 bg-black px-3 text-sm outline-none"
                                            />
                                            <select
                                                name="shipping_size_type"
                                                defaultValue="All"
                                                className="h-10 border border-neutral-800 bg-black px-3 text-sm outline-none"
                                            >
                                                <option value="All">All</option>
                                            </select>
                                            <input
                                                name="shipping_first"
                                                placeholder="9.66"
                                                className="h-10 border border-neutral-800 bg-black px-3 text-sm outline-none"
                                            />
                                            <input
                                                name="shipping_additional"
                                                placeholder="2.01"
                                                className="h-10 border border-neutral-800 bg-black px-3 text-sm outline-none"
                                            />
                                            <button className="h-10 bg-neutral-100 px-4 text-xs font-black uppercase text-black hover:bg-white">
                                                Add
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>

                            <form action={updateSupplierCatalogVariantsAction}>
                                <input type="hidden" name="supplier" value={seed.supplier} />
                                <input type="hidden" name="supplier_product_id" value={seed.supplier_product_id} />
                                <div className="overflow-x-auto">
                                    <table className="min-w-full border-collapse text-left text-sm">
                                        <thead className="bg-neutral-950 text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                                            <tr>
                                                <th className="border-b border-neutral-800 px-4 py-3">Enabled</th>
                                                <th className="border-b border-neutral-800 px-4 py-3">Supplier variant</th>
                                                <th className="border-b border-neutral-800 px-4 py-3">Size</th>
                                                <th className="border-b border-neutral-800 px-4 py-3">Colour</th>
                                                <th className="border-b border-neutral-800 px-4 py-3">Base cost</th>
                                                <th className="border-b border-neutral-800 px-4 py-3">Supplier price</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {product.supplier_catalog_variants
                                                .slice()
                                                .sort(compareVariants)
                                                .map((variant) => (
                                                    <tr key={variant.id} className="align-top">
                                                        <td className="border-b border-neutral-800 px-4 py-3">
                                                            <input type="hidden" name="variant_id" value={variant.id} />
                                                            <input
                                                                type="checkbox"
                                                                name={`enabled_${variant.id}`}
                                                                defaultChecked={variant.is_enabled !== false}
                                                                className="h-4 w-4 accent-red-600"
                                                            />
                                                        </td>
                                                        <td className="border-b border-neutral-800 px-4 py-3">
                                                            <p className="font-black uppercase">
                                                                {variant.supplier_variant_title ?? variant.supplier_variant_id}
                                                            </p>
                                                            <p className="mt-1 text-xs text-neutral-500">
                                                                Variant #{variant.supplier_variant_id}
                                                            </p>
                                                        </td>
                                                        <td className="border-b border-neutral-800 px-4 py-3">
                                                            <input
                                                                name={`size_${variant.id}`}
                                                                defaultValue={variant.size_label ?? ""}
                                                                className="h-10 w-28 border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none"
                                                            />
                                                        </td>
                                                        <td className="border-b border-neutral-800 px-4 py-3">
                                                            <input
                                                                name={`color_${variant.id}`}
                                                                defaultValue={variant.color_label ?? ""}
                                                                className="h-10 w-44 border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none"
                                                            />
                                                        </td>
                                                        <td className="border-b border-neutral-800 px-4 py-3">
                                                            <input
                                                                name={`cost_${variant.id}`}
                                                                defaultValue={formatCentsInput(variant.cost_cents)}
                                                                placeholder="0.00"
                                                                className="h-10 w-28 border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none"
                                                            />
                                                        </td>
                                                        <td className="border-b border-neutral-800 px-4 py-3">
                                                            <input
                                                                name={`price_${variant.id}`}
                                                                defaultValue={formatCentsInput(variant.price_cents)}
                                                                placeholder="Optional"
                                                                className="h-10 w-28 border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex items-center justify-between gap-4 p-5">
                                    <p className="text-xs leading-5 text-neutral-500">
                                        Base cost is your internal fulfilment cost. Supplier price is optional and can be
                                        used later if a supplier exposes recommended retail pricing.
                                    </p>
                                    <button className="inline-flex h-11 shrink-0 items-center justify-center bg-red-600 px-5 text-sm font-black uppercase hover:bg-red-500">
                                        Save variants
                                    </button>
                                </div>
                            </form>
                        </section>
                    ))}
                </div>
            </section>
        </main>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                {label}
            </span>
            <span className="mt-2 block">{children}</span>
        </label>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="border-b border-neutral-800 p-5 last:border-b-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">{label}</p>
            <p className="mt-2 text-xl font-black uppercase">{value}</p>
        </div>
    );
}

function RrpMarginStats({
    productMargin,
    bandShare,
    ourShare,
}: {
    productMargin: number;
    bandShare: number;
    ourShare: number;
}) {
    return (
        <div className="mt-4 grid gap-2 text-[11px] uppercase tracking-[0.12em] text-neutral-500 sm:grid-cols-3">
            <p>
                <span className="block font-black text-neutral-300">{formatPercent(productMargin)}</span>
                Margin
            </p>
            <p>
                <span className="block font-black text-neutral-300">{formatPercent(bandShare)}</span>
                Band gets
            </p>
            <p>
                <span className="block font-black text-neutral-300">{formatPercent(ourShare)}</span>
                We get
            </p>
        </div>
    );
}

function providerLocation(product: CatalogProductRow) {
    const location = product.production_data?.provider_location;
    return [location?.city, location?.region, location?.country].filter(Boolean).join(", ");
}

function formatCentsInput(cents?: number | null) {
    return typeof cents === "number" ? (cents / 100).toFixed(2) : "";
}

function formatMoney(cents: number) {
    return (cents / 100).toLocaleString("en-AU", {
        style: "currency",
        currency: "AUD",
    });
}

function formatPercent(value: number) {
    return `${value.toFixed(1)}%`;
}

function percentage(partCents: number, totalCents: number) {
    return totalCents > 0 ? (partCents / totalCents) * 100 : 0;
}

function buildCurrentRrpMetrics({
    singlePriceCents,
    doublePriceCents,
    singleCostIncGstCents,
    doubleCostIncGstCents,
    artistProfitCents,
}: {
    singlePriceCents: number;
    doublePriceCents: number;
    singleCostIncGstCents: number;
    doubleCostIncGstCents: number;
    artistProfitCents: number;
}) {
    const singleProductMarginCents = Math.max(singlePriceCents - singleCostIncGstCents, 0);
    const doubleProductMarginCents = Math.max(doublePriceCents - doubleCostIncGstCents, 0);
    const singleOurProfitCents = Math.max(singleProductMarginCents - artistProfitCents, 0);
    const doubleOurProfitCents = Math.max(doubleProductMarginCents - artistProfitCents, 0);

    return {
        single: {
            productMargin: percentage(singleProductMarginCents, singlePriceCents),
            bandShare: percentage(artistProfitCents, singlePriceCents),
            ourShare: percentage(singleOurProfitCents, singlePriceCents),
        },
        double: {
            productMargin: percentage(doubleProductMarginCents, doublePriceCents),
            bandShare: percentage(artistProfitCents, doublePriceCents),
            ourShare: percentage(doubleOurProfitCents, doublePriceCents),
        },
    };
}

function shippingMethodValue(value: string) {
    return normaliseShippingMethodId(value);
}

function compareVariants(a: CatalogVariantRow, b: CatalogVariantRow) {
    const colourCompare = (a.color_label ?? "").localeCompare(b.color_label ?? "");
    if (colourCompare !== 0) return colourCompare;

    return sizeRank(a.size_label) - sizeRank(b.size_label);
}

function sizeRank(size?: string | null) {
    const order = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
    const index = order.indexOf(String(size ?? "").toUpperCase());
    return index === -1 ? 999 : index;
}

function buildPricingAnalysis({
    products,
    shippingByCatalogProductId,
}: {
    products: CatalogProductRow[];
    shippingByCatalogProductId: Map<string, ProviderShippingRow[]>;
}) {
    const candidates = products.flatMap((product) => {
        const standardShipping = (shippingByCatalogProductId.get(product.id) ?? []).find(
            (shipping) =>
                shipping.destination_country === "AU" &&
                shippingMethodValue(shipping.shipping_method) === "standard"
        );

        return product.supplier_catalog_variants
            .filter((variant) => variant.is_enabled !== false)
            .filter((variant) => typeof variant.cost_cents === "number")
            .map((variant) => {
                const shippingExGstCents = standardShipping?.first_item_cents ?? 0;
                const taxRateBps = product.cost_tax_mode === "ex_gst" ? product.cost_tax_rate_bps ?? 0 : 0;
                const baseCostExGstCents = variant.cost_cents ?? 0;
                const baseCostGstCents = Math.round((baseCostExGstCents * taxRateBps) / 10000);
                const shippingGstCents = Math.round((shippingExGstCents * taxRateBps) / 10000);
                const productCostIncGstCents = baseCostExGstCents + baseCostGstCents;
                const totalCostIncGstCents =
                    productCostIncGstCents + shippingExGstCents + shippingGstCents;

                return {
                    providerName: product.supplier_provider_name ?? "Unknown provider",
                    variantLabel: [variant.color_label, variant.size_label].filter(Boolean).join(" / "),
                    taxLabel:
                        product.cost_tax_mode === "ex_gst"
                            ? `ex GST ${product.cost_tax_region ?? "AU"} @ ${((product.cost_tax_rate_bps ?? 0) / 100).toFixed(2)}%`
                            : product.cost_tax_mode,
                    baseCostExGstCents,
                    baseCostGstCents,
                    productCostIncGstCents,
                    shippingExGstCents,
                    shippingGstCents,
                    totalCostIncGstCents,
                };
            });
    });

    const pricedCandidates = candidates.filter((candidate) => candidate.baseCostExGstCents > 0);
    if (!pricedCandidates.length) return null;

    const cheapest = pricedCandidates.sort((a, b) => a.totalCostIncGstCents - b.totalCostIncGstCents)[0];
    const average = averagePricing(pricedCandidates);

    return {
        averageBaseCostExGstCents: average.baseCostExGstCents,
        averageBaseCostGstCents: average.baseCostGstCents,
        averageShippingExGstCents: average.shippingExGstCents,
        averageShippingGstCents: average.shippingGstCents,
        cheapestProductCostIncGstCents: cheapest.productCostIncGstCents,
        cheapestProviderName: cheapest.providerName,
        cheapestVariantLabel: cheapest.variantLabel,
        taxLabel: cheapest.taxLabel,
    };
}

function averagePricing(
    candidates: Array<{
        baseCostExGstCents: number;
        baseCostGstCents: number;
        shippingExGstCents: number;
        shippingGstCents: number;
    }>
) {
    const total = candidates.reduce(
        (sum, candidate) => ({
            baseCostExGstCents: sum.baseCostExGstCents + candidate.baseCostExGstCents,
            baseCostGstCents: sum.baseCostGstCents + candidate.baseCostGstCents,
            shippingExGstCents: sum.shippingExGstCents + candidate.shippingExGstCents,
            shippingGstCents: sum.shippingGstCents + candidate.shippingGstCents,
        }),
        {
            baseCostExGstCents: 0,
            baseCostGstCents: 0,
            shippingExGstCents: 0,
            shippingGstCents: 0,
        }
    );

    return {
        baseCostExGstCents: Math.round(total.baseCostExGstCents / candidates.length),
        baseCostGstCents: Math.round(total.baseCostGstCents / candidates.length),
        shippingExGstCents: Math.round(total.shippingExGstCents / candidates.length),
        shippingGstCents: Math.round(total.shippingGstCents / candidates.length),
    };
}
