// src/lib/storage.ts
export function publicImageUrl(path: string) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    return `${url}/storage/v1/object/public/product-images/${encodeURIComponent(path)}`;
}
