// app/product/[id]/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import ProductViewClient from "../ProductViewClient";
import { logger } from "@/lib/logger";
import { publicImageUrl } from "@/lib/storage";
import { publicCatalogProductQuery } from "@/lib/catalog/public-product-query";
import { getServiceSupabase } from "@/lib/supabase/service";

export const revalidate = 60;

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

type ProductSpec = {
    label: string;
    value: string;
};

type DesignerProductSpecPayload = {
    printSideCount?: unknown;
    catalogProduct?: {
        name?: unknown;
        brand?: unknown;
        model?: unknown;
        production?: {
            method?: unknown;
        };
    };
};

export default async function ProductPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: idOrSlug } = await params;
    const supabase = getServerSupabase();

    // try by slug first
    let { data: product, error } = await publicCatalogProductQuery(supabase
        .from("products_with_first_image")
        // .select(
        //     "id, slug, title, description, price_cents, currency, primary_image_path"
        // )
        .select(`
    id,
    slug,
    title,
    description,
    price_cents,
    currency,
    primary_image_path,
    artist:artists (
        id,
        slug,
        display_name,
        hero_image_path
    )
`)
    )
        .eq("slug", idOrSlug)
        .maybeSingle();

    if ((!product || error) && looksLikeUUID(idOrSlug)) {
        const byId = await publicCatalogProductQuery(supabase
            .from("products_with_first_image")
            // .select(
            //     "id, slug, title, description, price_cents, currency, primary_image_path"
            // )
            .select(`
            id,
            slug,
            title,
            description,
            price_cents,
            currency,
            primary_image_path,
            artist:artists (
                id,
                slug,
                display_name,
                hero_image_path
            )
`)
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

    const artist =
        Array.isArray(product.artist) ? product.artist[0] : product.artist;

    // gallery
    const { data: galleryRows } =
        (await supabase
            .from("product_images")
            .select("image_path, position")
            .eq("product_id", product.id)
            .order("position", { ascending: true })) || {};

    const primaryImageUrl = publicImageUrl(product.primary_image_path);
    const galleryUrls: string[] =
        Array.isArray(galleryRows) && galleryRows.length
            ? galleryRows
                .map((g) => publicImageUrl(g.image_path))
                .filter((url): url is string => Boolean(url))
            : primaryImageUrl
                ? [primaryImageUrl]
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

    if (!artist?.id) {
        logger.warn("product detail missing artist relation", {
            productId: product.id,
            productSlug: product.slug,
        });
    }

    // related
    const { data: related } = await publicCatalogProductQuery(supabase
        .from("products_with_first_image")
        .select("id, slug, title, price_cents, currency, primary_image_path")
    )
        .eq("artist_id", artist?.id)
        .neq("id", product.id)
        .limit(8);
    const relatedFormatted =
        related?.map((p) => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            price_cents: p.price_cents,
            currency: p.currency,
            primary_image_url: p.primary_image_path
                ? publicImageUrl(p.primary_image_path)
                : null,
        })) ?? [];

    const specs = await loadPublicProductSpecs(product.id);

    const priceLabel = formatCurrency(product.price_cents, product.currency);
    const split4Label = formatCurrency(
        Math.ceil(product.price_cents / 4),
        product.currency
    );

    // ✅ render the interactive client component
    return (
        <ProductViewClient
            // product={{
            //     id: product.id,
            //     title: product.title,
            //     description: product.description,
            //     price_cents: product.price_cents,
            //     currency: product.currency,
            //     primary_image_url: product.primary_image_path
            //         ? publicImageUrl(product.primary_image_path)
            //         : null,
            // }}
            product={{
                id: product.id,
                title: product.title,
                description: product.description,
                price_cents: product.price_cents,
                currency: product.currency,
                primary_image_url: primaryImageUrl,
                artist: Array.isArray(product.artist)
                    ? product.artist[0]
                    : product.artist
            }}
            galleryUrls={galleryUrls}
            colors={colors}
            related={relatedFormatted}
            priceLabel={priceLabel}
            split4Label={split4Label}
            specs={specs}
        />
    );
}

async function loadPublicProductSpecs(productId: string): Promise<ProductSpec[]> {
    try {
        const { data } = await getServiceSupabase()
            .from("product_designs")
            .select("design_data")
            .eq("product_id", productId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        return specsFromDesignData(data?.design_data);
    } catch {
        return [];
    }
}

function specsFromDesignData(raw: unknown): ProductSpec[] {
    if (!raw || typeof raw !== "object") return [];

    const design = raw as DesignerProductSpecPayload;
    const catalogProduct = design.catalogProduct;
    if (!catalogProduct) return [];

    const brand = stringValue(catalogProduct.brand);
    const model = stringValue(catalogProduct.model);
    const name = stringValue(catalogProduct.name);
    const method = stringValue(catalogProduct.production?.method);
    const printSideCount = Number(design.printSideCount) === 2 ? 2 : 1;
    const specs: ProductSpec[] = [];

    if (brand || model) {
        specs.push({ label: "Garment", value: [brand, model].filter(Boolean).join(" ") });
    }
    if (name) {
        specs.push({ label: "Fit", value: name });
    }
    specs.push({
        label: "Print",
        value: `${method || "DTG"} ${printSideCount === 2 ? "front and back" : "front"} print`,
    });
    specs.push({ label: "Fulfilment", value: "Printed after checkout" });

    return specs;
}

function stringValue(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}
