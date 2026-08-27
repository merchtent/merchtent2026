const URL_KEYS = new Set(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SITE_URL"]);

export function requireEnv(key: string) {
    const value = process.env[key];
    if (!value || value.trim().length === 0) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

export function optionalEnv(key: string) {
    const value = process.env[key];
    return value && value.trim().length > 0 ? value : null;
}

export function optionalEnvWithDefault(key: string, fallback: string) {
    return optionalEnv(key) ?? fallback;
}

export function optionalIntegerEnv(key: string) {
    const value = optionalEnv(key);
    if (!value) return null;

    const parsed = parseStrictInteger(value);
    if (parsed === null) {
        throw new Error(`Environment variable ${key} must be an integer`);
    }
    return parsed;
}

export function optionalIntegerListEnv(key: string) {
    const value = optionalEnv(key);
    if (!value) return null;

    const entries = value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);

    const parsed = entries.map(parseStrictInteger);
    if (!parsed.length || parsed.some((entry) => entry === null)) {
        throw new Error(`Environment variable ${key} must be a comma-separated list of integers`);
    }
    return parsed.filter((entry): entry is number => entry !== null);
}

export function requireUrlEnv(key: string) {
    const value = requireEnv(key);
    if (!URL_KEYS.has(key)) return value;

    try {
        return new URL(value).toString().replace(/\/$/, "");
    } catch {
        throw new Error(`Environment variable ${key} must be a valid URL`);
    }
}

export const publicEnv = {
    supabaseUrl: () => normalisePublicUrl("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: () => requirePublicValue("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    siteUrl: () => normalisePublicUrl("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL),
};

function requirePublicValue(key: string, value: string | undefined) {
    if (!value || value.trim().length === 0) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

function normalisePublicUrl(key: string, value: string | undefined) {
    const required = requirePublicValue(key, value);

    try {
        return new URL(required).toString().replace(/\/$/, "");
    } catch {
        throw new Error(`Environment variable ${key} must be a valid URL`);
    }
}

function parseStrictInteger(value: string) {
    if (!/^\d+$/.test(value.trim())) return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
}
