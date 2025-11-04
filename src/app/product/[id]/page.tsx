// app/product/[id]/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import ProductViewClient from "../ProductViewClient";

export const revalidate = 60;

function publicImageUrl(path: string) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${encodeURIComponent(
        path
    )}`;
}

function formatCurrency(cents: number, currency: string) {
    try {
        return new Intl.NumberFormat("en-AU", {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
        }).format((cents ?? 0) / 100);
    } catch {
        return (cents / 100).toLocaleString(undefined, {
            style: "currency",
            currency,
        });
    }
}

function looksLikeUUID(str: string) {
    return /^[0-9a-fA-F-]{32,36}$/.test(str);
}

export default async function ProductPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: idOrSlug } = await params;
    const supabase = getServerSupabase();

    // try by slug first
    let { data: product, error } = await supabase
        .from("products_with_first_image")
        .select(
            "id, slug, title, description, price_cents, currency, primary_image_path"
        )
        .eq("slug", idOrSlug)
        .maybeSingle();

    if ((!product || error) && looksLikeUUID(idOrSlug)) {
        const byId = await supabase
            .from("products_with_first_image")
            .select(
                "id, slug, title, description, price_cents, currency, primary_image_path"
            )
            .eq("id", idOrSlug)
            .maybeSingle();
        product = byId.data ?? null;
        error = byId.error ?? null;
    }



    if (error || !product) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-black">Product not found</h1>
                    <Link href="/" className="underline text-sm">
                        Back to shop
                    </Link>
                </div>
            </main>
        );
    }

    // gallery
    const { data: galleryRows } =
        (await supabase
            .from("product_images")
            .select("image_path, position")
            .eq("product_id", product.id)
            .order("position", { ascending: true })) || {};

    const galleryUrls: string[] =
        Array.isArray(galleryRows) && galleryRows.length
            ? galleryRows.map((g) => publicImageUrl(g.image_path))
            : product.primary_image_path
                ? [publicImageUrl(product.primary_image_path)]
                : [];

    // colors
    const { data: colorRows } = await supabase
        .from("product_colors")
        .select(
            "id, hex, label, sort_order, front_image_path, back_image_path"
        )
        .eq("product_id", product.id)
        .order("sort_order", { ascending: true });

    const colors =
        colorRows?.map((c) => ({
            id: c.id,
            hex: c.hex ?? "#111111",
            label: c.label ?? "",
            front_image_url: c.front_image_path
                ? publicImageUrl(c.front_image_path)
                : null,
            back_image_url: c.back_image_path
                ? publicImageUrl(c.back_image_path)
                : null,
        })) ?? [];

    // related
    const { data: related } = await supabase
        .from("products_with_first_image")
        .select("id, slug, title, price_cents, currency, primary_image_path")
        .neq("id", product.id)
        .limit(8);

    const relatedFormatted =
        related?.map((p) => ({
            id: p.id,
            title: p.title,
            price_cents: p.price_cents,
            currency: p.currency,
            primary_image_url: p.primary_image_path
                ? publicImageUrl(p.primary_image_path)
                : null,
        })) ?? [];

    const priceLabel = formatCurrency(product.price_cents, product.currency);
    const split4Label = formatCurrency(
        Math.ceil(product.price_cents / 4),
        product.currency
    );

    // ✅ render the interactive client component
    return (
        <ProductViewClient
            product={{
                id: product.id,
                title: product.title,
                description: product.description,
                price_cents: product.price_cents,
                currency: product.currency,
                primary_image_url: product.primary_image_path
                    ? publicImageUrl(product.primary_image_path)
                    : null,
            }}
            galleryUrls={galleryUrls}
            colors={colors}
            related={relatedFormatted}
            priceLabel={priceLabel}
            split4Label={split4Label}
        />
    );
}
