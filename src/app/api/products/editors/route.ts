// app/api/products/editors/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function publicImageUrl(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${encodeURIComponent(
        path
    )}`;
}

export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || !anon) {
        return NextResponse.json(
            { error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" },
            { status: 500 }
        );
    }

    const supabase = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    // Pull only published + editors_choice. Also pull colors like the main /products API.
    const { data, error } = await supabase
        .from("products")
        .select(
            `
        id,
        title,
        slug,
        price_cents,
        currency,
        is_published,
        editors_choice,
        created_at,
        product_images:product_images ( path, sort_order ),
        product_colors:product_colors ( hex, label, sort_order, front_image_path, back_image_path ),
        artist:artists ( display_name )
      `
        )
        .eq("is_published", true)
        .eq("editors_choice", true)
        .order("created_at", { ascending: false })
        .limit(16);

    if (error) {
        return NextResponse.json(
            { error: `Supabase select failed: ${error.message}` },
            { status: 500 }
        );
    }

    const products =
        (data ?? []).map((p: any) => {
            // base images (fallbacks)
            const imgs = Array.isArray(p.product_images)
                ? [...p.product_images].sort(
                    (a, b) => (a?.sort_order ?? 999) - (b?.sort_order ?? 999)
                )
                : [];
            const primary =
                publicImageUrl(imgs[0]?.path) ??
                "https://picsum.photos/seed/fallback1/900/1200";
            const hover = publicImageUrl(imgs[1]?.path) ?? primary;

            // rich colours (same pattern as /api/products)
            const colorVariants = Array.isArray(p.product_colors)
                ? [...p.product_colors]
                    .sort(
                        (a, b) => (a?.sort_order ?? 999) - (b?.sort_order ?? 999)
                    )
                    .map((c) => ({
                        hex: c.hex,
                        label: c.label,
                        front: c.front_image_path
                            ? publicImageUrl(c.front_image_path)
                            : primary,
                        back: c.back_image_path
                            ? publicImageUrl(c.back_image_path)
                            : hover,
                    }))
                : [];

            // badge: show artist name if we have it, otherwise "Editor’s Pick"
            const artistName =
                p.artist?.display_name ??
                p.artist?.name ??
                null;

            return {
                id: String(p.id),
                title: p.title as string,
                price: (p.price_cents ?? 0) / 100,
                image: primary,
                hover,
                slug: p.slug,
                // if there’s an artist, surface that as badge, else the original label
                badge: artistName ?? "Editor’s Pick",
                colors: colorVariants,
                kind: "tee" as const,
                // we can keep the sizes baked in since the card expects it
                sizes: ["XS", "S", "M", "L", "XL"],
            };
        }) ?? [];

    return NextResponse.json({ products }, { status: 200 });
}
