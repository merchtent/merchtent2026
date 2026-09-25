import "server-only";

import { getServerSupabase } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/storage";
import { collectArtworkPaths } from "@/lib/products/artwork-data";
import { isProductRestorable } from "@/lib/products/archive-retention";

export type ArtistArtworkAsset = {
    path: string;
    previewUrl: string;
};

export type ArtistArtworkUsage = {
    productId: string;
    title: string;
    isPublished: boolean;
    isArchived: boolean;
    archivedAt: string | null;
    isRecoverable: boolean;
};

export type ArtistArtworkGalleryAsset = ArtistArtworkAsset & {
    lastUsedAt: string | null;
    usages: ArtistArtworkUsage[];
    canRemove: boolean;
};

type SavedDesignRow = {
    product_id: string;
    design_data: unknown;
    updated_at: string | null;
};

type ProductRow = {
    id: string;
    title: string | null;
    is_published: boolean | null;
    artist_archived_at: string | null;
};

async function loadArtworkRows(artistId: string) {
    const supabase = getServerSupabase();
    const [{ data: designs, error: designError }, { data: products, error: productError }] = await Promise.all([
        supabase
            .from("product_designs")
            .select("product_id, design_data, updated_at")
            .eq("artist_id", artistId)
            .order("updated_at", { ascending: false }),
        supabase
            .from("products")
            .select("id, title, is_published, artist_archived_at")
            .eq("artist_id", artistId),
    ]);

    if (designError || productError) return null;
    return {
        designs: (designs ?? []) as SavedDesignRow[],
        products: (products ?? []) as ProductRow[],
    };
}

export async function listArtistArtworkLibrary(artistId: string, limit = 12): Promise<ArtistArtworkAsset[]> {
    const rows = await loadArtworkRows(artistId);
    if (!rows) return [];

    const paths = rows.designs.flatMap((row) => collectArtworkPaths(row.design_data));
    return Array.from(new Set(paths))
        .slice(0, limit)
        .flatMap((path) => {
            const previewUrl = publicImageUrl(path);
            return previewUrl ? [{ path, previewUrl }] : [];
        });
}

export async function listArtistArtworkGallery(artistId: string): Promise<ArtistArtworkGalleryAsset[]> {
    const rows = await loadArtworkRows(artistId);
    if (!rows) throw new Error("Artwork gallery query failed.");

    const products = new Map(rows.products.map((product) => [product.id, product]));
    const assets = new Map<string, ArtistArtworkGalleryAsset>();

    for (const design of rows.designs) {
        const product = products.get(design.product_id);
        if (!product) continue;

        for (const path of collectArtworkPaths(design.design_data)) {
            const previewUrl = publicImageUrl(path);
            if (!previewUrl) continue;

            const usage: ArtistArtworkUsage = {
                productId: product.id,
                title: product.title?.trim() || "Untitled product",
                isPublished: Boolean(product.is_published),
                isArchived: Boolean(product.artist_archived_at),
                archivedAt: product.artist_archived_at,
                isRecoverable: product.artist_archived_at
                    ? isProductRestorable(product.artist_archived_at)
                    : false,
            };
            const existing = assets.get(path);
            if (existing) {
                if (!existing.usages.some((item) => item.productId === usage.productId)) existing.usages.push(usage);
                continue;
            }

            assets.set(path, {
                path,
                previewUrl,
                lastUsedAt: design.updated_at,
                usages: [usage],
                canRemove: false,
            });
        }
    }

    return Array.from(assets.values()).map((asset) => ({
        ...asset,
        canRemove: asset.usages.length > 0 && asset.usages.every((usage) =>
            usage.isArchived && !usage.isPublished && !usage.isRecoverable
        ),
    }));
}
