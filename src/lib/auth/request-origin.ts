import "server-only";

import { noStoreJson } from "@/lib/api/no-store";

export function rejectCrossOriginRequest(req: Request) {
    const origin = req.headers.get("origin");
    if (!origin) return null;

    const forwardedHost = req.headers.get("x-forwarded-host");
    const host = forwardedHost ?? req.headers.get("host");
    if (!host) return noStoreJson({ error: "Forbidden" }, { status: 403 });

    try {
        const originUrl = new URL(origin);
        if (originUrl.host === host) return null;
    } catch {
        return noStoreJson({ error: "Forbidden" }, { status: 403 });
    }

    return noStoreJson({ error: "Forbidden" }, { status: 403 });
}
