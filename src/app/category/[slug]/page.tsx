// app/category/[slug]/page.tsx
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import CategoryClient from "./CategoryClient";

export const revalidate = 60;

function publicImageUrl(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${encodeURIComponent(
        path
    )}`;
}

export default async function CategoryPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    // Pull once; client will filter/sort locally.
    const { data, error } = await supabase
        .from("products")
        .select(
            `
      id,
      title,
      price_cents,
      currency,
      is_published,
      slug,
      category,
      created_at,
      product_images ( path, sort_order ),
      product_colors ( hex, label, sort_order, front_image_path, back_image_path )
    `
        )
        .eq("is_published", true)
        .eq("category", slug)
        .order("created_at", { ascending: false });

    if (error) {
        return (
            <main className="p-6 max-w-7xl mx-auto">
                <h1 className="text-2xl font-bold">Category</h1>
                <p className="text-red-400 mt-2">Error loading products: {error.message}</p>
            </main>
        );
    }

    const products =
        (data ?? []).map((p: any) => {
            const imgs = Array.isArray(p.product_images)
                ? [...p.product_images].sort(
                    (a, b) => (a?.sort_order ?? 999) - (b?.sort_order ?? 999)
                )
                : [];

            const primary =
                publicImageUrl(imgs[0]?.path) ??
                "https://picsum.photos/seed/fallback1/900/1200";
            const hover = publicImageUrl(imgs[1]?.path) ?? primary;

            const colors = Array.isArray(p.product_colors)
                ? [...p.product_colors]
                    .sort(
                        (a, b) => (a?.sort_order ?? 999) - (b?.sort_order ?? 999)
                    )
                    .map((c: any) => ({
                        hex: c.hex ?? "#111111",
                        label: c.label ?? null,
                        front: c.front_image_path ? publicImageUrl(c.front_image_path) : primary,
                        back: c.back_image_path ? publicImageUrl(c.back_image_path) : hover,
                    }))
                : [];

            return {
                id: String(p.id),
                title: p.title ?? "Untitled",
                price: ((p.price_cents ?? 0) / 100) as number,
                image: primary,
                hover,
                slug: p.slug ?? undefined,
                colors,
                sizes: ["XS", "S", "M", "L", "XL"], // keep for ProductCard
                created_at: p.created_at as string | null,
                price_cents: p.price_cents ?? 0,
            };
        }) ?? [];

    return (
        <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
            {/* Breadcrumbs */}
            <nav className="text-xs text-neutral-400 mb-3">
                <Link href="/" className="hover:underline">Home</Link>{" "}
                / <Link href="/" className="hover:underline">Shop</Link>{" "}
                / <span className="text-neutral-200">{String(slug).toUpperCase()}</span>
            </nav>

            {/* Banner */}
            <section className="relative py-0 mb-8">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-7xl mx-auto px-4 py-6 md:py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">Shop</p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                {String(slug).toUpperCase()}
                            </h1>
                        </div>
                        <span className="text-xs bg-neutral-900 text-white px-2 py-1 rounded rotate-[-2deg]">
                            CATEGORY
                        </span>
                    </div>
                </div>
            </section>

            <CategoryClient initialProducts={products} />
        </main>
    );
}
