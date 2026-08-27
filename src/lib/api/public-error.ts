import { NextResponse } from "next/server";
import { noStoreJson } from "@/lib/api/no-store";
import { logger } from "@/lib/logger";

const DEFAULT_PUBLIC_CACHE_SECONDS = 60;
const DEFAULT_STALE_REVALIDATE_SECONDS = 300;

type PublicApiError = {
    message: string;
};

export function publicApiJson<T>(
    payload: T,
    init: ResponseInit = {},
    cacheSeconds = DEFAULT_PUBLIC_CACHE_SECONDS
) {
    const headers = new Headers(init.headers);
    if (!headers.has("Cache-Control")) {
        headers.set(
            "Cache-Control",
            `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${DEFAULT_STALE_REVALIDATE_SECONDS}`
        );
    }
    if (!headers.has("Vary")) {
        headers.set("Vary", "Accept");
    }
    if (!headers.has("X-Content-Type-Options")) {
        headers.set("X-Content-Type-Options", "nosniff");
    }

    return NextResponse.json(payload, {
        ...init,
        headers,
    });
}

export function publicApiError(
    route: string,
    error: PublicApiError,
    message = "Could not load public catalog data."
) {
    logger.error("public api query failed", {
        route,
        error: error.message,
    });

    return noStoreJson({ error: message }, { status: 500 });
}
