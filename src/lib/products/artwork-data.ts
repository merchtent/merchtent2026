export function isDesignerArtworkPath(value: unknown): value is string {
    return typeof value === "string" && value.startsWith("designer-assets/");
}

export function collectArtworkPaths(value: unknown, paths: string[] = []): string[] {
    if (Array.isArray(value)) {
        value.forEach((item) => collectArtworkPaths(item, paths));
        return paths;
    }
    if (!value || typeof value !== "object") return paths;

    const record = value as Record<string, unknown>;
    if (record.type === "image" && isDesignerArtworkPath(record.src)) paths.push(record.src);
    Object.values(record).forEach((item) => collectArtworkPaths(item, paths));
    return paths;
}

const removedArtwork = Symbol("removedArtwork");

function stripArtwork(value: unknown, path: string): unknown | typeof removedArtwork {
    if (Array.isArray(value)) {
        return value.flatMap((item) => {
            const next = stripArtwork(item, path);
            return next === removedArtwork ? [] : [next];
        });
    }
    if (!value || typeof value !== "object") return value;

    const record = value as Record<string, unknown>;
    if (record.type === "image" && record.src === path) return removedArtwork;

    return Object.fromEntries(
        Object.entries(record).flatMap(([key, item]) => {
            const next = stripArtwork(item, path);
            return next === removedArtwork ? [] : [[key, next]];
        })
    );
}

export function removeArtworkPath(value: unknown, path: string): unknown {
    const next = stripArtwork(value, path);
    return next === removedArtwork ? null : next;
}
