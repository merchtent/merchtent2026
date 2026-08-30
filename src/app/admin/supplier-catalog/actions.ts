"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/auth/admin";
import {
    getPrintifyBlueprint,
    getPrintifyShipping,
    listPrintifyVariants,
} from "@/lib/printify/catalog";
import { requireShippingMethodId } from "@/lib/shipping-methods";

const SIZE_LABELS = new Set(["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"]);
const ALLOWED_SUPPLIERS = new Set(["printify", "printful", "local"]);
const ALLOWED_CATEGORIES = new Set(["tees", "hoodies", "hats", "tanks", "posters", "vinyl", "accessories", "other"]);
const ALLOWED_GARMENT_KINDS = new Set(["tee", "hoodie"]);
const ALLOWED_DESTINATION_COUNTRIES = new Set(["AU"]);
const ALLOWED_SHIPPING_SIZE_TYPES = new Set(["All"]);

function moneyToCents(value: FormDataEntryValue | null, fallback: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.round(parsed * 100);
}

function parseVariantTitle(title: string) {
    const parts = title
        .split("/")
        .map((part) => part.trim())
        .filter(Boolean);
    const size = parts.find((part) => SIZE_LABELS.has(part.toUpperCase())) ?? null;
    const color = parts.find((part) => part !== size) ?? null;

    return {
        sizeLabel: size,
        colorLabel: color,
    };
}

function uniqueSorted(values: Array<string | null>) {
    return Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) => {
        const sizeA = Array.from(SIZE_LABELS).indexOf(a.toUpperCase());
        const sizeB = Array.from(SIZE_LABELS).indexOf(b.toUpperCase());
        if (sizeA >= 0 || sizeB >= 0) return (sizeA === -1 ? 999 : sizeA) - (sizeB === -1 ? 999 : sizeB);
        return a.localeCompare(b);
    });
}

function colorHex(label: string) {
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

function isAustralia(value?: string | null) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return ["au", "aus", "australia"].includes(normalized);
}

function requireDestinationCountry(value: unknown) {
    const country = String(value ?? "AU").trim().toUpperCase();
    if (!ALLOWED_DESTINATION_COUNTRIES.has(country)) {
        throw new Error("Shipping country is invalid.");
    }
    return country;
}

function requireShippingSizeType(value: unknown) {
    const sizeType = String(value ?? "All").trim() || "All";
    if (!ALLOWED_SHIPPING_SIZE_TYPES.has(sizeType)) {
        throw new Error("Shipping size/type is invalid.");
    }
    return sizeType;
}

function optionalTransitDay(value: FormDataEntryValue | null) {
    const text = String(value ?? "").trim();
    if (!text) return null;

    const parsed = Number(text);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
        throw new Error("Delivery days must be between 1 and 20.");
    }
    return parsed;
}

function includedPrintSides(value: FormDataEntryValue | null) {
    const parsed = Number(value);
    return parsed === 2 ? 2 : 1;
}

function deliveryTimeLabel(minDays: number | null, maxDays: number | null) {
    if (minDays && maxDays) return `${minDays} - ${maxDays} business days`;
    if (minDays) return `${minDays} business day${minDays === 1 ? "" : "s"}`;
    if (maxDays) return `${maxDays} business day${maxDays === 1 ? "" : "s"}`;
    return null;
}

function findAustraliaShippingProfile(shipping: Awaited<ReturnType<typeof getPrintifyShipping>>) {
    return shipping.profiles?.find((profile) =>
        profile.countries.some((country) => isAustralia(country))
    ) ?? null;
}

