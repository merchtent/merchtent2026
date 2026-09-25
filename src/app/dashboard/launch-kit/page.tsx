import QRCode from "qrcode";

import { publicEnv } from "@/lib/env";
import { requireArtistPage } from "@/lib/auth/artist";
import { logger } from "@/lib/logger";
import { publicImageUrl } from "@/lib/storage";

import LaunchKitClient, { type LaunchKitProduct } from "./LaunchKitClient";

export const revalidate = 0;

type ProductRow = {
    id: string;
    title: string | null;
    description: string | null;
    slug: string | null;
    is_published: boolean | null;
    primary_image_path: string | null;
    created_at: string | null;
};

type ProductImageRow = {
    product_id: string;
    path: string | null;
    sort_order: number | null;
};

type LaunchProgressRow = {
    product_id: string;
    completed_steps: number[] | null;
};

export default async function LaunchKitPage() {
    const { supabase, artist } = await requireArtistPage();
    const { data: products, error: productsError } = await supabase
        .from("products_with_first_image")
        .select("id, title, description, slug, is_published, primary_image_path, created_at")
        .eq("artist_id", artist.id)
        .is("artist_archived_at", null)
        .order("created_at", { ascending: false });

    if (productsError) {
        logger.error("artist launch kit products failed to load", {
            artist_id: artist.id,
            error: productsError.message,
        });
    }

    const rows = (products ?? []) as ProductRow[];
    const productIds = rows.map((product) => product.id);
    const { data: imageRows, error: imagesError } = productIds.length
        ? await supabase
            .from("product_images")
            .select("product_id, path, sort_order")
            .in("product_id", productIds)
            .order("sort_order", { ascending: true })
        : { data: [], error: null };

    if (imagesError) {
        logger.error("artist launch kit images failed to load", {
            artist_id: artist.id,
            error: imagesError.message,
        });
    }

    const { data: progressRows, error: progressError } = productIds.length
        ? await supabase
            .from("launch_kit_progress")
            .select("product_id, completed_steps")
            .in("product_id", productIds)
        : { data: [], error: null };

    if (progressError) {
        logger.error("artist launch kit progress failed to load", {
            artist_id: artist.id,
            error: progressError.message,
        });
    }

    const progressByProduct = new Map(
        ((progressRows ?? []) as LaunchProgressRow[]).map((row) => [row.product_id, row.completed_steps ?? []])
    );

    const imagesByProduct = new Map<string, string[]>();
    ((imageRows ?? []) as ProductImageRow[]).forEach((image) => {
        const url = publicImageUrl(image.path);
        if (!url) return;
        imagesByProduct.set(image.product_id, [...(imagesByProduct.get(image.product_id) ?? []), url]);
    });

    const siteUrl = publicEnv.siteUrl();
    const launchProducts: LaunchKitProduct[] = await Promise.all(rows.map(async (product) => {
        const productUrl = `${siteUrl}/product/${product.slug ?? product.id}`;
        const primaryImage = publicImageUrl(product.primary_image_path);
        const images = Array.from(new Set([
            ...(primaryImage ? [primaryImage] : []),
            ...(imagesByProduct.get(product.id) ?? []),
        ]));

        return {
            id: product.id,
            title: product.title?.trim() || "Untitled drop",
            description: product.description?.trim() || null,
            isPublished: Boolean(product.is_published),
            productUrl,
            images,
            qrDataUrl: await QRCode.toDataURL(productUrl, {
                width: 720,
                margin: 3,
                color: { dark: "#000000", light: "#ffffff" },
            }),
            completedSteps: progressByProduct.get(product.id) ?? [],
        };
    }));

    return <LaunchKitClient artistName={artist.display_name} products={launchProducts} />;
}
