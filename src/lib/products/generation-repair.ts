import "server-only";

import { createHash, randomUUID } from "crypto";
import { getServiceSupabase } from "@/lib/supabase/service";
import {
    renderServerPrintAsset,
    type DesignerPayload,
} from "@/lib/products/server-print-renderer";
import { logger } from "@/lib/logger";
import { recordPlatformEvent } from "@/lib/platform-events";

type ProductDesignRepairRow = {
    id: string;
    product_id: string;
    artist_id: string;
    design_data: unknown;
    rendered_front_path: string | null;
    rendered_back_path: string | null;
    print_asset_front_path: string | null;
    print_asset_back_path: string | null;
};

function sha256(value: unknown) {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function assertDesignerPayload(value: unknown): DesignerPayload {
    if (!value || typeof value !== "object") {
        throw new Error("Saved design payload is missing.");
    }

    const design = value as Partial<DesignerPayload>;
    if (!design.printAreas?.front || !design.printAreas?.back || !Array.isArray(design.layers)) {
        throw new Error("Saved design payload is invalid.");
    }

    return design as DesignerPayload;
}

function failProductGenerationRepair(
    message: string,
    details: Record<string, unknown>
): never {
    logger.error(message, details);
    throw new Error("Could not repair product generation assets.");
}

async function uploadPrintAsset(
    supabase: ReturnType<typeof getServiceSupabase>,
    path: string,
    image: { buffer: Buffer; contentType: string },
    context: {
        productId: string;
        productDesignId: string;
        side: "front" | "back";
    }
) {
    const { error } = await supabase.storage
        .from("product-images")
        .upload(path, image.buffer, {
            contentType: image.contentType,
            upsert: true,
        });

    if (error) {
        failProductGenerationRepair("Product generation repair print asset upload failed", {
            product_id: context.productId,
            product_design_id: context.productDesignId,
            side: context.side,
            path,
            error: error.message,
        });
    }
}

export async function repairProductGenerationAssets(input: {
    productId: string;
    actorUserId?: string | null;
}) {
    const supabase = getServiceSupabase();
    const { data: design, error: designError } = await supabase
        .from("product_designs")
        .select("id, product_id, artist_id, design_data, rendered_front_path, rendered_back_path, print_asset_front_path, print_asset_back_path")
        .eq("product_id", input.productId)
        .eq("provider", "merch_tent")
        .maybeSingle();

    if (designError) {
        failProductGenerationRepair("Product generation repair design lookup failed", {
            product_id: input.productId,
            actor_user_id: input.actorUserId ?? null,
            error: designError.message,
        });
    }

    if (!design) {
        throw new Error("Merch Tent product design not found.");
    }

    const typedDesign = design as ProductDesignRepairRow;
    const repaired: string[] = [];
    const designPayload = assertDesignerPayload(typedDesign.design_data);
    const frontPrintAsset = await renderServerPrintAsset(designPayload, "front");
    const frontPrintAssetPath =
        typedDesign.print_asset_front_path ||
        `${typedDesign.product_id}/print-assets/front-${randomUUID()}.png`;

    await uploadPrintAsset(supabase, frontPrintAssetPath, frontPrintAsset, {
        productId: typedDesign.product_id,
        productDesignId: typedDesign.id,
        side: "front",
    });
    repaired.push("front_print_asset");

    const updatePatch: Record<string, string | null> = {
        print_asset_front_path: frontPrintAssetPath,
        print_asset_front_hash: frontPrintAsset.sha256,
        validation_status: "validated",
        renderer: "server-sharp-print-renderer",
        renderer_version: "designer-v1",
        design_hash: sha256(typedDesign.design_data),
    };

    const hasBackLayers = designPayload.layers.some((layer) => layer.side === "back");

    if (hasBackLayers) {
        const backPrintAsset = await renderServerPrintAsset(designPayload, "back");
        const backPrintAssetPath =
            typedDesign.print_asset_back_path ||
            `${typedDesign.product_id}/print-assets/back-${randomUUID()}.png`;

        await uploadPrintAsset(supabase, backPrintAssetPath, backPrintAsset, {
            productId: typedDesign.product_id,
            productDesignId: typedDesign.id,
            side: "back",
        });
        updatePatch.print_asset_back_path = backPrintAssetPath;
        updatePatch.print_asset_back_hash = backPrintAsset.sha256;
        repaired.push("back_print_asset");
    }

    const { error: updateError } = await supabase
        .from("product_designs")
        .update(updatePatch)
        .eq("id", typedDesign.id);

    if (updateError) {
        failProductGenerationRepair("Product generation repair design update failed", {
            product_id: typedDesign.product_id,
            product_design_id: typedDesign.id,
            error: updateError.message,
        });
    }

    const { data: existingPrimaryImage, error: existingPrimaryImageError } = await supabase
        .from("product_images")
        .select("id")
        .eq("product_id", typedDesign.product_id)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (existingPrimaryImageError) {
        failProductGenerationRepair("Product generation repair primary image lookup failed", {
            product_id: typedDesign.product_id,
            product_design_id: typedDesign.id,
            error: existingPrimaryImageError.message,
        });
    }

    if (!existingPrimaryImage && typedDesign.rendered_front_path) {
        const { error: imageError } = await supabase.from("product_images").insert({
            product_id: typedDesign.product_id,
            path: typedDesign.rendered_front_path,
            sort_order: 0,
            side: "front",
        });

        if (imageError) {
            failProductGenerationRepair("Product generation repair storefront mockup insert failed", {
                product_id: typedDesign.product_id,
                product_design_id: typedDesign.id,
                path: typedDesign.rendered_front_path,
                error: imageError.message,
            });
        }
        repaired.push("storefront_mockup_reference");
    }

    const { error: generationEventError } = await supabase.from("product_generation_events").insert({
        product_id: typedDesign.product_id,
        product_design_id: typedDesign.id,
        artist_id: typedDesign.artist_id,
        status: "rendered",
        renderer: "server-sharp-print-renderer",
        renderer_version: "designer-v1",
        message: "Admin repaired product generation assets from saved design data.",
        metadata: {
            repaired,
            front_print_asset_path: frontPrintAssetPath,
            actor_user_id: input.actorUserId ?? null,
            server_canonical_render: true,
        },
    });

    if (generationEventError) {
        logger.error("Product generation repair event insert failed", {
            product_id: typedDesign.product_id,
            product_design_id: typedDesign.id,
            error: generationEventError.message,
        });
        throw new Error("Product assets repaired, but repair event recording failed.");
    }

    await recordPlatformEvent(
        {
            scope: "product_generation",
            action: "product_generation_assets_repaired",
            severity: "info",
            actorUserId: input.actorUserId ?? null,
            artistId: typedDesign.artist_id,
            productId: typedDesign.product_id,
            externalId: typedDesign.id,
            message: "Admin repaired product generation assets from saved design data.",
            metadata: { repaired },
        },
        {
            supabase,
            failureLogMessage: "Product generation repair platform event failed",
            failureContext: {
                product_id: typedDesign.product_id,
                product_design_id: typedDesign.id,
            },
        }
    );

    return { repaired };
}
