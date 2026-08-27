import "server-only";

import { recordPlatformEvent } from "@/lib/platform-events";

type AdminExportAuditInput = {
    actorUserId: string;
    exportName: string;
    rowCount: number;
    metadata?: Record<string, unknown>;
};

export async function recordAdminExportAuditEvent({
    actorUserId,
    exportName,
    rowCount,
    metadata = {},
}: AdminExportAuditInput) {
    await recordPlatformEvent(
        {
            scope: "admin_export",
            action: `${exportName}_csv_exported`,
            severity: "info",
            actorUserId,
            message: "Admin exported CSV data.",
            metadata: {
                export_name: exportName,
                row_count: rowCount,
                ...metadata,
            },
        },
        {
            failureLogMessage: "Admin export audit event failed",
            failureContext: {
                actor_user_id: actorUserId,
                export_name: exportName,
                row_count: rowCount,
            },
            throwOnFailure: true,
            failurePublicMessage: "Could not audit admin export.",
        }
    );
}
