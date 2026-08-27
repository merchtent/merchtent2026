import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";
import { publicCatalogProductQuery } from "@/lib/catalog/public-product-query";

export const revalidate = 3600;

type ProductSitemapRow = {
    slug: string | null;
    id: string;
    created_at: string | null;
};

type ArtistSitemapRow = {
    slug: string | null;
    id: string;
};

type JournalSitemapRow = {
    slug: string | null;
    created_at: string | null;
    published_at: string | null;
};

function item(url: string, lastModified?: string | null): MetadataRoute.Sitemap[number] {
    return {
        url,
        lastModified: lastModified ? new Date(lastModified) : new Date(),
    };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const siteUrl = publicEnv.siteUrl();
    const staticRoutes = [
        "/",
        "/artists",
        "/categories/artists",
        "/new",
        "/editors",
        "/about",
        "/contact",
        "/size-guide",
        "/shipping-and-returns",
        "/sustainability",
    ].map((path) => item(`${siteUrl}${path}`));

    try {
        const supabase = getPublicServerSupabase();
        const [productsRes, artistsRes, journalRes] = await Promise.all([
            publicCatalogProductQuery(supabase
                .from("products")
                .select("id, slug, created_at")
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
                .select("slug, created_at, published_at")
                .eq("status", "published")
                .order("published_at", { ascending: false })
                .limit(1000),
        ]);

        const productRoutes = ((productsRes.data ?? []) as ProductSitemapRow[])
            .filter((product) => product.slug || product.id)
            .map((product) =>
                item(`${siteUrl}/product/${product.slug ?? product.id}`, product.created_at)
            );

        const artistRoutes = ((artistsRes.data ?? []) as ArtistSitemapRow[])
            .filter((artist) => artist.slug || artist.id)
            .map((artist) => item(`${siteUrl}/artists/${artist.slug ?? artist.id}`));

        const journalRoutes = ((journalRes.data ?? []) as JournalSitemapRow[])
            .filter((post) => post.slug)
            .map((post) => item(`${siteUrl}/journal/${post.slug}`, post.published_at ?? post.created_at));

        return [...staticRoutes, ...productRoutes, ...artistRoutes, ...journalRoutes];
    } catch {
        return staticRoutes;
    }
}
