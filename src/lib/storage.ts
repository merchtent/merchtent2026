import { publicEnv } from "@/lib/env";

export type PublicStorageBucket =
    | "artist-images"
    | "backstage-polaroids"
    | "journal-images"
    | "product-images";

export function publicStorageUrl(bucket: PublicStorageBucket, path?: string | null) {
    if (!path) return null;

    const url = publicEnv.supabaseUrl();
    return `${url}/storage/v1/object/public/${bucket}/${encodeStoragePath(path)}`;
}

export function publicImageUrl(path?: string | null) {
    return publicStorageUrl("product-images", path);
}

export function publicProductImageUrlOrSource(source?: string | null) {
    if (!source) return null;
    if (source.startsWith("http://") || source.startsWith("https://")) return source;
    return publicImageUrl(source);
}

export function publicStorageUrlOrSource(bucket: PublicStorageBucket, source?: string | null) {
    if (!source) return null;
    if (source.startsWith("http://") || source.startsWith("https://")) return source;
    return publicStorageUrl(bucket, source);
}

function encodeStoragePath(path: string) {
    return path
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
}
