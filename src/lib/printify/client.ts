import "server-only";
import { serverEnv } from "@/lib/env.server";
import { logger } from "@/lib/logger";
import { getServiceSupabase } from "@/lib/supabase/service";

const PRINTIFY_API_BASE = "https://api.printify.com/v1";
const PRINTIFY_REQUEST_TIMEOUT_MS = 30_000;
const PRINTIFY_GLOBAL_LIMIT_PER_MINUTE = 540;
const PRINTIFY_CATALOG_LIMIT_PER_MINUTE = 90;
const PRINTIFY_PRODUCT_MUTATION_LIMIT_PER_30_MINUTES = 180;
const PRINTIFY_MAX_RETRIES = 1;
const PRINTIFY_RETRY_BASE_DELAY_MS = 1_500;

type PrintifyRequestOptions = {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
};

type PrintifyEndpointGroup = "catalog" | "product_mutation" | "order" | "upload" | "other";

type RollingBucket = {
    limit: number;
    windowMs: number;
    timestamps: number[];
};

const printifyBuckets: Record<string, RollingBucket> = {
    global: {
        limit: PRINTIFY_GLOBAL_LIMIT_PER_MINUTE,
        windowMs: 60_000,
        timestamps: [],
    },
    catalog: {
        limit: PRINTIFY_CATALOG_LIMIT_PER_MINUTE,
        windowMs: 60_000,
        timestamps: [],
    },
    productMutation: {
        limit: PRINTIFY_PRODUCT_MUTATION_LIMIT_PER_30_MINUTES,
        windowMs: 30 * 60_000,
        timestamps: [],
    },
};

export class PrintifyError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly responseBody: unknown
    ) {
        super(message);
        this.name = "PrintifyError";
    }
}

export async function printifyRequest<T>(
    path: string,
    { method = "GET", body }: PrintifyRequestOptions = {}
) {
    const endpointGroup = classifyPrintifyEndpoint(path, method);

    for (let attempt = 1; attempt <= PRINTIFY_MAX_RETRIES + 1; attempt++) {
        await enforcePrintifyRateLimit(endpointGroup);

        const startedAt = Date.now();
        let response: Response;

        try {
            response = await fetch(`${PRINTIFY_API_BASE}${path}`, {
                method,
                headers: {
                    Authorization: `Bearer ${serverEnv.printifyApiToken()}`,
                    "Content-Type": "application/json;charset=utf-8",
                    "User-Agent": "MerchTent/1.0",
                },
                body: body ? JSON.stringify(body) : undefined,
                cache: "no-store",
                signal: AbortSignal.timeout(PRINTIFY_REQUEST_TIMEOUT_MS),
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            logger.error("Printify request failed before response", {
                method,
                path,
                endpoint_group: endpointGroup,
                attempt,
                error: message,
            });
            await recordPrintifyApiEvent({
                endpointGroup,
                method,
                path,
                statusCode: null,
                ok: false,
                durationMs: Date.now() - startedAt,
                attempt,
                rateLimited: false,
                errorMessage: message,
            });
            throw new PrintifyError("Printify request failed.", 0, null);
        }

        const text = await response.text();
        const parsed = parsePrintifyResponse(text);
        const durationMs = Date.now() - startedAt;
        const rateLimited = response.status === 429;

        await recordPrintifyApiEvent({
            endpointGroup,
            method,
            path,
            statusCode: response.status,
            ok: response.ok,
            durationMs,
            attempt,
            rateLimited,
            errorMessage: response.ok ? null : `Printify request failed with ${response.status}`,
        });

        if (response.ok) {
            return parsed as T;
        }

        if (rateLimited && attempt <= PRINTIFY_MAX_RETRIES) {
            const retryDelayMs = retryDelayFromHeader(response.headers.get("retry-after")) ?? PRINTIFY_RETRY_BASE_DELAY_MS;
            logger.warn("Printify rate limit response received; retrying after delay", {
                method,
                path,
                endpoint_group: endpointGroup,
                attempt,
                retry_delay_ms: retryDelayMs,
            });
            await sleep(retryDelayMs);
            continue;
        }

        throw new PrintifyError(
            rateLimited ? "Printify rate limit exceeded." : `Printify request failed with ${response.status}`,
            response.status,
            parsed
        );
    }

    throw new PrintifyError("Printify request failed.", 0, null);
}

function parsePrintifyResponse(text: string) {
    if (!text) return null;

    try {
        return JSON.parse(text) as unknown;
    } catch {
        return text;
    }
}

function classifyPrintifyEndpoint(path: string, method: PrintifyRequestOptions["method"]): PrintifyEndpointGroup {
    if (path.startsWith("/catalog/")) return "catalog";
    if (path.startsWith("/uploads/")) return "upload";
    if (path.includes("/orders")) return "order";
    if (method !== "GET" && path.includes("/products")) return "product_mutation";

    return "other";
}

async function enforcePrintifyRateLimit(endpointGroup: PrintifyEndpointGroup) {
    await waitForBucket(printifyBuckets.global);

    if (endpointGroup === "catalog") {
        await waitForBucket(printifyBuckets.catalog);
    }

    if (endpointGroup === "product_mutation" || endpointGroup === "upload") {
        await waitForBucket(printifyBuckets.productMutation);
    }
}

async function waitForBucket(bucket: RollingBucket) {
    while (true) {
        const now = Date.now();
        bucket.timestamps = bucket.timestamps.filter((timestamp) => now - timestamp < bucket.windowMs);

        if (bucket.timestamps.length < bucket.limit) {
            bucket.timestamps.push(now);
            return;
        }

        const oldestTimestamp = bucket.timestamps[0] ?? now;
        const delayMs = Math.max(oldestTimestamp + bucket.windowMs - now + 25, 250);
        await sleep(delayMs);
    }
}

function retryDelayFromHeader(value: string | null) {
    if (!value) return null;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) {
        return Math.min(Math.max(seconds * 1000, 500), 60_000);
    }

    const dateMs = Date.parse(value);
    if (!Number.isFinite(dateMs)) return null;

    return Math.min(Math.max(dateMs - Date.now(), 500), 60_000);
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function recordPrintifyApiEvent(input: {
    endpointGroup: PrintifyEndpointGroup;
    method: "GET" | "POST" | "PUT" | "DELETE";
    path: string;
    statusCode: number | null;
    ok: boolean;
    durationMs: number;
    attempt: number;
    rateLimited: boolean;
    errorMessage: string | null;
}) {
    try {
        const { error } = await getServiceSupabase().from("printify_api_events").insert({
            endpoint_group: input.endpointGroup,
            method: input.method,
            path: redactPrintifyPath(input.path),
            status_code: input.statusCode,
            ok: input.ok,
            duration_ms: input.durationMs,
            attempt: input.attempt,
            rate_limited: input.rateLimited,
            error_message: input.errorMessage,
        });

        if (error) {
            logger.warn("Printify API event audit write failed", {
                endpoint_group: input.endpointGroup,
                status_code: input.statusCode,
                error: error.message,
            });
        }
    } catch (error) {
        logger.warn("Printify API event audit write threw", {
            endpoint_group: input.endpointGroup,
            status_code: input.statusCode,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

function redactPrintifyPath(path: string) {
    return path.replace(/\/shops\/[^/]+/g, "/shops/[shop]").slice(0, 500);
}

export function printifyShopId() {
    return serverEnv.printifyShopId();
}
