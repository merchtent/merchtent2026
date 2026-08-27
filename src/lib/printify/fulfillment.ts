import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service";
import { syncProductToPrintify } from "@/lib/printify/product-sync";
import { submitPrintifyOrder, type PrintifyOrderPayload } from "@/lib/printify/orders";
import { logger } from "@/lib/logger";

type OrderRow = {
    id: number | string;
    order_number: string | null;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
    phone: string | null;
    shipping_method: string | null;
};

type OrderItemRow = {
    id: number | string;
    product_id: string | null;
    qty: number | null;
    sku: string | null;
    color_label: string | null;
    size_label: string | null;
};

type DesignRow = {
    product_id: string;
    artist_id: string;
    printify_product_id: string | null;
    printify_print_provider_id: number | null;
    printify_status: string | null;
};

type VariantRow = {
    product_id: string;
    printify_product_id: string;
    printify_variant_id: number;
    size_label: string | null;
    color_label: string | null;
    is_enabled: boolean | null;
};

type PrintifyOrderSyncRow = {
    order_id: number | string;
    status: "failed" | "skipped" | "started" | "succeeded";
    printify_order_id?: string;
    request_payload?: unknown;
    response_payload?: unknown;
    error_message?: string | null;
    attempted_at?: string;
    failed_at?: string;
    succeeded_at?: string;
};

const PRINTIFY_ORDER_SYNC_IN_FLIGHT_MINUTES = 30;
const POSTGRES_UNIQUE_VIOLATION = "23505";

function normalise(value?: string | null) {
    return (value ?? "").trim().toLowerCase();
}

function shippingMethodCode(value?: string | null) {
    return value === "express" ? 2 : 1;
}

function requireAddress(order: OrderRow) {
    if (!order.email || !order.first_name || !order.last_name || !order.line1 || !order.city || !order.postal_code || !order.country) {
        throw new Error("Order is missing required shipping details for Printify.");
    }

    return {
        first_name: order.first_name,
        last_name: order.last_name,
        email: order.email,
        phone: order.phone ?? undefined,
        country: order.country,
        region: order.state ?? undefined,
        address1: order.line1,
        address2: order.line2 ?? undefined,
        city: order.city,
        zip: order.postal_code,
    };
}

function failPrintifyFulfillment(
    message: string,
    details: Record<string, unknown>
): never {
    logger.error(message, details);
    throw new Error("Could not prepare Printify fulfillment.");
}

function findVariant(item: OrderItemRow, variants: VariantRow[]) {
    const enabled = variants.filter((variant) => variant.is_enabled !== false);
    const size = normalise(item.size_label);
    const color = normalise(item.color_label);

    if (size || color) {
        const exact = enabled.find(
            (variant) =>
                (!size || normalise(variant.size_label) === size) &&
                (!color || normalise(variant.color_label) === color)
        );
        if (exact) return exact;
    }

    if (!size && !color && enabled.length === 1) {
        return enabled[0];
    }

    return null;
}

async function upsertPrintifyOrderSync(
    supabase: ReturnType<typeof getServiceSupabase>,
    row: PrintifyOrderSyncRow
) {
    const { error } = await supabase.from("printify_order_syncs").upsert(row, {
        onConflict: "order_id",
    });

    if (error) {
        logger.error("Printify order sync write failed", {
            order_id: row.order_id,
            status: row.status,
            error: error.message,
        });
        throw new Error("Could not record Printify order sync state.");
    }
}

function isUniqueViolation(error: { code?: string } | null) {
    return error?.code === POSTGRES_UNIQUE_VIOLATION;
}

async function claimPrintifyOrderSync(
    supabase: ReturnType<typeof getServiceSupabase>,
    orderId: number | string,
    existingSync: { status: string; attempted_at?: string | null } | null
) {
    const now = new Date().toISOString();

    if (!existingSync) {
        const { error } = await supabase.from("printify_order_syncs").insert({
            order_id: orderId,
            status: "started",
            attempted_at: now,
            error_message: null,
        });

        if (!error) return true;

        if (isUniqueViolation(error)) {
            logger.warn("Printify order sync claim lost to concurrent worker", {
                order_id: orderId,
            });
            return false;
        }

        logger.error("Printify order sync claim insert failed", {
            order_id: orderId,
            error: error.message,
        });
        throw new Error("Could not claim Printify order sync.");
    }

    const syncClaimCutoff = new Date(
        Date.now() - PRINTIFY_ORDER_SYNC_IN_FLIGHT_MINUTES * 60 * 1000
    ).toISOString();

    const { data: claim, error } = await supabase
        .from("printify_order_syncs")
        .update({
            status: "started",
            attempted_at: now,
            failed_at: null,
            error_message: null,
        })
        .eq("order_id", orderId)
        .neq("status", "succeeded")
        .or(`status.neq.started,attempted_at.lt.${syncClaimCutoff}`)
        .select("order_id")
        .maybeSingle();

    if (error) {
        logger.error("Printify order sync claim update failed", {
            order_id: orderId,
            error: error.message,
        });
        throw new Error("Could not claim Printify order sync.");
    }

    if (!claim) {
        logger.warn("Printify order sync claim skipped after concurrent state change", {
            order_id: orderId,
            existing_status: existingSync.status,
            attempted_at: existingSync.attempted_at ?? null,
            in_flight_minutes: PRINTIFY_ORDER_SYNC_IN_FLIGHT_MINUTES,
        });
        return false;
    }

    return true;
}