export async function importPrintifyCatalogueProductAction(formData: FormData) {
    const { supabase, user } = await requireAdminAction();
    const blueprintId = Number(formData.get("blueprint_id"));
    const printProviderId = Number(formData.get("print_provider_id"));
    const printProviderName = String(formData.get("print_provider_name") ?? "").trim();
    const printProviderCountry = String(formData.get("print_provider_country") ?? "").trim();
    const printProviderRegion = String(formData.get("print_provider_region") ?? "").trim();
    const printProviderCity = String(formData.get("print_provider_city") ?? "").trim();
    const merchTentName = String(formData.get("merch_tent_name") ?? "").trim();
    const category = String(formData.get("category") ?? "tees");

    if (!Number.isInteger(blueprintId) || blueprintId <= 0) {
        throw new Error("Blueprint id is required.");
    }
    if (!Number.isInteger(printProviderId) || printProviderId <= 0) {
        throw new Error("Print provider id is required.");
    }

    const [blueprint, variants, shipping] = await Promise.all([
        getPrintifyBlueprint(blueprintId),
        listPrintifyVariants(blueprintId, printProviderId),
        getPrintifyShipping(blueprintId, printProviderId),
    ]);
    const { data: existingGlobalPricing, error: existingGlobalPricingError } = await supabase
        .from("supplier_catalog_product_pricing")
        .select("default_price_cents")
        .eq("supplier", "printify")
        .eq("supplier_product_id", String(blueprintId))
        .maybeSingle();

    if (existingGlobalPricingError) {
        throw new Error(existingGlobalPricingError.message);
    }

    let defaultPriceCents = Number(existingGlobalPricing?.default_price_cents ?? 3900);

    if (!existingGlobalPricing) {
        const { data: createdGlobalPricing, error: globalPricingError } = await supabase
            .from("supplier_catalog_product_pricing")
            .insert({
                supplier: "printify",
                supplier_product_id: String(blueprintId),
                default_price_cents: defaultPriceCents,
                currency: "AUD",
                updated_by: user.id,
            })
            .select("default_price_cents")
            .single();

        if (globalPricingError) {
            throw new Error(globalPricingError.message);
        }
        defaultPriceCents = Number(createdGlobalPricing?.default_price_cents ?? defaultPriceCents);
    }

    const parsedVariants = variants.map((variant) => ({
        variant,
        ...parseVariantTitle(variant.title),
    }));
    const sizes = uniqueSorted(parsedVariants.map((item) => item.sizeLabel));
    const colorLabels = uniqueSorted(parsedVariants.map((item) => item.colorLabel));
    const colors = colorLabels.map((label) => ({
        label,
        value: colorHex(label),
        supplierColorName: label,
    }));
    const firstVariantWithPlaceholders = variants.find((variant) => variant.placeholders?.length);
    const supplierPrintAreas = firstVariantWithPlaceholders?.placeholders ?? [];
    const enabledVariantIds = variants
        .filter((variant) => variant.is_enabled !== false)
        .map((variant) => variant.id);

    const { data: catalogProduct, error: productError } = await supabase
        .from("supplier_catalog_products")
        .upsert(
            {
                status: "active",
                supplier: "printify",
                supplier_product_id: String(blueprintId),
                supplier_product_name: blueprint.title,
                supplier_brand: blueprint.brand ?? "Printify",
                supplier_model: blueprint.model ?? String(blueprintId),
                supplier_provider_id: String(printProviderId),
                supplier_provider_name: printProviderName || `Provider ${printProviderId}`,
                supplier_product_url: `https://printify.com/app/products/${blueprintId}`,
                merch_tent_name: merchTentName || blueprint.title,
                category,
                garment_kind: category === "hoodies" ? "hoodie" : "tee",
                default_price_cents: defaultPriceCents,
                currency: "AUD",
                cost_tax_mode: "ex_gst",
                cost_tax_region: "AU",
                cost_tax_rate_bps: 1000,
                automation_mode: "create_on_sale",
                print_areas: {
                    front: { x: 280, y: 315, width: 340, height: 430, supplierPlacement: "front" },
                    back: { x: 280, y: 300, width: 340, height: 460, supplierPlacement: "back" },
                },
                colors,
                sizes,
                production_data: {
                    method: "DTG",
                    placements: supplierPrintAreas.map((area) => area.position),
                    notes: ["Imported from Printify for curated Merch Tent designer use."],
                    printify_blueprint_id: blueprintId,
                    printify_print_provider_id: printProviderId,
                    printify_variant_ids: enabledVariantIds,
                    supplier_print_areas: supplierPrintAreas,
                    shipping,
                    provider_location: {
                        country: printProviderCountry || null,
                        region: printProviderRegion || null,
                        city: printProviderCity || null,
                    },
                },
                raw_supplier_data: {
                    blueprint,
                    provider: {
                        id: printProviderId,
                        title: printProviderName,
                        location: {
                            country: printProviderCountry || null,
                            region: printProviderRegion || null,
                            city: printProviderCity || null,
                        },
                    },
                },
                imported_by: user.id,
            },
            { onConflict: "supplier,supplier_product_id,supplier_provider_id" }
        )
        .select("id")
        .single();

    if (productError || !catalogProduct?.id) {
        throw new Error(productError?.message ?? "Could not import catalogue product.");
    }

    const variantRows = parsedVariants.map(({ variant, sizeLabel, colorLabel }) => ({
        catalog_product_id: catalogProduct.id,
        supplier_variant_id: String(variant.id),
        supplier_variant_title: variant.title,
        sku: null,
        size_label: sizeLabel,
        color_label: colorLabel,
        cost_cents: variant.cost ?? null,
        price_cents: variant.price ?? null,
        currency: "AUD",
        grams: variant.grams ?? null,
        is_enabled: variant.is_enabled !== false,
        print_areas: variant.placeholders ?? [],
        shipping_profiles: (shipping.profiles ?? []).filter((profile) =>
            profile.variant_ids.includes(variant.id)
        ),
        raw_supplier_data: variant,
    }));

    if (variantRows.length) {
        const { error: variantsError } = await supabase
            .from("supplier_catalog_variants")
            .upsert(variantRows, { onConflict: "catalog_product_id,supplier_variant_id" });

        if (variantsError) {
            throw new Error(variantsError.message);
        }
    }

    const australiaShipping = findAustraliaShippingProfile(shipping);
    if (australiaShipping) {
        const { error: shippingError } = await supabase
            .from("supplier_catalog_provider_shipping")
            .upsert(
                {
                    catalog_product_id: catalogProduct.id,
                    supplier: "printify",
                    supplier_product_id: String(blueprintId),
                    supplier_provider_id: String(printProviderId),
                    destination_country: "AU",
                    shipping_method: "standard",
                    delivery_time_label: null,
                    delivery_min_days: null,
                    delivery_max_days: null,
                    size_type_label: "All",
                    first_item_cents: australiaShipping.first_item.cost,
                    additional_item_cents: australiaShipping.additional_items.cost,
                    currency: australiaShipping.first_item.currency || "AUD",
                    raw_supplier_data: australiaShipping,
                },
                {
                    onConflict: "catalog_product_id,destination_country,shipping_method,size_type_label",
                }
            );

        if (shippingError) {
            throw new Error(shippingError.message);
        }
    }

    revalidatePath("/admin/supplier-catalog");
    revalidatePath("/dashboard/products/designer");
}

