import { getServiceSupabase } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

export type NotificationChannel = "email" | "sms";
export type NotificationDeliveryStatus = "sent" | "failed" | "skipped";

function errorMessage(error: unknown) {
    return error instanceof Error
        ? error.message
        : typeof error === "string"
            ? error
            : error
                ? JSON.stringify(error).slice(0, 2000)
                : null;
}

function failNotificationDelivery(message: string, details: Record<string, unknown>): never {
    logger.error(message, details);
    throw new Error("Could not reserve notification delivery.");
}

export async function reserveNotificationDelivery(input: {
    orderId: string;
    channel: NotificationChannel;
    recipient: string | null;
    idempotencyKey: string;
    provider: string;
}) {
    const supabase = getServiceSupabase();
    const now = new Date().toISOString();
    const { data: existing, error: existingError } = await supabase
        .from("notification_deliveries")
        .select("status, attempts")
        .eq("idempotency_key", input.idempotencyKey)
        .maybeSingle();

    if (existingError) {
        failNotificationDelivery("Notification delivery lookup failed", {
            order_id: input.orderId,
            channel: input.channel,
            idempotency_key: input.idempotencyKey,
            provider: input.provider,
            error: existingError.message,
        });
    }

    if (existing?.status === "sent" || existing?.status === "skipped") {
        return false;
    }

    const attempts = Number(existing?.attempts ?? 0) + 1;
    const { error } = await supabase
        .from("notification_deliveries")
        .upsert(
            {
                order_id: input.orderId,
                channel: input.channel,
                recipient: input.recipient,
                provider: input.provider,
                idempotency_key: input.idempotencyKey,
                status: "pending",
                first_attempted_at: existing ? undefined : now,
                last_attempted_at: now,
                attempts,
            },
            { onConflict: "idempotency_key" }
        );

    if (error) {
        failNotificationDelivery("Notification delivery reservation failed", {
            order_id: input.orderId,
            channel: input.channel,
            idempotency_key: input.idempotencyKey,
            provider: input.provider,
            error: error.message,
        });
    }

    return true;
}

export async function finishNotificationDelivery(
    idempotencyKey: string,
    status: NotificationDeliveryStatus,
    error?: unknown
) {
    const supabase = getServiceSupabase();
    const { error: updateError } = await supabase
        .from("notification_deliveries")
        .update({
            status,
            last_error: errorMessage(error),
            last_attempted_at: new Date().toISOString(),
            delivered_at: status === "sent" ? new Date().toISOString() : null,
        })
        .eq("idempotency_key", idempotencyKey);

    if (updateError) {
        logger.error("failed to finish notification delivery", {
            idempotency_key: idempotencyKey,
            status,
            error: updateError.message,
        });
    }
}
