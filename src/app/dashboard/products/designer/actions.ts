"use server";

import { createHash, randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { toSlug } from "@/lib/slug";
import { z } from "zod";
import { renderServerPrintAsset } from "@/lib/products/server-print-renderer";
import { logger } from "@/lib/logger";
import { decodeStrictBase64ImagePayload, validateImageBytes } from "@/lib/uploads";
import { recordPlatformEvent, type PlatformEventSeverity } from "@/lib/platform-events";
import { checkDurableRateLimit } from "@/lib/rate-limit";
import { requireArtistAction } from "@/lib/auth/artist";

const ALLOWED_CATEGORIES = [
    "tees",
    "hoodies",
    "hats",
    "tanks",
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
    garment: {
        kind: string;
        color: string;
    };
    printAreas: {
        front: PrintArea;
        back: PrintArea;
    };
    layers: DesignerLayer[];
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
});

const designPayloadSchema = z.object({
    version: z.literal(1),
    templateKey: z.string().min(1).max(80).regex(/^merch-tent-(tee|hoodie)-v1$/),
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
        sizes: z.array(z.string().min(1).max(20)).max(80).optional(),
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
    garment: z.object({
        kind: z.enum(["tee", "hoodie"]),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        colorLabel: z.string().max(80).optional(),
        supplierColorName: z.string().max(80).optional(),
    }),
    printAreas: z.object({
        front: printAreaSchema,
        back: printAreaSchema,
    }),
    layers: z.array(layerSchema).min(1).max(30),
});

const designedProductInputSchema = z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2_000),
    price: z.coerce.number().finite().min(1).max(2_000),
    category: z.enum(ALLOWED_CATEGORIES).catch("other"),
    publish: z.boolean(),
    garmentColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).catch("#111111"),
    garmentLabel: z.string().trim().max(80).catch("Designed"),
    designRaw: z.string().min(1),
    frontRender: z.string().min(1),
    backRender: z.string().optional().catch(""),
    catalogProductKey: z.string().trim().max(120).optional().catch(undefined),
    supplierKey: z.enum(["printify", "printful", "local"]).optional().catch(undefined),
    supplierProductId: z.string().trim().max(120).optional().catch(undefined),
    supplierAutomationMode: z.enum(["create_on_sale", "manual_order", "local_fulfilment"]).optional().catch(undefined),
    printifyBlueprintId: z.coerce.number().int().positive().optional().catch(undefined),
    printifyPrintProviderId: z.coerce.number().int().positive().optional().catch(undefined),
    printifyVariantIds: z.string().trim().max(4_000).optional().catch(undefined),
});

const DESIGNER_PRODUCT_CREATE_LIMIT = 8;
const DESIGNER_PRODUCT_CREATE_WINDOW_MS = 60 * 60 * 1000;

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

function parsePrintifyVariantIds(raw?: string) {
    if (!raw) return null;
    const ids = raw
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item) && item > 0);

    return ids.length ? ids : null;
}

async function uploadDataUrl(
    supabase: ReturnType<typeof getServerSupabase>,
    path: string,
    dataUrl: string
) {
    const image = parseDataUrl(dataUrl);
    const { error } = await supabase.storage
        .from("product-images")
        .upload(path, image.buffer, {
            contentType: image.contentType,
            upsert: true,
        });

    if (error) {
        failDesignerGeneration("designed product mockup upload failed", {
            path,
            error: error.message,
        });
    }

    return image;
}

async function uploadImageBuffer(
    supabase: ReturnType<typeof getServerSupabase>,
    path: string,
    image: { buffer: Buffer; contentType: string }
) {
    const { error } = await supabase.storage
        .from("product-images")
        .upload(path, image.buffer, {
            contentType: image.contentType,
            upsert: true,
        });

    if (error) {
        failDesignerGeneration("designed product print asset upload failed", {
            path,
            error: error.message,
        });
    }
}

async function replaceLayerAssets(
    supabase: ReturnType<typeof getServerSupabase>,
    productId: string,
    design: DesignerPayload
) {
    const layers: DesignerLayer[] = [];

    for (const layer of design.layers) {
        if (layer.type !== "image" || !layer.src?.startsWith("data:")) {
            layers.push(layer);
            continue;
        }

        const parsed = parseDataUrl(layer.src);
        const path = `${productId}/design-assets/${layer.id}-${randomUUID()}.${parsed.extension}`;

        const { error } = await supabase.storage
            .from("product-images")
            .upload(path, parsed.buffer, {
                contentType: parsed.contentType,
                upsert: true,
            });

        if (error) {
            failDesignerGeneration("designed product layer asset upload failed", {
                productId,
                layerId: layer.id,
                path,
                error: error.message,
            });
        }

        layers.push({
            ...layer,
            src: path,
        });
    }

    return {
        ...design,
        layers,
    };
}

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Designer product generation failed.";
}

