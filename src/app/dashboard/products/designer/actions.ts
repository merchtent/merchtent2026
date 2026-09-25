"use server";

import { createHash, randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { toSlug } from "@/lib/slug";
import { z } from "zod";
import { renderServerLifestyleMockups, renderServerMockup, renderServerPrintAsset } from "@/lib/products/server-print-renderer";
import { logger } from "@/lib/logger";
import { decodeStrictBase64ImagePayload, validateImageBytes } from "@/lib/uploads";
import { recordPlatformEvent, type PlatformEventSeverity } from "@/lib/platform-events";
import { checkDurableRateLimit } from "@/lib/rate-limit";
import { requireArtistAction } from "@/lib/auth/artist";
import { getLifestyleModelSets, type LifestyleModelSetId } from "@/lib/products/mockup-templates";
import { getDesignerCatalogProduct } from "@/lib/supplier-catalog";
import { posterCanvasArea, posterFormatForKey, remapPosterLayers, type PosterFormat } from "@/lib/products/poster-formats";
import { resolveGeometryRect } from "@/lib/products/design-geometry";
import { buildDesignedProductName } from "@/lib/products/designed-product-name";

const ALLOWED_CATEGORIES = [
    "tees",
    "hoodies",
    "hats",
    "tanks",
    "bags",
    "posters",
    "vinyl",
    "accessories",
    "other",
] as const;

const ALLOWED_DATA_URL_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
]);

type DesignerLayer = {
    id: string;
    side: "front" | "back";
    type: "image" | "text";
    x: number;
    y: number;
    width?: number;
    height?: number;
    rotation?: number;
    opacity?: number;
    text?: string;
    fill?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    src?: string;
    sourcePixelWidth?: number;
    sourcePixelHeight?: number;
    name?: string;
    locked?: boolean;
    hidden?: boolean;
    groupId?: string;
    fileType?: string;
    hasTransparency?: boolean;
    colorProfile?: string;
};

type DesignerPayload = {
    version: 1;
    templateKey: string;
    catalogProduct?: {
        key: string;
        name: string;
        brand: string;
        model: string;
        category: string;
        supplier: {
            key: string;
            name: string;
            externalProductId: string;
            productUrl?: string;
            automationMode?: string;
            printify?: {
                blueprintId?: number;
                printProviderId?: number | null;
                variantIds?: number[];
            };
        };
        providerOptions?: Array<{
            key: string;
            supplier: string;
            supplierProductId: string;
            supplierProviderId: string | null;
            supplierProviderName: string | null;
            location?: {
                country?: string | null;
                region?: string | null;
                city?: string | null;
            };
            variantIds: number[];
            minCostCents: number | null;
            maxCostCents: number | null;
            colors: string[];
            sizes: string[];
        }>;
        sizes?: string[];
        colors?: unknown[];
        production?: unknown;
    };
    canvas: {
        width: number;
        height: number;
    };
        printAsset?: {
            width: number;
            height: number;
            format: string;
        };
    printSideCount?: 1 | 2;
    posterFormatKey?: string;
    posterFormats?: PosterFormat[];
    posterLayouts?: Array<{ key: string; layers: DesignerLayer[] }>;
    posterPrintAssets?: Array<PosterFormat & { path: string; sha256: string }>;
    garment: {
        kind: "tee" | "hoodie" | "hat" | "tank" | "bag" | "poster";
        color: string;
        colorLabel?: string;
        supplierColorName?: string;
    };
    printAreas: {
        front: PrintArea;
        back: PrintArea;
    };
    normalizedPrintAreas?: {
        front: PrintArea & { units: "ratio" };
        back: PrintArea & { units: "ratio" };
    };
    layers: DesignerLayer[];
    listingModelSets?: { female?: LifestyleModelSetId; male?: LifestyleModelSetId };
};

type PrintArea = {
    x: number;
    y: number;
    width: number;
    height: number;
};

const printAreaSchema = z.object({
    x: z.number().finite().min(0).max(900),
    y: z.number().finite().min(0).max(1200),
    width: z.number().finite().min(1).max(900),
    height: z.number().finite().min(1).max(1200),
});

const normalizedPrintAreaSchema = z.object({
    x: z.number().finite().min(0).max(1),
    y: z.number().finite().min(0).max(1),
    width: z.number().finite().min(0.001).max(1),
    height: z.number().finite().min(0.001).max(1),
    units: z.literal("ratio"),
});

const layerSchema = z.object({
    id: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
    side: z.enum(["front", "back"]),
    type: z.enum(["image", "text"]),
    x: z.number().finite().min(0).max(900),
    y: z.number().finite().min(0).max(1200),
    width: z.number().finite().min(1).max(900).optional(),
    height: z.number().finite().min(1).max(1200).optional(),
    rotation: z.number().finite().min(-180).max(180).optional(),
    opacity: z.number().finite().min(0.05).max(1).optional(),
    text: z.string().max(180).optional(),
    fill: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    fontSize: z.number().finite().min(12).max(220).optional(),
    fontFamily: z.enum(["Arial", "Impact", "Georgia", "Verdana", "Courier New"]).optional(),
    fontWeight: z.enum(["400", "500", "600", "700", "800", "900"]).optional(),
    src: z.string().max(16_000_000).optional(),
    sourcePixelWidth: z.number().int().min(1).max(50_000).optional(),
    sourcePixelHeight: z.number().int().min(1).max(50_000).optional(),
    name: z.string().trim().min(1).max(80).optional(),
    locked: z.boolean().optional(),
    hidden: z.boolean().optional(),
    groupId: z.string().max(80).optional(),
    fileType: z.string().max(80).optional(),
    hasTransparency: z.boolean().optional(),
    colorProfile: z.string().max(80).optional(),
});

