import "server-only";

import {
    createPrintifyProduct,
    uploadPrintifyImageFromUrl,
    type PrintifyCreateProductPayload,
} from "@/lib/printify/products";
import { serverEnv } from "@/lib/env.server";
import { publicImageUrl } from "@/lib/storage";
import { getServiceSupabase } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

type ProductRow = {
    id: string;
    artist_id: string;
    title: string;
    description: string | null;
    price_cents: number | null;
};

type DesignRow = {
    id: string;
    artist_id: string;
    product_id: string;
    print_asset_front_path: string | null;
    print_asset_back_path: string | null;
    printify_blueprint_id: number | null;
    printify_print_provider_id: number | null;
    printify_variant_ids: number[] | null;
    printify_product_id: string | null;
    printify_status: string | null;
    updated_at: string | null;
};

type SyncReason = "artist_manual_sync" | "fulfillment_on_demand";

type SyncResult = {
    ok: true;
    productId: string;
    printifyProductId: string;
    alreadySynced: boolean;
};

const PRINTIFY_PRODUCT_SYNC_IN_FLIGHT_MINUTES = 30;

function productImagePublicUrl(path: string) {
    const url = publicImageUrl(path);
    if (!url) throw new Error("Product image path is required.");
    return url;
}

function formatPrintifyError(error: unknown) {
    if (error instanceof Error) return error.message;
    return "Printify sync failed.";
}

function failPrintifySync(
    message: string,
    details: Record<string, unknown>
): never {
    logger.error(message, details);
    throw new Error("Could not sync product to Printify.");
}

function parseVariantTitle(title?: string | null) {
    const parts = (title ?? "")
        .split("/")
        .map((part) => part.trim())
        .filter(Boolean);

    if (parts.length >= 2) {
        return {
            sizeLabel: parts[0],
            colorLabel: parts.slice(1).join(" / "),
        };
    }

    return {
        sizeLabel: parts[0] ?? null,
        colorLabel: null,
    };
}

function resolvePrintifyCatalogConfig(design: DesignRow) {
    const blueprintId = design.printify_blueprint_id ?? serverEnv.printifyDefaultBlueprintId();
    const printProviderId =
        design.printify_print_provider_id ?? serverEnv.printifyDefaultPrintProviderId();
    const variantIds = design.printify_variant_ids?.length
        ? design.printify_variant_ids
        : serverEnv.printifyDefaultVariantIds();

    if (!blueprintId || !printProviderId || !variantIds?.length) {
        throw new Error("Printify sync is missing print assets or catalog configuration.");
    }

    return {
        blueprintId,
        printProviderId,
        variantIds,
    };
}

function isStalePrintifyProductSync(updatedAt?: string | null) {
    if (!updatedAt) return true;
    const updatedAtMs = Date.parse(updatedAt);
    if (!Number.isFinite(updatedAtMs)) return true;

    return Date.now() - updatedAtMs > PRINTIFY_PRODUCT_SYNC_IN_FLIGHT_MINUTES * 60 * 1000;
}

async function writePrintifySyncEvent(
    serviceSupabase: ReturnType<typeof getServiceSupabase>,
    row: {
        product_id: string;
        product_design_id: string;
        artist_id: string;
        status: "started" | "succeeded" | "failed";
        request_payload?: unknown;
        response_payload?: unknown;
        error_message?: string;
    }
) {
    const { error } = await serviceSupabase.from("printify_sync_events").insert(row);

    if (error) {
        logger.error("Printify sync event write failed", {
            product_id: row.product_id,
            product_design_id: row.product_design_id,
            status: row.status,
            error: error.message,
        });
        throw new Error("Could not record Printify sync event.");
    }
}

