import "server-only";
import { recordPlatformEvent, type PlatformEventSeverity } from "@/lib/platform-events";

type AdminContentAuditInput = {
    actorUserId: string;
    action: string;
    message: string;
    severity?: PlatformEventSeverity;
    artistId?: string | null;
    productId?: string | null;
    externalId?: string | null;
    metadata?: Record<string, unknown>;
};

export async function logAdminContentEvent(input: AdminContentAuditInput) {
    await recordPlatformEvent(
        {
            scope: "admin_content",
            action: input.action,
            severity: input.severity ?? "info",
            actorUserId: input.actorUserId,
            artistId: input.artistId ?? null,
            productId: input.productId ?? null,
            externalId: input.externalId ?? null,
            message: input.message,
            metadata: input.metadata ?? {},
        },
        {
            failureLogMessage: "Admin content platform event failed",
            failureContext: {
                actor_user_id: input.actorUserId,
                artist_id: input.artistId ?? null,
                product_id: input.productId ?? null,
                external_id: input.externalId ?? null,
            },
            throwOnFailure: true,
            failurePublicMessage: "Could not audit admin content change.",
        }
    );
}