const designPayloadSchema = z.object({
    version: z.literal(1),
    templateKey: z.string().min(1).max(80).regex(/^merch-tent-(tee|hoodie|hat|tank|bag|poster)-v1$/),
    catalogProduct: z.object({
        key: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
        name: z.string().min(1).max(160),
        brand: z.string().min(1).max(80),
        model: z.string().min(1).max(80),
        category: z.enum(ALLOWED_CATEGORIES),
        supplier: z.object({
            key: z.enum(["printify", "printful", "local"]),
            name: z.string().min(1).max(80),
            externalProductId: z.string().min(1).max(120),
            productUrl: z.string().url().optional(),
            automationMode: z.enum(["create_on_sale", "manual_order", "local_fulfilment"]).optional(),
            printify: z.object({
                blueprintId: z.number().int().positive().optional(),
                printProviderId: z.number().int().positive().nullable().optional(),
                variantIds: z.array(z.number().int().positive()).max(500).optional(),
            }).optional(),
        }),
        providerOptions: z.array(z.object({
            key: z.string().min(1).max(120),
            supplier: z.enum(["printify", "printful", "local"]),
            supplierProductId: z.string().min(1).max(120),
            supplierProviderId: z.string().max(120).nullable(),
            supplierProviderName: z.string().max(160).nullable(),
            location: z.object({
                country: z.string().max(80).nullable().optional(),
                region: z.string().max(80).nullable().optional(),
                city: z.string().max(120).nullable().optional(),
            }).optional(),
            variantIds: z.array(z.number().int().positive()).max(500),
            minCostCents: z.number().int().nonnegative().nullable(),
            maxCostCents: z.number().int().nonnegative().nullable(),
            colors: z.array(z.string().max(100)).max(200),
            sizes: z.array(z.string().max(40)).max(100),
        })).max(50).optional(),
        sizes: z.array(z.string().min(1).max(40)).max(80).optional(),
        colors: z.array(z.unknown()).max(100).optional(),
        production: z.unknown().optional(),
    }).optional(),
    canvas: z.object({
        width: z.literal(900),
        height: z.literal(1200),
    }),
    printAsset: z.object({
        width: z.literal(2400),
        height: z.literal(3200),
        format: z.literal("image/png"),
    }).optional(),
    printSideCount: z.union([z.literal(1), z.literal(2)]).optional(),
    posterFormatKey: z.string().min(1).max(80).optional(),
    posterFormats: z.array(z.object({
        key: z.string().min(1).max(80),
        label: z.string().min(1).max(80),
        width: z.number().int().min(100).max(12_000),
        height: z.number().int().min(100).max(12_000),
        variantIds: z.array(z.number().int().positive()).min(1).max(20),
    })).max(20).optional(),
    posterLayouts: z.array(z.object({
        key: z.string().min(1).max(80),
        layers: z.array(layerSchema).max(30),
    })).max(20).optional(),
    garment: z.object({
        kind: z.enum(["tee", "hoodie", "hat", "tank", "bag", "poster"]),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        colorLabel: z.string().max(80).optional(),
        supplierColorName: z.string().max(80).optional(),
    }),
    printAreas: z.object({
        front: printAreaSchema,
        back: printAreaSchema,
    }),
    normalizedPrintAreas: z.object({
        front: normalizedPrintAreaSchema,
        back: normalizedPrintAreaSchema,
    }).optional(),
    layers: z.array(layerSchema).max(30),
});

const designedProductInputSchema = z.object({
    productId: z.string().uuid().optional(),
    dropName: z.string().trim().min(1).max(80),
    description: z.string().trim().max(2_000),
    price: z.coerce.number().finite().min(1).max(2_000),
    category: z.enum(ALLOWED_CATEGORIES).catch("other"),
    publish: z.boolean(),
    garmentColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).catch("#111111"),
    garmentLabel: z.string().trim().max(80).catch("Designed"),
    saleColorNamesRaw: z.string().max(2000),
    designRaw: z.string().min(1),
    catalogProductKey: z.string().trim().max(120).optional().catch(undefined),
    supplierKey: z.enum(["printify", "printful", "local"]).optional().catch(undefined),
    supplierProductId: z.string().trim().max(120).optional().catch(undefined),
    supplierAutomationMode: z.enum(["create_on_sale", "manual_order", "local_fulfilment"]).optional().catch(undefined),
    printifyBlueprintId: z.coerce.number().int().positive().optional().catch(undefined),
    printifyPrintProviderId: z.coerce.number().int().positive().optional().catch(undefined),
    printifyVariantIds: z.string().trim().max(4_000).optional().catch(undefined),
    femaleModelSet: z.enum([
        "gig",
        "crowd",
        "outdoor",
        "jazz",
        "hoodie-rehearsal",
        "hoodie-vinyl-press",
        "hoodie-loading-dock",
        "hoodie-radio-studio",
        "tank-rehearsal",
        "tank-backstage",
        "tank-record-shop",
        "tank-loading-dock",
        "tote-record-shop",
        "tote-loading-dock",
        "hat-backstage",
        "hat-record-shop",
        "hat-side-stage",
        "hat-laneway",
    ]).optional(),
    maleModelSet: z.enum([
        "gig",
        "crowd",
        "outdoor",
        "jazz",
        "hoodie-rehearsal",
        "hoodie-vinyl-press",
        "hoodie-loading-dock",
        "hoodie-radio-studio",
        "tank-rehearsal",
        "tank-backstage",
        "tank-record-shop",
        "tank-loading-dock",
        "tote-record-shop",
        "tote-loading-dock",
        "hat-backstage",
        "hat-record-shop",
        "hat-side-stage",
        "hat-laneway",
    ]).optional(),
});

const DESIGNER_PRODUCT_CREATE_LIMIT = 8;
const DESIGNER_PRODUCT_CREATE_WINDOW_MS = 60 * 60 * 1000;
const DESIGNER_MOCKUP_PREVIEW_LIMIT = 40;
const DESIGNER_MOCKUP_PREVIEW_WINDOW_MS = 60 * 60 * 1000;

function sha256(buffer: Buffer | string) {
    return createHash("sha256").update(buffer).digest("hex");
}

function parseDataUrl(value: string) {
    const match = value.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
        throw new Error("Invalid generated image data");
    }

    const contentType = match[1];
    if (!ALLOWED_DATA_URL_TYPES.has(contentType)) {
        throw new Error("Unsupported generated image type");
    }

    const buffer = decodeStrictBase64ImagePayload(match[2]);
    if (buffer.length === 0) {
        throw new Error("Generated image is empty");
    }
    if (buffer.length > 12 * 1024 * 1024) {
        throw new Error("Generated image is too large");
    }
    validateImageBytes(buffer, contentType);

    return {
        buffer,
        contentType,
        extension: contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg",
        sha256: sha256(buffer),
    };
}