export async function syncProductToPrintify(input: {
    productId: string;
    artistId?: string | null;
    actorUserId?: string | null;
    reason: SyncReason;
}): Promise<SyncResult> {
    const serviceSupabase = getServiceSupabase();

    const { data: product, error: productError } = await serviceSupabase
        .from("products")
        .select("id, artist_id, title, description, price_cents")
        .eq("id", input.productId)
        .maybeSingle();

    if (productError) {
        failPrintifySync("Printify sync product lookup failed", {
            product_id: input.productId,
            artist_id: input.artistId ?? null,
            reason: input.reason,
            error: productError.message,
        });
    }

    if (!product) {
        throw new Error("Product not found.");
    }

    const typedProduct = product as ProductRow;
    if (input.artistId && typedProduct.artist_id !== input.artistId) {
        throw new Error("Product does not belong to this artist.");
    }

    const { data: design, error: designError } = await serviceSupabase
        .from("product_designs")
        .select(
            "id, artist_id, product_id, print_asset_front_path, print_asset_back_path, printify_blueprint_id, printify_print_provider_id, printify_variant_ids, printify_product_id, printify_status, updated_at"
        )
        .eq("product_id", typedProduct.id)
        .eq("artist_id", typedProduct.artist_id)
        .maybeSingle();

    if (designError) {
        failPrintifySync("Printify sync design lookup failed", {
            product_id: typedProduct.id,
            artist_id: typedProduct.artist_id,
            reason: input.reason,
            error: designError.message,
        });
    }

    if (!design) {
        throw new Error("This product does not have a saved designer record.");
    }

    const typedDesign = design as DesignRow;
    if (typedDesign.printify_product_id && typedDesign.printify_status === "synced") {
        return {
            ok: true,
            productId: typedProduct.id,
            printifyProductId: typedDesign.printify_product_id,
            alreadySynced: true,
        };
    }

    if (typedDesign.printify_product_id) {
        logger.error("Printify product sync has an incomplete local mapping", {
            product_id: typedProduct.id,
            product_design_id: typedDesign.id,
            artist_id: typedProduct.artist_id,
            printify_product_id: typedDesign.printify_product_id,
            printify_status: typedDesign.printify_status,
        });
        throw new Error("Printify product was created, but local sync state is incomplete.");
    }

    if (!typedDesign.print_asset_front_path) {
        throw new Error("Printify sync is missing print assets or catalog configuration.");
    }

    const config = resolvePrintifyCatalogConfig(typedDesign);

    const syncClaimCutoff = new Date(
        Date.now() - PRINTIFY_PRODUCT_SYNC_IN_FLIGHT_MINUTES * 60 * 1000
    ).toISOString();

    const { data: syncClaim, error: syncingUpdateError } = await serviceSupabase
        .from("product_designs")
        .update({
            printify_status: "syncing",
            printify_last_error: null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", typedDesign.id)
        .is("printify_product_id", null)
        .or(`printify_status.neq.syncing,updated_at.lt.${syncClaimCutoff}`)
        .select("id")
        .maybeSingle();

    if (syncingUpdateError) {
        logger.error("Printify sync status update failed", {
            product_id: typedProduct.id,
            product_design_id: typedDesign.id,
            status: "syncing",
            error: syncingUpdateError.message,
        });
        throw new Error("Could not mark product as syncing.");
    }

    if (!syncClaim && typedDesign.printify_status === "syncing" && !isStalePrintifyProductSync(typedDesign.updated_at)) {
        logger.warn("Printify product sync already in progress; duplicate product creation skipped", {
            product_id: typedProduct.id,
            product_design_id: typedDesign.id,
            artist_id: typedProduct.artist_id,
            updated_at: typedDesign.updated_at,
            in_flight_minutes: PRINTIFY_PRODUCT_SYNC_IN_FLIGHT_MINUTES,
        });
        throw new Error("Product is already syncing to Printify.");
    }

    if (!syncClaim) {
        failPrintifySync("Printify sync claim failed", {
            product_id: typedProduct.id,
            product_design_id: typedDesign.id,
            artist_id: typedProduct.artist_id,
            reason: input.reason,
            printify_status: typedDesign.printify_status,
            updated_at: typedDesign.updated_at,
        });
    }

    await writePrintifySyncEvent(serviceSupabase, {
        product_id: typedProduct.id,
        product_design_id: typedDesign.id,
        artist_id: typedProduct.artist_id,
        status: "started",
        request_payload: {
            reason: input.reason,
            actor_user_id: input.actorUserId ?? null,
        },
    });

    let createdPrintifyProductId: string | null = null;

    try {
        const frontUpload = await uploadPrintifyImageFromUrl(
            `${typedProduct.id}-front.png`,
            productImagePublicUrl(typedDesign.print_asset_front_path)
        );

        const placeholders = [
            {
                position: "front",
                images: [
                    {
                        id: frontUpload.id,
                        x: 0.5,
                        y: 0.5,
                        scale: 1,
                        angle: 0,
                    },
                ],
            },
        ];

        if (typedDesign.print_asset_back_path) {
            const backUpload = await uploadPrintifyImageFromUrl(
                `${typedProduct.id}-back.png`,
                productImagePublicUrl(typedDesign.print_asset_back_path)
            );
            placeholders.push({
                position: "back",
                images: [
                    {
                        id: backUpload.id,
                        x: 0.5,
                        y: 0.5,
                        scale: 1,
                        angle: 0,
                    },
                ],
            });
        }

        const price = Math.max(Number(typedProduct.price_cents ?? 0), 100);
        const payload: PrintifyCreateProductPayload = {
            title: typedProduct.title,
            description: typedProduct.description || typedProduct.title,
            blueprint_id: config.blueprintId,
            print_provider_id: config.printProviderId,
            variants: config.variantIds.map((id) => ({
                id,
                price,
                is_enabled: true,
            })),
            print_areas: [
                {
                    variant_ids: config.variantIds,
                    placeholders,
                },
            ],
        };

        const printifyProduct = await createPrintifyProduct(payload);
        createdPrintifyProductId = printifyProduct.id;
        const { data: createdUpdate, error: createdUpdateError } = await serviceSupabase
            .from("product_designs")
            .update({
                printify_product_id: printifyProduct.id,
                printify_status: "syncing",
                printify_payload: payload,
            })
            .eq("id", typedDesign.id)
            .is("printify_product_id", null)
            .select("id")
            .maybeSingle();

        if (createdUpdateError || !createdUpdate) {
            logger.error("Printify product created, but external id persistence failed", {
                product_id: typedProduct.id,
                product_design_id: typedDesign.id,
                printify_product_id: printifyProduct.id,
                error: createdUpdateError?.message ?? "No product design row updated",
            });
            throw new Error("Printify product created, but local sync state could not be saved.");
        }

        const variantRows = (printifyProduct.variants ?? []).map((variant) => {
            const parsed = parseVariantTitle(variant.title);

            return {
                product_id: typedProduct.id,
                artist_id: typedProduct.artist_id,
                printify_product_id: printifyProduct.id,
                printify_variant_id: variant.id,
                title: variant.title ?? null,
                size_label: parsed.sizeLabel,
                color_label: parsed.colorLabel,
                sku: variant.sku ?? null,
                is_enabled: Boolean(variant.is_enabled ?? true),
                raw_variant: variant,
            };
        });

        if (variantRows.length) {
            const { error: variantsError } = await serviceSupabase
                .from("product_printify_variants")
                .upsert(variantRows, { onConflict: "product_id,printify_variant_id" });

            if (variantsError) {
                failPrintifySync("Printify variant mapping write failed", {
                    product_id: typedProduct.id,
                    product_design_id: typedDesign.id,
                    printify_product_id: printifyProduct.id,
                    error: variantsError.message,
                });
            }
        }

        const { error: syncedUpdateError } = await serviceSupabase
            .from("product_designs")
            .update({
                printify_status: "synced",
                printify_last_error: null,
                printify_synced_at: new Date().toISOString(),
            })
            .eq("id", typedDesign.id);

        if (syncedUpdateError) {
            logger.error("Printify sync status update failed", {
                product_id: typedProduct.id,
                product_design_id: typedDesign.id,
                status: "synced",
                printify_product_id: printifyProduct.id,
                error: syncedUpdateError.message,
            });
            throw new Error("Printify product created, but local sync state could not be saved.");
        }

        await writePrintifySyncEvent(serviceSupabase, {
            product_id: typedProduct.id,
            product_design_id: typedDesign.id,
            artist_id: typedProduct.artist_id,
            status: "succeeded",
            request_payload: {
                reason: input.reason,
                actor_user_id: input.actorUserId ?? null,
                payload,
            },
            response_payload: printifyProduct,
        });

        return {
            ok: true,
            productId: typedProduct.id,
            printifyProductId: printifyProduct.id,
            alreadySynced: false,
        };
    } catch (error) {
        const message = formatPrintifyError(error);
        const failedPatch: {
            printify_product_id?: string;
            printify_status: "failed";
            printify_last_error: string;
        } = {
            printify_status: "failed",
            printify_last_error: message,
        };

        if (createdPrintifyProductId) {
            failedPatch.printify_product_id = createdPrintifyProductId;
        }

        const { error: failedUpdateError } = await serviceSupabase
            .from("product_designs")
            .update(failedPatch)
            .eq("id", typedDesign.id);

        if (failedUpdateError) {
            logger.error("Printify failed status update failed", {
                product_id: typedProduct.id,
                product_design_id: typedDesign.id,
                error: failedUpdateError.message,
            });
        }

        await writePrintifySyncEvent(serviceSupabase, {
            product_id: typedProduct.id,
            product_design_id: typedDesign.id,
            artist_id: typedProduct.artist_id,
            status: "failed",
            request_payload: {
                reason: input.reason,
                actor_user_id: input.actorUserId ?? null,
            },
            error_message: message,
        });

        logger.error("Printify product sync failed", {
            product_id: typedProduct.id,
            product_design_id: typedDesign.id,
            artist_id: typedProduct.artist_id,
            reason: input.reason,
            error: message,
        });

        throw new Error("Could not sync product to Printify.");
    }
}
