type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const SENSITIVE_KEY_PATTERN =
    /(authorization|cookie|email|password|phone|recipient|secret|service[_-]?role|token|api[_-]?key|stripe[_-]?(account|session|payment[_-]?intent|transfer)[_-]?id|session[_-]?id|user[_-]?id|actor[_-]?user[_-]?id|admin[_-]?user[_-]?id)/i;

const SENSITIVE_VALUE_PATTERNS: Array<[RegExp, string]> = [
    [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]"],
    [/\bBearer\s+[A-Za-z0-9._~+/=-]+\b/gi, "Bearer [REDACTED]"],
    [/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9_]+\b/g, "[REDACTED_STRIPE_SECRET]"],
    [/\bwhsec_[A-Za-z0-9_]+\b/g, "[REDACTED_STRIPE_WEBHOOK_SECRET]"],
    [/\b(?:eyJ[A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED_JWT]"],
];

function writeLog(level: LogLevel, message: string, context?: LogContext) {
    const payload = {
        level,
        message: redactLogString(message),
        context: redactLogValue(context ?? {}),
        timestamp: new Date().toISOString(),
    };

    const line = JSON.stringify(payload);

    if (level === "error") {
        console.error(line);
    } else if (level === "warn") {
        console.warn(line);
    } else {
        console.info(line);
    }
}

function redactLogValue(value: unknown, seen = new WeakSet<object>()): unknown {
    if (typeof value === "string") return redactLogString(value);
    if (!value || typeof value !== "object") return value;

    if (seen.has(value)) return "[Circular]";
    seen.add(value);

    if (Array.isArray(value)) {
        return value.map((item) => redactLogValue(item, seen));
    }

    return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
            key,
            SENSITIVE_KEY_PATTERN.test(key)
                ? "[REDACTED]"
                : redactLogValue(entry, seen),
        ])
    );
}

function redactLogString(value: string) {
    return SENSITIVE_VALUE_PATTERNS.reduce(
        (redacted, [pattern, replacement]) => redacted.replace(pattern, replacement),
        value
    );
}

export const logger = {
    debug(message: string, context?: LogContext) {
        if (process.env.NODE_ENV !== "production") {
            writeLog("debug", message, context);
        }
    },
    info(message: string, context?: LogContext) {
        writeLog("info", message, context);
    },
    warn(message: string, context?: LogContext) {
        writeLog("warn", message, context);
    },
    error(message: string, context?: LogContext) {
        writeLog("error", message, context);
    },
};
