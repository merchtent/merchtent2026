import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";
import { publicCatalogProductQuery } from "@/lib/catalog/public-product-query";
import { isPublicCategorySlug, PUBLIC_CATEGORY_SLUGS } from "@/lib/catalog/public-categories";

export const revalidate = 3600;

type ProductSitemapRow = {
    slug: string | null;
    id: string;
    created_at: string | null;
    category: string | null;
};

type ArtistSitemapRow = {
    slug: string | null;
    id: string;
};

type JournalSitemapRow = {
    slug: string;
    published_at: string | null;
    created_at: string | null;
};

function item(url: string, lastModified?: string | null): MetadataRoute.Sitemap[number] {
    return lastModified ? { url, lastModified: new Date(lastModified) } : { url };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const siteUrl = publicEnv.siteUrl();
    const staticRoutes = [
        "/",
        "/artists",
        "/new",
        "/journal",
        "/start",
        "/bundles",
        "/editors",
        "/about",
        "/contact",
        "/privacy",
        "/terms",
        "/size-guide",
        "/shipping-and-returns",
        "/sustainability",
    ].map((path) => item(`${siteUrl}${path}`));

    try {
        const supabase = getPublicServerSupabase();
        const [productsRes, artistsRes, journalRes] = await Promise.all([
            publicCatalogProductQuery(supabase
                .from("products")
                .select("id, slug, created_at, category")
            )
                .order("created_at", { ascending: false })
                .limit(5000),
            supabase
                .from("artists")
                .select("id, slug")
                .eq("is_public", true)
                .not("display_name", "is", null)
                .limit(1000),
            supabase
                .from("journal")
                .select("slug, published_at, created_at")
                .eq("status", "published")
                .order("published_at", { ascending: false })
                .limit(1000),
        ]);

        const productRoutes = ((productsRes.data ?? []) as ProductSitemapRow[])
            .filter((product) => product.slug || product.id)
            .map((product) =>
                item(`${siteUrl}/product/${product.slug ?? product.id}`, product.created_at)
            );

        const liveCategorySlugs = new Set(
            ((productsRes.data ?? []) as ProductSitemapRow[])
                .map((product) => product.category)
                .filter((category): category is string => category !== null && isPublicCategorySlug(category))
        );
        const categoryRoutes = PUBLIC_CATEGORY_SLUGS
            .filter((slug) => liveCategorySlugs.has(slug))
            .map((slug) => item(`${siteUrl}/category/${slug}`));

        const artistRoutes = ((artistsRes.data ?? []) as ArtistSitemapRow[])
            .filter((artist) => artist.slug || artist.id)
            .map((artist) => item(`${siteUrl}/artists/${artist.slug ?? artist.id}`));

        const journalRoutes = ((journalRes.data ?? []) as JournalSitemapRow[])
            .filter((entry) => entry.slug)
            .map((entry) => item(
                `${siteUrl}/journal/${entry.slug}`,
                entry.published_at ?? entry.created_at
            ));

        return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...artistRoutes, ...journalRoutes];
    } catch {
        return staticRoutes;
    }
}