export async function updateSupplierCatalogProductPriceAction(formData: FormData) {
    const { supabase, user } = await requireAdminAction();
    const supplier = String(formData.get("supplier") ?? "").trim();
    const supplierProductId = String(formData.get("supplier_product_id") ?? "").trim();
    const defaultPriceCents = moneyToCents(formData.get("default_price"), 3900);

    if (!ALLOWED_SUPPLIERS.has(supplier)) {
        throw new Error("Supplier is required.");
    }
    if (!supplierProductId) {
        throw new Error("Supplier product id is required.");
    }

    const { error: pricingError } = await supabase
        .from("supplier_catalog_product_pricing")
        .upsert(
            {
                supplier,
                supplier_product_id: supplierProductId,
                default_price_cents: defaultPriceCents,
                currency: "AUD",
                updated_by: user.id,
            },
            { onConflict: "supplier,supplier_product_id" }
        );

    if (pricingError) {
        throw new Error(pricingError.message);
    }

    const { error: catalogueError } = await supabase
        .from("supplier_catalog_products")
        .update({
            default_price_cents: defaultPriceCents,
            currency: "AUD",
        })
        .eq("supplier", supplier)
        .eq("supplier_product_id", supplierProductId);

    if (catalogueError) {
        throw new Error(catalogueError.message);
    }

    revalidatePath("/admin/supplier-catalog");
    revalidatePath("/dashboard/products/designer");
}