function normaliseDesignPayload(raw: string): DesignerPayload {
    const parsed = designPayloadSchema.parse(JSON.parse(raw)) as DesignerPayload;

    for (const layer of parsed.layers) {
        const width = layer.width ?? 1;
        const height = layer.height ?? 1;
        const area = parsed.printAreas[layer.side];

        if (layer.x < area.x || layer.y < area.y || layer.x + width > area.x + area.width || layer.y + height > area.y + area.height) {
            throw new Error("All design layers must stay inside the printable safe area.");
        }

        if (layer.type === "text" && !layer.text?.trim()) {
            throw new Error("Text layers must include text.");
        }

        if (layer.type === "image" && !layer.src) {
            throw new Error("Image layers must include an image.");
        }
    }

    return parsed;
}

function posterDesignsForProduct(design: DesignerPayload, liveFormats: PosterFormat[]) {
    if (design.garment.kind !== "poster") return [];
    const sourceFormat = posterFormatForKey(liveFormats, design.posterFormatKey);
    if (!sourceFormat) throw new Error("This poster does not have any available print formats.");
    const submittedIds = new Set(design.posterFormats?.flatMap((format) => format.variantIds) ?? []);
    const liveIds = new Set(liveFormats.flatMap((format) => format.variantIds));
    if (submittedIds.size !== liveIds.size || [...submittedIds].some((id) => !liveIds.has(id))) {
        throw new Error("Poster formats changed in the supplier catalogue. Reload the designer and try again.");
    }
    const sourceArea = resolveGeometryRect(design.printAreas.front);
    const sourceLayers = new Map(design.layers.map((layer) => [layer.id, layer]));

    return liveFormats.map((format) => {
        const area = posterCanvasArea(format.width, format.height);
        const savedLayout = design.posterLayouts?.find((layout) => layout.key === format.key)?.layers;
        const layers = savedLayout
            ? savedLayout.map((layer) => ({
                ...layer,
                src: layer.src ?? sourceLayers.get(layer.id)?.src,
            }))
            : remapPosterLayers(design.layers, sourceArea, area);
        for (const layer of layers) {
            const width = layer.width ?? 1;
            const height = layer.height ?? 1;
            if (layer.x < area.x || layer.y < area.y || layer.x + width > area.x + area.width || layer.y + height > area.y + area.height) {
                throw new Error(`Artwork for ${format.label} must stay inside its printable area.`);
            }
        }
        return {
            format,
            design: {
                ...design,
                posterFormatKey: format.key,
                posterFormats: liveFormats,
                printAreas: { front: area, back: area },
                normalizedPrintAreas: undefined,
                layers,
            } satisfies DesignerPayload,
        };
    });
}

async function requireAvailableDesignerColor(design: DesignerPayload) {
    const product = design.catalogProduct?.key
        ? await getDesignerCatalogProduct(design.catalogProduct.key)
        : null;
    const selectedName = design.garment.supplierColorName ?? design.garment.colorLabel;
    const color = product?.colors.find((item) =>
        item.value.toLowerCase() === design.garment.color.toLowerCase() &&
        (item.supplierColorName ?? item.label).toLowerCase() === selectedName?.toLowerCase()
    );
    if (!color) throw new Error("That tee colour is no longer available. Choose an allowed colour in the designer.");
    return { product, color };
}

async function requireAvailableDesignerColors(design: DesignerPayload, names: string[]) {
    if (!Array.isArray(names) || names.length < 1 || names.length > 6 ||
        names.some((name) => typeof name !== "string" || !name.trim()) ||
        new Set(names.map((name) => name.toLowerCase())).size !== names.length) {
        throw new Error("Choose between one and six colours to sell.");
    }
    const { product, color: primaryColor } = await requireAvailableDesignerColor(design);
    const colors = names.map((name) => product?.colors.find((item) =>
        (item.supplierColorName ?? item.label).toLowerCase() === name.toLowerCase()
    ));
    if (colors.some((color) => !color) || !colors.some((color) => color === primaryColor)) {
        throw new Error("One or more selected colours are no longer available.");
    }
    return { product: product!, colors: colors as NonNullable<(typeof colors)[number]>[] };
}

async function availablePrintifyVariantIds(
    supabase: ReturnType<typeof getServerSupabase>,
    supplierProductId: string,
    preferredProviderId: number | null | undefined,
    colorNames: string[]
) {
    const { data, error } = await supabase.from("supplier_catalog_products")
        .select("supplier_provider_id, supplier_catalog_variants(supplier_variant_id, color_label, is_enabled)")
        .eq("supplier", "printify")
        .eq("supplier_product_id", supplierProductId)
        .eq("status", "active");
    if (error) throw new Error("Could not check supplier colour availability.");
    const selected = new Set(colorNames.map((name) => name.toLowerCase()));
    const providers = (data ?? []).map((row) => ({
        id: Number(row.supplier_provider_id),
        variants: (row.supplier_catalog_variants ?? []).filter((variant) =>
            variant.is_enabled !== false && selected.has((variant.color_label ?? "").toLowerCase())
        ),
    }));
    const matching = providers.filter((provider) =>
        selected.size === new Set(provider.variants.map((variant) => variant.color_label?.toLowerCase())).size
    );
    const provider = matching.find((item) => item.id === preferredProviderId) ?? matching[0];
    const ids = provider?.variants.map((variant) => Number(variant.supplier_variant_id))
        .filter((id) => Number.isInteger(id) && id > 0) ?? [];
    if (!provider || !ids.length) throw new Error("No supplier can fulfil every selected colour. Choose a different combination.");
    return { providerId: provider.id, variantIds: ids };
}

function parsePrintifyVariantIds(raw?: string) {
    if (!raw) return null;
    const ids = raw
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item) && item > 0);

    return ids.length ? ids : null;
}