function failDesignerGeneration(message: string, details: Record<string, unknown>): never {
    logger.error(message, details);
    throw new Error("Designer product generation failed.");
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

export async function createDesignedProductAction(formData: FormData) {
    const { supabase, user, artist } = await requireArtistAction();

    const createAllowed = await checkDurableRateLimit(
        supabase,
        `designer_product_create:${artist.id}:${user.id}`,
        DESIGNER_PRODUCT_CREATE_LIMIT,
        DESIGNER_PRODUCT_CREATE_WINDOW_MS,
        "check_public_rate_limit",
        { fallback: "deny" }
    );

    if (!createAllowed) {
        throw new Error("Too many designer product generation attempts. Try again later.");
    }

    const parsedInput = designedProductInputSchema.safeParse({
        title: formData.get("title"),
        description: formData.get("description") ?? "",
        price: formData.get("price"),
        category: formData.get("category") ?? "tees",
        publish: formData.get("publish") !== null,
        garmentColor: formData.get("garment_color") ?? "#111111",
        garmentLabel: formData.get("garment_label") ?? "Designed",
        designRaw: formData.get("design_json"),
        frontRender: formData.get("front_render"),
        backRender: formData.get("back_render") ?? "",
        catalogProductKey: formData.get("catalog_product_key") ?? undefined,
        supplierKey: formData.get("supplier_key") ?? undefined,
        supplierProductId: formData.get("supplier_product_id") ?? undefined,
        supplierAutomationMode: formData.get("supplier_automation_mode") ?? undefined,
        printifyBlueprintId: formData.get("printify_blueprint_id") ?? undefined,
        printifyPrintProviderId: formData.get("printify_print_provider_id") ?? undefined,
        printifyVariantIds: formData.get("printify_variant_ids") ?? undefined,
    });
    if (!parsedInput.success) {
        throw new Error("Design and front render are required");
    }

    const {
        title,
        description,
        price,
        category,
        publish,
        garmentColor,
        garmentLabel,
        designRaw,
        frontRender,
        backRender = "",
        catalogProductKey,
        supplierKey,
        supplierProductId,
        supplierAutomationMode,
        printifyBlueprintId,
        printifyPrintProviderId,
        printifyVariantIds,
    } = parsedInput.data;

    const design = normaliseDesignPayload(designRaw);
    const parsedVariantIds = parsePrintifyVariantIds(printifyVariantIds);
    const hasBackDesign = design.layers.some((layer) => layer.side === "back");
    const canonicalFrontPrintAsset = await renderServerPrintAsset(design, "front");
    const canonicalBackPrintAsset = hasBackDesign
        ? await renderServerPrintAsset(design, "back")
        : null;
    const baseSlug = toSlug(title) || "designed-product";
    const slug = `${baseSlug}-${randomUUID().slice(0, 8)}`;
    let productId: string | null = null;
    let productDesignId: string | null = null;

    try {
        const { data: product, error: productError } = await supabase
            .from("products")
            .insert({
                artist_id: artist.id,
                title,
                category,
                slug,
                description,
                price_cents: Math.round(price * 100),
                currency: "AUD",
                is_published: false,
                fulfillment_flow: "supplier_on_demand",
                production_status: "generating",
                moderation_status: "draft",
                readiness_notes: "Designer V1 product generation in progress.",
            })
            .select("id")
            .single();

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

        const frontPath = `${createdProductId}/designer/front-${randomUUID()}.png`;
        const frontMockup = await uploadDataUrl(supabase, frontPath, frontRender);

        const { error: frontImageError } = await supabase
            .from("product_images")
            .insert({
                product_id: createdProductId,
                path: frontPath,
                sort_order: 0,
                side: "front",
            });

        if (frontImageError) {
            failDesignerGeneration("designed product front image insert failed", {
                artistId: artist.id,
                productId: createdProductId,
                path: frontPath,
                error: frontImageError.message,
            });
        }

        let backPath: string | null = null;
        if (backRender) {
            backPath = `${createdProductId}/designer/back-${randomUUID()}.png`;
            await uploadDataUrl(supabase, backPath, backRender);

            const { error: backImageError } = await supabase
                .from("product_images")
                .insert({
                    product_id: createdProductId,
                    path: backPath,
                    sort_order: 1,
                    side: "back",
                });

            if (backImageError) {
                failDesignerGeneration("designed product back image insert failed", {
                    artistId: artist.id,
                    productId: createdProductId,
                    path: backPath,
                    error: backImageError.message,
                });
            }
        }

        const frontPrintAssetPath = `${createdProductId}/print-assets/front-${randomUUID()}.png`;
        await uploadImageBuffer(supabase, frontPrintAssetPath, canonicalFrontPrintAsset);

        let backPrintAssetPath: string | null = null;
        let backPrintHash: string | null = null;
        if (canonicalBackPrintAsset) {
            backPrintAssetPath = `${createdProductId}/print-assets/back-${randomUUID()}.png`;
            await uploadImageBuffer(supabase, backPrintAssetPath, canonicalBackPrintAsset);
            backPrintHash = canonicalBackPrintAsset.sha256;
        }

        const savedDesign = await replaceLayerAssets(supabase, createdProductId, design);
        savedDesign.printSideCount = hasBackDesign ? 2 : 1;
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

        const { error: colorError } = await supabase.from("product_colors").insert({
            product_id: createdProductId,
            hex: garmentColor,
            label: garmentLabel,
            sort_order: 0,
            front_image_path: frontPath,
            back_image_path: backPath,
        });

        if (colorError) {
            failDesignerGeneration("designed product color insert failed", {
                artistId: artist.id,
                productId: createdProductId,
                error: colorError.message,
            });
        }

        const { data: productDesign, error: designError } = await supabase.from("product_designs").insert({
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
            printify_print_provider_id: printifyPrintProviderId ?? savedDesign.catalogProduct?.supplier.printify?.printProviderId ?? null,
            printify_variant_ids: parsedVariantIds ?? savedDesign.catalogProduct?.supplier.printify?.variantIds ?? null,
            printify_status: "not_synced",
            printify_last_error: null,
            validation_status: "validated",
            renderer: "server-sharp-print-renderer",
            renderer_version: "designer-v1",
            design_hash: designHash,
            print_asset_front_hash: canonicalFrontPrintAsset.sha256,
            print_asset_back_hash: backPrintHash,
        }).select("id").single();

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
                readiness_notes: publish
                    ? "Designer V1 payload validated, published, and queued for moderation review."
                    : "Designer V1 payload validated and saved as draft.",
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
