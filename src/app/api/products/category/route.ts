import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import "server-only";

function publicImageUrl(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${encodeURIComponent(
        path
    )}`;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") ?? "tees"; // fallback

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
        price_cents,
        currency,
        is_published,
        category,
        product_images:product_images ( path, sort_order )
      `
        )
        .eq("is_published", true)
        .eq("category", category)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json(
            { error: `Supabase select failed: ${error.message}` },
            { status: 500 }
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

            return {
                id: String(p.id),
                title: p.title as string,
                price: (p.price_cents ?? 0) / 100,
                image: primary,
                hover,
                badge: "Live",
                // colors: ["#111111", "#E5E5E5"],
                kind: "tee" as const,
            };
        }) ?? [];

    return NextResponse.json({ products }, { status: 200 });
}