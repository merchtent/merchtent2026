import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import CategoryClient from "./CategoryClient";

export const revalidate = 60;

function productImage(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}

function artistImage(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artist-images/${path}`;
}

export default async function CategoryPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data, error } = await supabase
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
        .eq("is_published", true)
        .eq("category", slug)
        .order("created_at", { ascending: false });

    if (error) {
        return (
            <main className="p-6 max-w-7xl mx-auto">
                <p className="text-red-400">{error.message}</p>
            </main>
        );
    }

    const products = (data ?? []).map((p: any) => {
        const imgs = (p.product_images ?? []).sort(
            (a: any, b: any) => (a.sort_order ?? 999) - (b.sort_order ?? 999)
        );

        const primary = productImage(imgs[0]?.path);
        const hover = productImage(imgs[1]?.path) ?? primary;

        return {
            id: String(p.id),
            title: p.title,
            price: (p.price_cents ?? 0) / 100,
            image: primary,
            hover,
            slug: p.slug,

            // ✅ ARTIST DATA
            artist: p.artist?.display_name ?? null,
            artist_slug: p.artist?.slug ?? null,
            artist_image: artistImage(p.artist?.hero_image_path),

            created_at: p.created_at,
        };
    });

    return (
        <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">

            <nav className="text-xs text-neutral-400 mb-3">
                <Link href="/">Home</Link> /{" "}
                <span className="text-neutral-200">
                    {String(slug).toUpperCase()}
                </span>
            </nav>

            <section className="mb-8">
                <h1 className="text-3xl md:text-4xl font-black">
                    {String(slug).toUpperCase()}
                </h1>

                <p className="text-sm text-neutral-400 mt-2">
                    Print on demand • No waste • Artists paid per sale
                </p>
            </section>

            <CategoryClient initialProducts={products} />
        </main>
    );
}