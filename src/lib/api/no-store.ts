import "server-only";

import { NextResponse } from "next/server";

export const NO_STORE_HEADERS = {
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "X-Content-Type-Options": "nosniff",
} as const;

export function noStoreJson(body: Record<string, unknown>, init?: ResponseInit) {
    return NextResponse.json(body, {
        ...init,
        headers: {
            ...NO_STORE_HEADERS,
            ...init?.headers,
        },
    });
}
