// app/api/products/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import "server-only";

function publicImageUrl(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${encodeURIComponent(
        path
    )}`;
}

export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
        return NextResponse.json(
            {
                error:
                    "Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)",
            },
            { status: 500 }
        );
    }

    const supabase = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

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
        product_images:product_images ( path, sort_order ),
        product_colors:product_colors ( hex, label, sort_order, front_image_path, back_image_path ),
        artist:artists ( display_name )
      `
        )
        .eq("is_published", true)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json(
            { error: `Supabase select failed: ${error.message}` },
            { status: 500 }
        );
    }

    const products =
        (data ?? []).map((p: any) => {
            // base images (fallback)
            const imgs = Array.isArray(p.product_images)
                ? [...p.product_images].sort(
                    (a, b) => (a?.sort_order ?? 999) - (b?.sort_order ?? 999)
                )
                : [];
            const primary =
                publicImageUrl(imgs[0]?.path) ??
                "https://picsum.photos/seed/fallback1/900/1200";
            const hover = publicImageUrl(imgs[1]?.path) ?? primary;

            // richer colours
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

            // 👇 badge = artist name
            const artistName =
                p.artist?.display_name ??
                p.artist?.name ?? // just in case
                "Artist";

            return {
                id: String(p.id),
                title: p.title as string,
                price: (p.price_cents ?? 0) / 100,
                image: primary,
                hover,
                slug: p.slug,
                badge: artistName,
                colors: colorVariants,
                kind: "tee" as const,
                sizes: ["XS", "S", "M", "L", "XL"], // 👈 add this if the product should be sizeable
            };
        }) ?? [];

    return NextResponse.json({ products }, { status: 200 });
}