async function uploadImageBuffer(
    supabase: ReturnType<typeof getServiceSupabase>,
    path: string,
    image: { buffer: Buffer; contentType: string },
    failureMessage = "designed product print asset upload failed"
) {
    const { error } = await supabase.storage
        .from("product-images")
        .upload(path, image.buffer, {
            contentType: image.contentType,
            upsert: false,
        });

    if (error) {
        failDesignerGeneration(failureMessage, {
            path,
            error: error.message,
        });
    }
}

async function replaceLayerAssets(
    supabase: ReturnType<typeof getServiceSupabase>,
    productId: string,
    userId: string,
    design: DesignerPayload
) {
    const storedSources = new Map<string, string>();
    async function persistLayer(layer: DesignerLayer) {
        const isOwnedUploadedAsset = layer.src?.startsWith(`designer-assets/${userId}/`) ?? false;
        if (layer.type === "image" && layer.src && !layer.src.startsWith("data:") && !layer.src.startsWith(`${productId}/design-assets/`) && !isOwnedUploadedAsset) {
            throw new Error("The design contains an image from another product.");
        }
        if (layer.type !== "image" || !layer.src?.startsWith("data:")) {
            return layer;
        }

        const existingPath = storedSources.get(layer.src);
        if (existingPath) return { ...layer, src: existingPath };

        const parsed = parseDataUrl(layer.src);
        const path = `${productId}/design-assets/${layer.id}-${randomUUID()}.${parsed.extension}`;

        const { error } = await supabase.storage
            .from("product-images")
            .upload(path, parsed.buffer, {
                contentType: parsed.contentType,
                upsert: false,
            });

        if (error) {
            failDesignerGeneration("designed product layer asset upload failed", {
                productId,
                layerId: layer.id,
                path,
                error: error.message,
            });
        }

        storedSources.set(layer.src, path);
        return { ...layer, src: path };
    }

    const layers: DesignerLayer[] = [];
    for (const layer of design.layers) layers.push(await persistLayer(layer));
    const posterLayouts = [];
    for (const layout of design.posterLayouts ?? []) {
        const layoutLayers: DesignerLayer[] = [];
        for (const layer of layout.layers) layoutLayers.push(await persistLayer(layer));
        posterLayouts.push({ ...layout, layers: layoutLayers });
    }

    return {
        ...design,
        layers,
        ...(posterLayouts.length > 0 ? { posterLayouts } : {}),
    };
}

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Designer product generation failed.";
}

function failDesignerGeneration(message: string, details: Record<string, unknown>): never {
    logger.error(message, details);
    throw new Error(`${message}: ${String(details.error ?? "unknown error")}`);
}

async function logDesignerGenerationPlatformEvent(
    supabase: ReturnType<typeof getServerSupabase>,
    input: {
        action: string;
        severity?: PlatformEventSeverity;
        actorUserId: string | null;
        artistId: string;
        productId: string;
        productDesignId: string | null;
        message: string;
        metadata?: Record<string, unknown>;
    }
) {
    await recordPlatformEvent(
        {
            scope: "product_generation",
            action: input.action,
            severity: input.severity ?? "info",
            actorUserId: input.actorUserId,
            artistId: input.artistId,
            productId: input.productId,
            externalId: input.productDesignId,
            message: input.message,
            metadata: input.metadata ?? {},
        },
        {
            supabase,
            failureLogMessage: "designed product platform event insert failed",
            failureContext: {
                artistId: input.artistId,
                productId: input.productId,
                productDesignId: input.productDesignId,
                action: input.action,
            },
            throwOnFailure: true,
            failurePublicMessage: "Could not audit designer product generation.",
        }
    );
}

async function markDesignedProductGenerationFailed(
    supabase: ReturnType<typeof getServerSupabase>,
    input: {
        productId: string;
        productDesignId: string | null;
        artistId: string;
        actorUserId: string | null;
        message: string;
    }
) {
    const { error: productUpdateError } = await supabase
        .from("products")
        .update({
            is_published: false,
            production_status: "failed",
            readiness_notes: "Designer V1 generation failed. Review product generation events before publishing.",
        })
        .eq("id", input.productId);

    if (productUpdateError) {
        logger.error("designed product failure status update failed", {
            artistId: input.artistId,
            productId: input.productId,
            error: productUpdateError.message,
        });
    }

    const { error: generationEventError } = await supabase.from("product_generation_events").insert({
        product_id: input.productId,
        product_design_id: input.productDesignId,
        artist_id: input.artistId,
        status: "failed",
        renderer: "server-sharp-print-renderer",
        renderer_version: "designer-v1",
        message: "Designer product generation failed.",
        metadata: {
            error: input.message,
            server_canonical_render: true,
        },
    });

    if (generationEventError) {
        logger.error("designed product failure event insert failed", {
            artistId: input.artistId,
            productId: input.productId,
            productDesignId: input.productDesignId,
            error: generationEventError.message,
        });
    }

    await logDesignerGenerationPlatformEvent(supabase, {
        action: "designed_product_generation_failed",
        severity: "error",
        actorUserId: input.actorUserId,
        artistId: input.artistId,
        productId: input.productId,
        productDesignId: input.productDesignId,
        message: "Designer product generation failed.",
        metadata: {
            error: input.message,
            server_canonical_render: true,
        },
    });
}

