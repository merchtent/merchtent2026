import Link from "next/link";
import CategoryClient from "./CategoryClient";
import { publicImageUrl, publicStorageUrl } from "@/lib/storage";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";
import { logger } from "@/lib/logger";
import { publicCatalogProductQuery } from "@/lib/catalog/public-product-query";

export const revalidate = 60;

type ProductImageRow = {
    path?: string | null;
    sort_order?: number | null;
};

type ProductArtistRow = {
    display_name?: string | null;
    slug?: string | null;
    hero_image_path?: string | null;
};

type ProductRow = {
    id: string;
    title?: string | null;
    price_cents?: number | null;
    slug?: string | null;
    created_at?: string | null;
    product_images?: ProductImageRow[] | null;
    artist?: ProductArtistRow | null;
};

export default async function CategoryPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const supabase = getPublicServerSupabase();

    const { data, error } = await publicCatalogProductQuery(supabase
        .from("products")
        .select(`
            id,
            title,
            price_cents,
            slug,
            category,
            created_at,
            product_images ( path, sort_order ),
            artist:artists (
                display_name,
                slug,
                hero_image_path
            )
        `)
    )
        .eq("category", slug)
        .order("created_at", { ascending: false });

    if (error) {
        logger.error("Category page failed to load products", {
            category: slug,
            error: error.message,
        });

        return (
            <main className="p-6 max-w-7xl mx-auto">
                <p className="text-red-400">Could not load this category right now.</p>
            </main>
        );
    }

    const products = ((data ?? []) as ProductRow[]).map((p) => {
        const imgs = (p.product_images ?? []).sort(
            (a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999)
        );

        const primary = publicImageUrl(imgs[0]?.path);
        const hover = publicImageUrl(imgs[1]?.path) ?? primary;

        return {
            id: String(p.id),
            title: p.title ?? "Untitled product",
            price: (p.price_cents ?? 0) / 100,
            image: primary,
            hover,
            slug: p.slug ?? String(p.id),

            // ✅ ARTIST DATA
            artist: p.artist?.display_name ?? null,
            artist_slug: p.artist?.slug ?? null,
            artist_image: publicStorageUrl("artist-images", p.artist?.hero_image_path),

            created_at: p.created_at ?? undefined,
        };
    });

    const title = String(slug).replace(/-/g, " ").toUpperCase();

    return (
        <main className="bg-black text-neutral-100">
            <section className="border-b border-neutral-800 bg-neutral-950">
                <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
                    <nav className="mb-6 text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                        <Link href="/" className="hover:text-white">Home</Link>
                        <span className="mx-2 text-red-500">/</span>
                        <span className="text-neutral-200">{title}</span>
                    </nav>

                    <div className="grid gap-6 border border-neutral-800 bg-black p-5 md:grid-cols-[1fr_auto] md:items-end md:p-7">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-500">
                                Shop the rack
                            </p>
                            <h1 className="mt-2 text-5xl font-black uppercase leading-none md:text-7xl">
                                {title}
                            </h1>
                        </div>

                        <p className="max-w-sm border-l border-neutral-800 pl-4 text-sm text-neutral-300">
                            Made after sale. No dead stock. Artists paid per order.
                        </p>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
                <CategoryClient initialProducts={products} />
            </section>
        </main>
    );
}
