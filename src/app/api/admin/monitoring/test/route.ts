export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import * as Sentry from "@sentry/nextjs";
import { noStoreJson } from "@/lib/api/no-store";
import { requireAdmin } from "@/lib/auth/admin";

export async function POST(request: Request) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    const eventId = Sentry.captureMessage("Merch Tent production monitoring test", {
        level: "error",
        tags: {
            source: "admin_monitoring_test",
            actor_role: "admin",
        },
        extra: {
            actor_user_id: "redacted",
            expected: true,
        },
    });

    await Sentry.flush(2000);
    return noStoreJson({ ok: true, eventId });
}