export async function attemptPrintifyFulfillmentForOrder(orderId: number | string) {
    const supabase = getServiceSupabase();

    async function recordFailedSync(message: string) {
        await upsertPrintifyOrderSync(supabase, {
            order_id: orderId,
            status: "failed",
            error_message: message,
            attempted_at: new Date().toISOString(),
            failed_at: new Date().toISOString(),
        });
    }

    async function failClaimedPrintifyFulfillment(
        logMessage: string,
        details: Record<string, unknown>,
        publicMessage = "Could not prepare Printify fulfillment."
    ): Promise<never> {
        await recordFailedSync(publicMessage);
        logger.error(logMessage, details);
        throw new Error(publicMessage);
    }

    const { data: existingSync, error: existingSyncError } = await supabase
        .from("printify_order_syncs")
        .select("status, printify_order_id, attempted_at")
        .eq("order_id", orderId)
        .maybeSingle();

    if (existingSyncError) {
        failPrintifyFulfillment("Printify fulfillment existing sync lookup failed", {
            order_id: orderId,
            error: existingSyncError.message,
        });
    }

    if (existingSync?.status === "succeeded") {
        return;
    }

    if (
        existingSync?.status === "started" &&
        !isStalePrintifyOrderSync(existingSync.attempted_at)
    ) {
        logger.warn("Printify order sync already in progress; duplicate submission skipped", {
            order_id: orderId,
            attempted_at: existingSync.attempted_at,
            in_flight_minutes: PRINTIFY_ORDER_SYNC_IN_FLIGHT_MINUTES,
        });
        return;
    }

    const claimed = await claimPrintifyOrderSync(supabase, orderId, existingSync);
    if (!claimed) return;

    const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, order_number, email, first_name, last_name, line1, line2, city, state, postal_code, country, phone, shipping_method")
        .eq("id", orderId)
        .maybeSingle();

    if (orderError) {
        await failClaimedPrintifyFulfillment("Printify fulfillment order lookup failed", {
            order_id: orderId,
            error: orderError.message,
        });
    }

    if (!order) {
        await failClaimedPrintifyFulfillment(
            "Printify fulfillment order missing after sync claim",
            {
                order_id: orderId,
            },
            "Order not found for Printify fulfillment."
        );
    }

    const typedOrder = order as OrderRow;

    const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("id, product_id, qty, sku, color_label, size_label")
        .eq("order_id", orderId);

    if (itemsError) {
        await failClaimedPrintifyFulfillment("Printify fulfillment order items lookup failed", {
            order_id: orderId,
            error: itemsError.message,
        });
    }

    const orderItems = (items ?? []) as OrderItemRow[];
    const productIds = Array.from(
        new Set(orderItems.map((item) => item.product_id).filter(Boolean) as string[])
    );

    if (!productIds.length) {
        await upsertPrintifyOrderSync(supabase, {
            order_id: orderId,
            status: "skipped",
            error_message: "Order has no product line items.",
            attempted_at: new Date().toISOString(),
        });
        return;
    }

    const { data: designs, error: designsError } = await supabase
        .from("product_designs")
        .select("product_id, artist_id, printify_product_id, printify_print_provider_id, printify_status")
        .in("product_id", productIds)
        .in("printify_status", ["not_synced", "syncing", "synced", "failed"]);

    if (designsError) {
        await failClaimedPrintifyFulfillment("Printify fulfillment product designs lookup failed", {
            order_id: orderId,
            product_ids: productIds,
            error: designsError.message,
        });
    }

    const designsToSync = ((designs ?? []) as DesignRow[]).filter(
        (design) => !design.printify_product_id || design.printify_status !== "synced"
    );

    for (const design of designsToSync) {
        try {
            await syncProductToPrintify({
                productId: design.product_id,
                artistId: design.artist_id,
                reason: "fulfillment_on_demand",
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Printify product sync failed.";
            await recordFailedSync(message);
            logger.error("Printify fulfillment product sync failed", {
                order_id: orderId,
                product_id: design.product_id,
                artist_id: design.artist_id,
                error: message,
            });
            throw new Error("Could not sync Printify product for fulfillment.");
        }
    }

    const { data: syncedDesigns, error: syncedDesignsError } = await supabase
        .from("product_designs")
        .select("product_id, artist_id, printify_product_id, printify_print_provider_id, printify_status")
        .in("product_id", productIds)
        .eq("printify_status", "synced");

    if (syncedDesignsError) {
        await failClaimedPrintifyFulfillment("Printify fulfillment synced designs lookup failed", {
            order_id: orderId,
            product_ids: productIds,
            error: syncedDesignsError.message,
        });
    }

    const designByProduct = new Map(
        ((syncedDesigns ?? []) as DesignRow[]).map((design) => [design.product_id, design])
    );
    const eligibleItems = orderItems.filter((item) => item.product_id && designByProduct.has(item.product_id));

    if (!eligibleItems.length) {
        await recordFailedSync("Order has no synced Printify products after on-demand sync.");
        throw new Error("Order has no synced Printify products after on-demand sync.");
    }

    const { data: variants, error: variantsError } = await supabase
        .from("product_printify_variants")
        .select("product_id, printify_product_id, printify_variant_id, size_label, color_label, is_enabled")
        .in("product_id", eligibleItems.map((item) => item.product_id as string));

    if (variantsError) {
        await failClaimedPrintifyFulfillment("Printify fulfillment variant mapping lookup failed", {
            order_id: orderId,
            product_ids: eligibleItems.map((item) => item.product_id),
            error: variantsError.message,
        });
    }

    const variantsByProduct = new Map<string, VariantRow[]>();
    for (const variant of (variants ?? []) as VariantRow[]) {
        variantsByProduct.set(variant.product_id, [
            ...(variantsByProduct.get(variant.product_id) ?? []),
            variant,
        ]);
    }

    const lineItems: PrintifyOrderPayload["line_items"] = [];
    for (const item of eligibleItems) {
        const productId = item.product_id as string;
        const variant = findVariant(item, variantsByProduct.get(productId) ?? []);

        if (!variant) {
            await recordFailedSync(`No Printify variant mapping for order item ${item.id}.`);
            throw new Error(`No Printify variant mapping for order item ${item.id}.`);
        }

        lineItems.push({
            product_id: variant.printify_product_id,
            variant_id: variant.printify_variant_id,
            quantity: Math.max(Number(item.qty ?? 1), 1),
            external_id: String(item.id),
        });
    }

    let addressTo: PrintifyOrderPayload["address_to"];
    try {
        addressTo = requireAddress(typedOrder);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Order address is invalid.";
        await recordFailedSync(message);
        logger.error("Printify fulfillment address validation failed", {
            order_id: orderId,
            error: message,
        });
        throw new Error("Order address is invalid for Printify fulfillment.");
    }

    const payload: PrintifyOrderPayload = {
        external_id: String(typedOrder.id),
        label: typedOrder.order_number ?? String(typedOrder.id),
        line_items: lineItems,
        shipping_method: shippingMethodCode(typedOrder.shipping_method),
        is_printify_express: false,
        is_economy_shipping: false,
        send_shipping_notification: false,
        address_to: addressTo,
    };

    await upsertPrintifyOrderSync(supabase, {
        order_id: orderId,
        status: "started",
        request_payload: payload,
        attempted_at: new Date().toISOString(),
        error_message: null,
    });

    try {
        const response = await submitPrintifyOrder(payload);
        await upsertPrintifyOrderSync(supabase, {
            order_id: orderId,
            status: "succeeded",
            printify_order_id: response.id,
            request_payload: payload,
            response_payload: response,
            succeeded_at: new Date().toISOString(),
            error_message: null,
        });
    } catch (error) {
        await upsertPrintifyOrderSync(supabase, {
            order_id: orderId,
            status: "failed",
            request_payload: payload,
            error_message: error instanceof Error ? error.message : "Printify order submission failed.",
            failed_at: new Date().toISOString(),
        });
        logger.error("Printify order submission failed", {
            order_id: orderId,
            error: error instanceof Error ? error.message : "Printify order submission failed.",
        });
        throw new Error("Could not submit Printify order.");
    }
}

function isStalePrintifyOrderSync(attemptedAt?: string | null) {
    if (!attemptedAt) return true;
    const attemptedAtMs = Date.parse(attemptedAt);
    if (!Number.isFinite(attemptedAtMs)) return true;

    return Date.now() - attemptedAtMs > PRINTIFY_ORDER_SYNC_IN_FLIGHT_MINUTES * 60 * 1000;
}
