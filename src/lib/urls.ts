const EXTERNAL_URL_PROTOCOLS = new Set(["http:", "https:"]);
const URL_PROTOCOL_PATTERN = /^[a-z][a-z\d+.-]*:/i;

export function normaliseExternalUrl(value: unknown): string | null {
    if (typeof value !== "string") return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    const candidate = URL_PROTOCOL_PATTERN.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;

    try {
        const url = new URL(candidate);

        if (!EXTERNAL_URL_PROTOCOLS.has(url.protocol)) return null;
        if (!url.hostname || !url.hostname.includes(".")) return null;

        return url.toString();
    } catch {
        return null;
    }
}
