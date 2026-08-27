import { createHash } from "crypto";
import { logger } from "@/lib/logger";

type Bucket = {
    count: number;
    resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }

    if (current.count >= limit) {
        return false;
    }

    current.count += 1;
    return true;
}

type RateLimitRpcClient = {
    rpc: (
        name: "check_rate_limit" | "check_public_rate_limit",
        args: {
            p_key: string;
            p_limit: number;
            p_window_seconds: number;
        }
    ) => PromiseLike<{ data: boolean | null; error: { message: string } | null }>;
};

function rateLimitLogContext(key: string) {
    const prefix = key.split(":")[0] || "unknown";
    return {
        key_prefix: prefix,
        key_hash: createHash("sha256").update(key).digest("hex").slice(0, 16),
    };
}

export async function checkDurableRateLimit(
    supabase: RateLimitRpcClient,
    key: string,
    limit: number,
    windowMs: number,
    rpcName: "check_rate_limit" | "check_public_rate_limit" = "check_rate_limit",
    options: { fallback?: "local" | "deny" } = {}
) {
    const { data, error } = await supabase.rpc(rpcName, {
        p_key: key,
        p_limit: limit,
        p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
    });

    if (error) {
        logger.error("durable rate limit failed", {
            ...rateLimitLogContext(key),
            fallback: options.fallback ?? "local",
            error: error.message,
        });
        if (options.fallback === "deny") {
            return false;
        }
        return checkRateLimit(key, limit, windowMs);
    }

    return data === true;
}