export async function updateSupplierCatalogProductSettingsAction(formData: FormData) {
    const { supabase, user } = await requireAdminAction();
    const supplier = String(formData.get("supplier") ?? "").trim();
    const supplierProductId = String(formData.get("supplier_product_id") ?? "").trim();
    const merchTentName = String(formData.get("merch_tent_name") ?? "").trim();
    const category = String(formData.get("category") ?? "other").trim();
    const garmentKind = String(formData.get("garment_kind") ?? "tee").trim();
    const status = String(formData.get("status") ?? "active").trim();
    const defaultPriceCents = moneyToCents(formData.get("default_price"), 3900);
    const artistProfitCents = optionalMoneyToCents(formData.get("artist_profit")) ?? 800;
    const platformProfitCents = optionalMoneyToCents(formData.get("platform_profit")) ?? 700;
    const includedPrintSideCount = includedPrintSides(formData.get("included_print_sides"));
    const additionalPrintSideCents = optionalMoneyToCents(formData.get("additional_print_side")) ?? 0;
    const additionalPrintSideRetailCents =
        optionalMoneyToCents(formData.get("additional_print_side_retail")) ?? additionalPrintSideCents;

    if (!ALLOWED_SUPPLIERS.has(supplier)) throw new Error("Supplier is required.");
    if (!supplierProductId) throw new Error("Supplier product id is required.");
    if (!merchTentName) throw new Error("Merch Tent product name is required.");
    if (!ALLOWED_CATEGORIES.has(category)) throw new Error("Category is invalid.");
    if (!ALLOWED_GARMENT_KINDS.has(garmentKind)) throw new Error("Garment kind is invalid.");
    if (!["draft", "active", "archived"].includes(status)) throw new Error("Status is invalid.");

    const { error: pricingError } = await supabase
        .from("supplier_catalog_product_pricing")
        .upsert(
            {
                supplier,
                supplier_product_id: supplierProductId,
                default_price_cents: defaultPriceCents,
                artist_profit_cents: artistProfitCents,
                platform_profit_cents: platformProfitCents,
                included_print_sides: includedPrintSideCount,
                additional_print_side_cents: additionalPrintSideCents,
                additional_print_side_retail_cents: additionalPrintSideRetailCents,
                currency: "AUD",
                updated_by: user.id,
            },
            { onConflict: "supplier,supplier_product_id" }
        );

    if (pricingError) throw new Error(pricingError.message);

    const { error: productError } = await supabase
        .from("supplier_catalog_products")
        .update({
            merch_tent_name: merchTentName,
            category,
            garment_kind: garmentKind,
            status,
            default_price_cents: defaultPriceCents,
            currency: "AUD",
        })
        .eq("supplier", supplier)
        .eq("supplier_product_id", supplierProductId);

    if (productError) throw new Error(productError.message);

    revalidatePath("/admin/supplier-catalog");
    revalidatePath(`/admin/supplier-catalog/${supplier}/${supplierProductId}`);
    revalidatePath("/dashboard/products/designer");
    redirect(`/admin/supplier-catalog/${supplier}/${encodeURIComponent(supplierProductId)}?saved=pricing`);
}

export async function updateSupplierCatalogVariantsAction(formData: FormData) {
    const { supabase } = await requireAdminAction();
    const supplier = String(formData.get("supplier") ?? "").trim();
    const supplierProductId = String(formData.get("supplier_product_id") ?? "").trim();
    const variantIds = formData.getAll("variant_id").map((value) => String(value));

    if (!ALLOWED_SUPPLIERS.has(supplier)) throw new Error("Supplier is required.");
    if (!supplierProductId) throw new Error("Supplier product id is required.");

    for (const variantId of variantIds) {
        const sizeLabel = String(formData.get(`size_${variantId}`) ?? "").trim() || null;
        const colorLabel = String(formData.get(`color_${variantId}`) ?? "").trim() || null;
        const costCents = optionalMoneyToCents(formData.get(`cost_${variantId}`));
        const priceCents = optionalMoneyToCents(formData.get(`price_${variantId}`));
        const isEnabled = formData.get(`enabled_${variantId}`) !== null;

        const { error } = await supabase
            .from("supplier_catalog_variants")
            .update({
                size_label: sizeLabel,
                color_label: colorLabel,
                cost_cents: costCents,
                price_cents: priceCents,
                is_enabled: isEnabled,
            })
            .eq("id", variantId);

        if (error) throw new Error(error.message);
    }

    revalidatePath("/admin/supplier-catalog");
    revalidatePath(`/admin/supplier-catalog/${supplier}/${supplierProductId}`);
    revalidatePath("/dashboard/products/designer");
}