export async function generateDesignerMockupPreviewAction(designRaw: string, saleColorNamesRaw?: string) {
    const { user, artist } = await requireArtistAction();
    const rateLimitSupabase = getServiceSupabase();
    const previewAllowed = await checkDurableRateLimit(
        rateLimitSupabase,
        `designer_mockup_preview:${artist.id}:${user.id}`,
        DESIGNER_MOCKUP_PREVIEW_LIMIT,
        DESIGNER_MOCKUP_PREVIEW_WINDOW_MS,
        "check_rate_limit",
        { fallback: "deny" }
    );

    if (!previewAllowed) {
        throw new Error("Too many mockup previews. Try again later.");
    }

    const design = normaliseDesignPayload(designRaw);
    let requestedColors: string[];
    try {
        requestedColors = saleColorNamesRaw
            ? JSON.parse(saleColorNamesRaw)
            : [design.garment.supplierColorName ?? design.garment.colorLabel ?? ""];
    } catch {
        throw new Error("Choose the colours to sell again.");
    }
    const { product, colors } = await requireAvailableDesignerColors(design, requestedColors);
    const isSingleSided = design.garment.kind === "poster" || design.garment.kind === "hat";
    const posterTargets = design.garment.kind === "poster"
        ? posterDesignsForProduct(design, product.production.posterFormats ?? [])
        : [];
    if (product.supplier.key === "printify") {
        await availablePrintifyVariantIds(
            getServerSupabase(),
            product.supplier.externalProductId,
            product.supplier.printify?.printProviderId,
            colors.map((color) => color.supplierColorName ?? color.label)
        );
    }
    const [renderedColors, lifestyle, renderedPosterFormats] = await Promise.all([
        Promise.all(colors.map(async (color) => {
            try {
            const variantDesign = { ...design, garment: { ...design.garment, color: color.value } };
            const [front, back] = await Promise.all([
                renderServerMockup(variantDesign, "front"),
                isSingleSided ? Promise.resolve(null) : renderServerMockup(variantDesign, "back"),
            ]);
            return {
                label: color.label,
                value: color.value,
                front: `data:${front.contentType};base64,${front.buffer.toString("base64")}`,
                back: back ? `data:${back.contentType};base64,${back.buffer.toString("base64")}` : null,
            };
            } catch (error: unknown) {
                logger.error("designer colour mockup preview failed", {
                    color: color.supplierColorName ?? color.label,
                    error: error instanceof Error ? error.message : String(error),
                });
                return null;
            }
        })),
        renderServerLifestyleMockups(design).catch((error: unknown) => {
            logger.error("designer lifestyle mockup preview failed", {
                error: error instanceof Error ? error.message : String(error),
            });
            return [];
        }),
        Promise.all(posterTargets.map(async ({ format, design: targetDesign }) => {
            const mockup = await renderServerMockup(targetDesign, "front");
            return {
                key: format.key,
                label: format.label,
                width: format.width,
                height: format.height,
                src: `data:${mockup.contentType};base64,${mockup.buffer.toString("base64")}`,
            };
        })),
    ]);

    const colorMockups = renderedColors.filter((color): color is NonNullable<typeof color> => Boolean(color));
    const primary = colorMockups.find((color) => color.value.toLowerCase() === design.garment.color.toLowerCase()) ?? colorMockups[0];
    if (!primary) throw new Error("No colour mockups could be generated. Return to the designer and try another colour.");
    return JSON.stringify({
        front: primary.front,
        back: primary.back,
        colorMockups,
        lifestyle: lifestyle.map((mockup) => ({
            id: mockup.id,
            label: mockup.label,
            src: `data:${mockup.contentType};base64,${mockup.buffer.toString("base64")}`,
        })),
        posterFormats: renderedPosterFormats,
    });
}

