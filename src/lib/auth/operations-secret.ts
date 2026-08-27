import "server-only";

import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";

export function hasValidOperationalSecret(request: NextRequest, expectedSecret: string) {
    const providedSecret =
        request.headers.get("x-merch-tent-ops-secret") ??
        request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
        "";

    if (!providedSecret) return false;

    const expected = Buffer.from(expectedSecret);
    const provided = Buffer.from(providedSecret);

    return expected.length === provided.length && timingSafeEqual(expected, provided);
}
