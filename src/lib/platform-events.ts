import "server-only";

import { logger } from "@/lib/logger";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { getServerSupabase } from "@/lib/supabase/server";

export type PlatformEventSeverity = "debug" | "info" | "warning" | "error" | "critical";

type PlatformEventInput = {
    scope: string;
    action: string;
    severity?: PlatformEventSeverity;
    actorUserId?: string | null;
    orderId?: string | null;
    artistId?: string | null;
    productId?: string | null;
    fulfillmentJobId?: string | null;
    externalId?: string | null;
    message?: string | null;
    metadata?: Record<string, unknown>;
};

type RecordPlatformEventOptions = {
    supabase?: ReturnType<typeof getServiceSupabase> | ReturnType<typeof getServerSupabase>;
    failureLogMessage?: string;
    failureContext?: Record<string, unknown>;
    throwOnFailure?: boolean;
    failurePublicMessage?: string;
};

export async function recordPlatformEvent(
    input: PlatformEventInput,
    options: RecordPlatformEventOptions = {}
) {
    const supabase = options.supabase ?? getServiceSupabase();
    const { error } = await (supabase as ReturnType<typeof getServiceSupabase>).rpc(
        "log_platform_event",
        {
            p_scope: input.scope,
            p_action: input.action,
            p_severity: input.severity ?? "info",
            p_actor_user_id: input.actorUserId ?? null,
            p_order_id: input.orderId ?? null,
            p_artist_id: input.artistId ?? null,
            p_product_id: input.productId ?? null,
            p_fulfillment_job_id: input.fulfillmentJobId ?? null,
            p_external_id: input.externalId ?? null,
            p_message: input.message ?? null,
            p_metadata: input.metadata ?? {},
        }
    );

    if (!error) return { ok: true as const };

    logger.error(options.failureLogMessage ?? "Platform event write failed", {
        scope: input.scope,
        action: input.action,
        ...options.failureContext,
        error: error.message,
    });

    if (options.throwOnFailure) {
        throw new Error(options.failurePublicMessage ?? "Could not record platform event.");
    }

    return { ok: false as const, error };
}