export async function updateSupplierCatalogProviderShippingAction(formData: FormData) {
    const { supabase } = await requireAdminAction();
    const supplier = String(formData.get("supplier") ?? "").trim();
    const supplierProductId = String(formData.get("supplier_product_id") ?? "").trim();
    const catalogProductId = String(formData.get("catalog_product_id") ?? "").trim();
    const shippingIds = formData.getAll("shipping_id").map((value) => String(value));

    if (!ALLOWED_SUPPLIERS.has(supplier)) throw new Error("Supplier is required.");
    if (!supplierProductId) throw new Error("Supplier product id is required.");
    if (!catalogProductId) throw new Error("Catalog product id is required.");

    for (const shippingId of shippingIds) {
        const destinationCountry = requireDestinationCountry(formData.get(`shipping_country_${shippingId}`));
        const shippingMethod = requireShippingMethodId(formData.get(`shipping_method_${shippingId}`));
        const deliveryMinDays = optionalTransitDay(formData.get(`shipping_delivery_min_${shippingId}`));
        const deliveryMaxDays = optionalTransitDay(formData.get(`shipping_delivery_max_${shippingId}`));
        if (deliveryMinDays && deliveryMaxDays && deliveryMinDays > deliveryMaxDays) {
            throw new Error("Delivery minimum days cannot be greater than maximum days.");
        }
        const sizeTypeLabel = requireShippingSizeType(formData.get(`shipping_size_type_${shippingId}`));
        const firstItemCents = optionalMoneyToCents(formData.get(`shipping_first_${shippingId}`));
        const additionalItemCents = optionalMoneyToCents(formData.get(`shipping_additional_${shippingId}`));

        const { error } = await supabase
            .from("supplier_catalog_provider_shipping")
            .update({
                destination_country: destinationCountry,
                shipping_method: shippingMethod,
                delivery_time_label: deliveryTimeLabel(deliveryMinDays, deliveryMaxDays),
                delivery_min_days: deliveryMinDays,
                delivery_max_days: deliveryMaxDays,
                size_type_label: sizeTypeLabel,
                first_item_cents: firstItemCents,
                additional_item_cents: additionalItemCents,
                currency: "AUD",
            })
            .eq("id", shippingId)
            .eq("catalog_product_id", catalogProductId);

        if (error) throw new Error(error.message);
    }

    revalidatePath(`/admin/supplier-catalog/${supplier}/${supplierProductId}`);
    revalidatePath("/dashboard/products/designer");
}

export async function addSupplierCatalogProviderShippingAction(formData: FormData) {
    const { supabase } = await requireAdminAction();
    const supplier = String(formData.get("supplier") ?? "").trim();
    const supplierProductId = String(formData.get("supplier_product_id") ?? "").trim();
    const supplierProviderId = String(formData.get("supplier_provider_id") ?? "").trim();
    const catalogProductId = String(formData.get("catalog_product_id") ?? "").trim();
    const destinationCountry = requireDestinationCountry(formData.get("shipping_country"));
    const shippingMethod = requireShippingMethodId(formData.get("shipping_method"));
    const deliveryMinDays = optionalTransitDay(formData.get("shipping_delivery_min"));
    const deliveryMaxDays = optionalTransitDay(formData.get("shipping_delivery_max"));
    if (deliveryMinDays && deliveryMaxDays && deliveryMinDays > deliveryMaxDays) {
        throw new Error("Delivery minimum days cannot be greater than maximum days.");
    }
    const sizeTypeLabel = requireShippingSizeType(formData.get("shipping_size_type"));
    const firstItemCents = optionalMoneyToCents(formData.get("shipping_first"));
    const additionalItemCents = optionalMoneyToCents(formData.get("shipping_additional"));

    if (!ALLOWED_SUPPLIERS.has(supplier)) throw new Error("Supplier is required.");
    if (!supplierProductId) throw new Error("Supplier product id is required.");
    if (!supplierProviderId) throw new Error("Supplier provider id is required.");
    if (!catalogProductId) throw new Error("Catalog product id is required.");

    const { error } = await supabase
        .from("supplier_catalog_provider_shipping")
        .upsert(
            {
                catalog_product_id: catalogProductId,
                supplier,
                supplier_product_id: supplierProductId,
                supplier_provider_id: supplierProviderId,
                destination_country: destinationCountry,
                shipping_method: shippingMethod,
                delivery_time_label: deliveryTimeLabel(deliveryMinDays, deliveryMaxDays),
                delivery_min_days: deliveryMinDays,
                delivery_max_days: deliveryMaxDays,
                size_type_label: sizeTypeLabel,
                first_item_cents: firstItemCents,
                additional_item_cents: additionalItemCents,
                currency: "AUD",
            },
            {
                onConflict: "catalog_product_id,destination_country,shipping_method,size_type_label",
            }
        );

    if (error) throw new Error(error.message);

    revalidatePath(`/admin/supplier-catalog/${supplier}/${supplierProductId}`);
    revalidatePath("/dashboard/products/designer");
}

function optionalMoneyToCents(value: FormDataEntryValue | null) {
    const text = String(value ?? "").trim();
    if (!text) return null;

    const parsed = Number(text);
    if (!Number.isFinite(parsed) || parsed < 0) return null;

    return Math.round(parsed * 100);
}
