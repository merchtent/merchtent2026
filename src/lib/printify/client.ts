import "server-only";
import { serverEnv } from "@/lib/env.server";
import { logger } from "@/lib/logger";

const PRINTIFY_API_BASE = "https://api.printify.com/v1";
const PRINTIFY_REQUEST_TIMEOUT_MS = 30_000;

type PrintifyRequestOptions = {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
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
        logger.error("Printify request failed before response", {
            method,
            path,
            error: error instanceof Error ? error.message : String(error),
        });
        throw new PrintifyError("Printify request failed.", 0, null);
    }

    const text = await response.text();
    const parsed = parsePrintifyResponse(text);

    if (!response.ok) {
        throw new PrintifyError(
            `Printify request failed with ${response.status}`,
            response.status,
            parsed
        );
    }

    return parsed as T;
}

function parsePrintifyResponse(text: string) {
    if (!text) return null;

    try {
        return JSON.parse(text) as unknown;
    } catch {
        return text;
    }
}

export function printifyShopId() {
    return serverEnv.printifyShopId();
}