export async function createDesignedProductAction(formData: FormData) {
    const { supabase, user, artist } = await requireArtistAction();
    const rateLimitSupabase = getServiceSupabase();

    const createAllowed = await checkDurableRateLimit(
        rateLimitSupabase,
        `designer_product_create:${artist.id}:${user.id}`,
        DESIGNER_PRODUCT_CREATE_LIMIT,
        DESIGNER_PRODUCT_CREATE_WINDOW_MS,
        "check_rate_limit",
        { fallback: "deny" }
    );

    if (!createAllowed) {
        throw new Error("Too many designer product generation attempts. Try again later.");
    }

    const parsedInput = designedProductInputSchema.safeParse({
        productId: formData.get("product_id") ?? undefined,
        dropName: formData.get("drop_name"),
        description: formData.get("description") ?? "",
        price: formData.get("price"),
        category: formData.get("category") ?? "tees",
        publish: formData.get("publish") !== null,
        garmentColor: formData.get("garment_color") ?? "#111111",
        garmentLabel: formData.get("garment_label") ?? "Designed",
        saleColorNamesRaw: formData.get("sale_color_names") ?? "[]",
        designRaw: formData.get("design_json"),
        catalogProductKey: formData.get("catalog_product_key") ?? undefined,
        supplierKey: formData.get("supplier_key") ?? undefined,
        supplierProductId: formData.get("supplier_product_id") ?? undefined,
        supplierAutomationMode: formData.get("supplier_automation_mode") ?? undefined,
        printifyBlueprintId: formData.get("printify_blueprint_id") ?? undefined,
        printifyPrintProviderId: formData.get("printify_print_provider_id") ?? undefined,
        printifyVariantIds: formData.get("printify_variant_ids") ?? undefined,
        femaleModelSet: formData.get("female_model_set") ?? undefined,
        maleModelSet: formData.get("male_model_set") ?? undefined,
    });
    if (!parsedInput.success) {
        throw new Error("Design details are required");
    }

    const {
        productId: editingProductId,
        dropName,
        description,
        price,
        category,
        publish,
        garmentColor,
        garmentLabel,
        saleColorNamesRaw,
        designRaw,
        catalogProductKey,
        supplierKey,
        supplierProductId,
        supplierAutomationMode,
        printifyBlueprintId,
        printifyPrintProviderId,
        printifyVariantIds,
        femaleModelSet,
        maleModelSet,
    } = parsedInput.data;

    if (editingProductId) {
        const { data: ownedProduct, error: ownershipError } = await supabase
            .from("products")
            .select("id")
            .eq("id", editingProductId)
            .eq("artist_id", artist.id)
            .is("artist_archived_at", null)
            .maybeSingle();
        if (ownershipError || !ownedProduct) throw new Error("This product cannot be edited.");
    }

    const design = normaliseDesignPayload(designRaw);
    let saleColorNames: string[];
    try { saleColorNames = JSON.parse(saleColorNamesRaw); } catch { throw new Error("Choose the colours to sell again."); }
    const { product: liveCatalogProduct, colors: saleColors } = await requireAvailableDesignerColors(design, saleColorNames);
    const title = buildDesignedProductName(artist.display_name, dropName, liveCatalogProduct.name);
    const approvedColor = saleColors.find((color) =>
        (color.supplierColorName ?? color.label).toLowerCase() === (design.garment.supplierColorName ?? design.garment.colorLabel)?.toLowerCase()
    );
    if (!approvedColor) throw new Error("Choose a valid main listing colour.");
    const orderedSaleColors = [approvedColor, ...saleColors.filter((color) => color !== approvedColor)];
    if (catalogProductKey !== design.catalogProduct?.key ||
        supplierKey !== liveCatalogProduct.supplier.key ||
        supplierProductId !== liveCatalogProduct.supplier.externalProductId ||
        garmentColor.toLowerCase() !== approvedColor.value.toLowerCase() ||
        garmentLabel.toLowerCase() !== approvedColor.label.toLowerCase()) {
        throw new Error("Choose an allowed colour in the designer.");
    }
    if (design.layers.length === 0) {
        throw new Error("Add artwork or text before saving the product.");
    }
    let supplierVariants = supplierKey === "printify" && supplierProductId
        ? await availablePrintifyVariantIds(supabase, supplierProductId, liveCatalogProduct.supplier.printify?.printProviderId, saleColorNames)
        : null;
    let parsedVariantIds = supplierVariants?.variantIds ?? parsePrintifyVariantIds(printifyVariantIds);
    const hasFrontDesign = design.layers.some((layer) => layer.side === "front") &&
        design.layers.some((layer) => layer.side === "front" && !layer.hidden);
    const hasBackDesign = design.layers.some((layer) => layer.side === "back") &&
        design.layers.some((layer) => layer.side === "back" && !layer.hidden);
    const isSingleSided = design.garment.kind === "poster" || design.garment.kind === "hat";
    if (design.garment.kind === "poster" && hasBackDesign) {
        throw new Error("Posters support front artwork only.");
    }
    if (design.garment.kind === "hat" && hasBackDesign) {
        throw new Error("Hats support front artwork only.");
    }
    const availableModelSets = getLifestyleModelSets(design.catalogProduct ?? {}, design.garment.color);
    const femaleModelSets = availableModelSets.filter((set) => set.audience === "female");
    const maleModelSets = availableModelSets.filter((set) => set.audience === "male");
    if ((femaleModelSets.length > 0 && !femaleModelSets.some((set) => set.id === femaleModelSet)) ||
        (maleModelSets.length > 0 && !maleModelSets.some((set) => set.id === maleModelSet))) {
        throw new Error("Choose one available model from each listed group before saving.");
    }
    const chosenModelSets = [femaleModelSet, maleModelSet]
        .filter((id): id is LifestyleModelSetId => Boolean(id));
    const posterTargets = design.garment.kind === "poster"
        ? posterDesignsForProduct(design, liveCatalogProduct.production.posterFormats ?? [])
        : [];
    const canonicalPosterTarget = posterTargets.find(({ format }) => format.key === design.posterFormatKey)
        ?? posterTargets[0];
    const canonicalRenderDesign = canonicalPosterTarget?.design ?? design;
    const canonicalFrontPrintAsset = canonicalPosterTarget
        ? await renderServerPrintAsset(
            canonicalRenderDesign,
            "front",
            { width: canonicalPosterTarget.format.width, height: canonicalPosterTarget.format.height },
        )
        : await renderServerPrintAsset(design, "front");
    const canonicalBackPrintAsset = hasBackDesign
        ? await renderServerPrintAsset(design, "back")
        : null;
    const canonicalFrontMockup = await renderServerMockup(canonicalRenderDesign, "front");
    const canonicalBackMockup = isSingleSided
        ? null
        : await renderServerMockup(design, "back");
    const lifestyleMockups = chosenModelSets.length > 0
        ? await renderServerLifestyleMockups(design, { modelSets: chosenModelSets })
        : [];
    const expectedLifestyleMockups = availableModelSets
        .filter((set) => chosenModelSets.includes(set.id))
        .reduce((count, set) => count + 1 + (set.backTemplateId ? 1 : 0), 0);
    if (chosenModelSets.length > 0 && lifestyleMockups.length !== expectedLifestyleMockups) {
        throw new Error("Selected model mockups could not be generated. Try again before saving.");
    }
    const baseSlug = toSlug(title) || "designed-product";
    const slug = `${baseSlug}-${randomUUID().slice(0, 8)}`;
    let productId: string | null = null;
    let productDesignId: string | null = null;

    try {
        const productMutation = {
                artist_id: artist.id,
                title,
                category,
                description,
                price_cents: Math.round(price * 100),
                artist_cut_cents: liveCatalogProduct.production.artistProfitCents ?? 0,
                currency: "AUD",
                is_published: false,
                fulfillment_flow: "supplier_on_demand",
                production_status: "generating",
                moderation_status: "draft",
                readiness_notes: "Designer V1 product generation in progress.",
        };
        const { data: product, error: productError } = editingProductId
            ? await supabase.from("products").update(productMutation).eq("id", editingProductId).eq("artist_id", artist.id).select("id").single()
            : await supabase.from("products").insert({ ...productMutation, slug }).select("id").single();

        if (productError) {
            failDesignerGeneration("designed product insert failed", {
                artistId: artist.id,
                slug,
                error: productError.message,
            });
        }
        if (!product?.id) throw new Error("Product creation failed");
        productId = product.id;
        const createdProductId = product.id;
        const imageRows: Array<{ product_id: string; path: string; sort_order: number; side: "front" | "back" }> = [];

        const frontPath = `${createdProductId}/mockups/front-${randomUUID()}.${canonicalFrontMockup.extension}`;
        await uploadImageBuffer(rateLimitSupabase, frontPath, canonicalFrontMockup, "designed product mockup upload failed");
        const frontMockup = canonicalFrontMockup;

        imageRows.push({
                product_id: createdProductId,
                path: frontPath,
                sort_order: 0,
                side: "front" as const,
            });

        let backPath: string | null = null;
        if (canonicalBackMockup) {
            backPath = `${createdProductId}/mockups/back-${randomUUID()}.${canonicalBackMockup.extension}`;
            await uploadImageBuffer(rateLimitSupabase, backPath, canonicalBackMockup, "designed product mockup upload failed");
            imageRows.push({
                product_id: createdProductId,
                path: backPath,
                sort_order: 1,
                side: "back",
            });
        }

        const lifestyleOrder = [
            femaleModelSet && lifestyleMockups.find((mockup) => mockup.modelSetId === femaleModelSet && mockup.side === "front"),
            femaleModelSet && lifestyleMockups.find((mockup) => mockup.modelSetId === femaleModelSet && mockup.side === "back"),
            maleModelSet && lifestyleMockups.find((mockup) => mockup.modelSetId === maleModelSet && mockup.side === "front"),
            maleModelSet && lifestyleMockups.find((mockup) => mockup.modelSetId === maleModelSet && mockup.side === "back"),
        ].filter((mockup): mockup is NonNullable<typeof mockup> => Boolean(mockup));
        for (const [index, mockup] of lifestyleOrder.entries()) {
            const imagePath = `${createdProductId}/mockups/${mockup.id}-${randomUUID()}.webp`;
            await uploadImageBuffer(rateLimitSupabase, imagePath, mockup, "designed product model mockup upload failed");
            imageRows.push({
                product_id: createdProductId,
                path: imagePath,
                sort_order: index + Math.max(2, posterTargets.length),
                side: mockup.side,
            });
        }

        const frontPrintAssetPath = `${createdProductId}/print-assets/front-${randomUUID()}.png`;
        await uploadImageBuffer(rateLimitSupabase, frontPrintAssetPath, canonicalFrontPrintAsset);

        const posterPrintAssets: Array<PosterFormat & { path: string; sha256: string }> = [];
        if (canonicalPosterTarget) {
            posterPrintAssets.push({
                ...canonicalPosterTarget.format,
                path: frontPrintAssetPath,
                sha256: canonicalFrontPrintAsset.sha256,
            });
            let posterImageOrder = 1;
            for (const target of posterTargets) {
                if (target.format.key === canonicalPosterTarget.format.key) continue;
                const asset = await renderServerPrintAsset(
                    target.design,
                    "front",
                    { width: target.format.width, height: target.format.height },
                );
                const assetPath = `${createdProductId}/print-assets/poster-${target.format.key}-${randomUUID()}.png`;
                await uploadImageBuffer(rateLimitSupabase, assetPath, asset);
                posterPrintAssets.push({ ...target.format, path: assetPath, sha256: asset.sha256 });

                const mockup = await renderServerMockup(target.design, "front");
                const mockupPath = `${createdProductId}/mockups/poster-${target.format.key}-${randomUUID()}.webp`;
                await uploadImageBuffer(rateLimitSupabase, mockupPath, mockup, "designed poster format mockup upload failed");
                imageRows.push({
                    product_id: createdProductId,
                    path: mockupPath,
                    sort_order: posterImageOrder++,
                    side: "front",
                });
            }
        }

        let backPrintAssetPath: string | null = null;
        let backPrintHash: string | null = null;
        if (canonicalBackPrintAsset) {
            backPrintAssetPath = `${createdProductId}/print-assets/back-${randomUUID()}.png`;
            await uploadImageBuffer(rateLimitSupabase, backPrintAssetPath, canonicalBackPrintAsset);
            backPrintHash = canonicalBackPrintAsset.sha256;
        }

        const savedDesign = await replaceLayerAssets(rateLimitSupabase, createdProductId, user.id, design);
        savedDesign.printSideCount = hasFrontDesign && hasBackDesign ? 2 : 1;
        if (posterPrintAssets.length > 0) savedDesign.posterPrintAssets = posterPrintAssets;
        if (chosenModelSets.length > 0) {
            savedDesign.listingModelSets = {
                ...(femaleModelSet ? { female: femaleModelSet } : {}),
                ...(maleModelSet ? { male: maleModelSet } : {}),
            };
        }
        const savedCatalogProduct = savedDesign.catalogProduct ?? {
            key: catalogProductKey ?? "unknown",
            name: title,
            brand: "Unknown",
            model: "Unknown",
            category,
            supplier: {
                key: supplierKey ?? "local",
                name: supplierKey ?? "Local supplier",
                externalProductId: supplierProductId ?? "unknown",
                automationMode: supplierAutomationMode ?? "manual_order",
            },
        };
        savedDesign.catalogProduct = {
            ...savedCatalogProduct,
            supplier: {
                ...savedCatalogProduct.supplier,
                key: savedCatalogProduct.supplier.key ?? supplierKey ?? "local",
                externalProductId: savedCatalogProduct.supplier.externalProductId ?? supplierProductId ?? "unknown",
                automationMode: savedCatalogProduct.supplier.automationMode ?? supplierAutomationMode ?? "manual_order",
            },
        };
        const designHash = sha256(JSON.stringify(savedDesign));

        if (editingProductId) {
            const { error: removeImagesError } = await supabase.from("product_images").delete().eq("product_id", createdProductId);
            if (removeImagesError) failDesignerGeneration("designed product image replacement failed", { productId: createdProductId, error: removeImagesError.message });
        }
        const { error: imagesError } = await supabase.from("product_images").insert(imageRows);
        if (imagesError) failDesignerGeneration("designed product images insert failed", { productId: createdProductId, error: imagesError.message });

        const colorRows = [];
        const renderedColorNames: string[] = [];
        for (const [index, color] of orderedSaleColors.entries()) {
            const supplierColorName = color.supplierColorName ?? color.label;
            const isPrimary = (color.supplierColorName ?? color.label).toLowerCase() ===
                (design.garment.supplierColorName ?? design.garment.colorLabel)?.toLowerCase();
            if (isPrimary) {
                colorRows.push({
                    product_id: createdProductId,
                    hex: color.value,
                    label: color.label,
                    sort_order: index,
                    front_image_path: frontPath,
                    back_image_path: backPath,
                });
                renderedColorNames.push(supplierColorName);
                continue;
            }
            try {
                const colorDesign = { ...design, garment: { ...design.garment, color: color.value } };
                const [front, back] = await Promise.all([
                    renderServerMockup(colorDesign, "front"),
                    isSingleSided ? Promise.resolve(null) : renderServerMockup(colorDesign, "back"),
                ]);
                const colorFrontPath = `${createdProductId}/mockups/front-${randomUUID()}.${front.extension}`;
                const colorBackPath = back ? `${createdProductId}/mockups/back-${randomUUID()}.${back.extension}` : null;
                await uploadImageBuffer(rateLimitSupabase, colorFrontPath, front);
                if (back && colorBackPath) await uploadImageBuffer(rateLimitSupabase, colorBackPath, back);
                colorRows.push({
                    product_id: createdProductId,
                    hex: color.value,
                    label: color.label,
                    sort_order: index,
                    front_image_path: colorFrontPath,
                    back_image_path: colorBackPath,
                });
                renderedColorNames.push(supplierColorName);
            } catch (error: unknown) {
                logger.error("designed product optional colour mockup skipped", {
                    productId: createdProductId,
                    color: supplierColorName,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        if (supplierKey === "printify" && supplierProductId && renderedColorNames.length !== saleColorNames.length) {
            supplierVariants = await availablePrintifyVariantIds(
                supabase,
                supplierProductId,
                supplierVariants?.providerId ?? liveCatalogProduct.supplier.printify?.printProviderId,
                renderedColorNames
            );
            parsedVariantIds = supplierVariants.variantIds;
        }
        if (editingProductId) {
            const { error: removeColorsError } = await supabase.from("product_colors").delete().eq("product_id", createdProductId);
            if (removeColorsError) failDesignerGeneration("designed product color replacement failed", { productId: createdProductId, error: removeColorsError.message });
        }
        const { error: colorError } = await supabase.from("product_colors").insert(colorRows);

        if (colorError) {
            failDesignerGeneration("designed product color insert failed", {
                artistId: artist.id,
                productId: createdProductId,
                error: colorError.message,
            });
        }

        const designValues = {
            product_id: createdProductId,
            artist_id: artist.id,
            provider: "merch_tent",
            template_key: savedDesign.templateKey,
            design_data: savedDesign,
            rendered_front_path: frontPath,
            rendered_back_path: backPath,
            print_asset_front_path: frontPrintAssetPath,
            print_asset_back_path: backPrintAssetPath,
            printify_blueprint_id: printifyBlueprintId ?? savedDesign.catalogProduct?.supplier.printify?.blueprintId ?? null,
            printify_print_provider_id: supplierVariants?.providerId ?? printifyPrintProviderId ?? savedDesign.catalogProduct?.supplier.printify?.printProviderId ?? null,
            printify_variant_ids: parsedVariantIds ?? savedDesign.catalogProduct?.supplier.printify?.variantIds ?? null,
            printify_status: "not_synced",
            printify_last_error: null,
            validation_status: "validated",
            renderer: "server-sharp-print-renderer",
            renderer_version: "designer-v1",
            design_hash: designHash,
            print_asset_front_hash: canonicalFrontPrintAsset.sha256,
            print_asset_back_hash: backPrintHash,
        };
        const { data: productDesign, error: designError } = await supabase.from("product_designs")
            .upsert(designValues, { onConflict: "product_id,provider" })
            .select("id").single();

        if (designError) {
            failDesignerGeneration("designed product design insert failed", {
                artistId: artist.id,
                productId: createdProductId,
                error: designError.message,
            });
        }
        if (!productDesign?.id) throw new Error("Product design creation failed");
        productDesignId = productDesign.id;

        const { error: generationEventError } = await supabase.from("product_generation_events").insert({
            product_id: createdProductId,
            product_design_id: productDesignId,
            artist_id: artist.id,
            status: publish ? "published" : "validated",
            renderer: "server-sharp-print-renderer",
            renderer_version: "designer-v1",
            message: publish
                ? "Designer product validated and published."
                : "Designer product validated and saved as draft.",
            metadata: {
                template_key: savedDesign.templateKey,
                design_hash: designHash,
                front_mockup_hash: frontMockup.sha256,
                front_print_asset_hash: canonicalFrontPrintAsset.sha256,
                back_print_asset_hash: backPrintHash,
                listing_model_sets: savedDesign.listingModelSets ?? null,
                server_canonical_render: true,
            },
        });

        if (generationEventError) {
            failDesignerGeneration("designed product generation event insert failed", {
                artistId: artist.id,
                productId: createdProductId,
                productDesignId,
                error: generationEventError.message,
            });
        }

        const { error: publishError } = await supabase
            .from("products")
            .update({
                is_published: publish,
                production_status: publish ? "published" : "generated",
                moderation_status: publish ? "pending_review" : "draft",
                moderation_notes: publish ? "Awaiting operator review after artist self-service designer publish." : null,
                moderation_reviewed_at: null,
                moderation_reviewed_by: null,
                readiness_notes: null,
            })
            .eq("id", createdProductId);

        if (publishError) {
            failDesignerGeneration("designed product publish status update failed", {
                artistId: artist.id,
                productId: createdProductId,
                productDesignId,
                publish,
                error: publishError.message,
            });
        }

        await logDesignerGenerationPlatformEvent(supabase, {
            action: publish ? "designed_product_published" : "designed_product_saved",
            actorUserId: user.id,
            artistId: artist.id,
            productId: createdProductId,
            productDesignId,
            message: publish
                ? "Designer product validated and published."
                : "Designer product validated and saved as draft.",
            metadata: {
                template_key: savedDesign.templateKey,
                design_hash: designHash,
                front_mockup_hash: frontMockup.sha256,
                front_print_asset_hash: canonicalFrontPrintAsset.sha256,
                back_print_asset_hash: backPrintHash,
                listing_model_sets: savedDesign.listingModelSets ?? null,
                server_canonical_render: true,
            },
        });
    } catch (error) {
        const message = errorMessage(error);

        logger.error("designed product generation failed", {
            artistId: artist.id,
            productId,
            productDesignId,
            error: message,
        });

        if (productId) {
            await markDesignedProductGenerationFailed(supabase, {
                productId,
                productDesignId,
                artistId: artist.id,
                actorUserId: user.id,
                message,
            });
        }

        throw new Error("Product generation failed. The product was saved as unpublished for review.");
    }

    redirect("/dashboard/products");
}
