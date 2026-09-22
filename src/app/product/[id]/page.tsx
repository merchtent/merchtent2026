// app/product/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductViewClient from "../ProductViewClient";
import StructuredData from "@/components/StructuredData";
import { logger } from "@/lib/logger";
import { publicImageUrl } from "@/lib/storage";
import { publicCatalogProductQuery } from "@/lib/catalog/public-product-query";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";
import { publicEnv } from "@/lib/env";
import { SHIPPING_METHOD_OPTIONS } from "@/lib/shipping-methods";

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

function plainText(value: string | null | undefined) {
    return (value ?? "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function productDescription(title: string, artistName?: string | null, description?: string | null) {
    const supplied = plainText(description);
    if (supplied.length >= 80) return supplied.slice(0, 260);

    const context = `Shop ${title}${artistName && !title.toLowerCase().includes(artistName.toLowerCase()) ? ` by ${artistName}` : ""} at Merch Tent. Official made-to-order merch from Australian local and unsigned artists.`;
    return supplied ? `${supplied.replace(/[.!?]+$/, "")}. ${context}` : context;
}

function productSeoTitle(title: string, artistName?: string | null) {
    if (!artistName || title.toLowerCase().includes(artistName.toLowerCase())) return title;
    return `${title} by ${artistName}`;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const product = await loadProductSeoData(id);

    if (!product) {
        return {
            title: "Product not found",
            robots: { index: false, follow: false },
        };
    }

    const artist = Array.isArray(product.artist) ? product.artist[0] : product.artist;
    const title = product.title ?? "Band merch";
    const description = productDescription(title, artist?.display_name, product.description);
    const canonicalPath = `/product/${product.slug ?? product.id}`;
    const image = publicImageUrl(product.primary_image_path);

    return {
        title: productSeoTitle(title, artist?.display_name),
        description,
        alternates: { canonical: canonicalPath },
        openGraph: {
            type: "website",
            url: canonicalPath,
            title,
            description,
            images: image ? [{ url: image, alt: title }] : undefined,
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: image ? [image] : undefined,
        },
    };
}

type ProductSpec = {
    label: string;
    value: string;
};

type DesignerProductSpecPayload = {
    printSideCount?: unknown;
    layers?: { side?: unknown }[];
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
    const supabase = getPublicServerSupabase();

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



    if (error) {
        logger.error("Product page failed to load", {
            identifier: idOrSlug,
            error: error.message,
        });
        throw new Error("Product could not be loaded.");
    }
    if (!product) notFound();

    const artist =
        Array.isArray(product.artist) ? product.artist[0] : product.artist;

    // gallery
    const { data: galleryRows } =
        (await supabase
            .from("product_images")
            .select("path, sort_order")
            .eq("product_id", product.id)
            .order("sort_order", { ascending: true })) || {};

    const primaryImageUrl = publicImageUrl(product.primary_image_path);
    const galleryUrls: string[] =
        Array.isArray(galleryRows) && galleryRows.length
            ? galleryRows
                .map((g) => publicImageUrl(g.path))
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

    const { data: ratingRows } = await supabase
        .from("fan_shouts")
        .select("rating")
        .eq("product_id", product.id)
        .eq("is_published", true);

    const ratings = (ratingRows ?? [])
        .map((row) => Number(row.rating))
        .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5);
    const averageRating = ratings.length
        ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length
        : null;

    const priceLabel = formatCurrency(product.price_cents, product.currency);
    const split4Label = formatCurrency(
        Math.ceil(product.price_cents / 4),
        product.currency
    );

    const productTitle = product.title ?? "Band merch";
    const productPath = `/product/${product.slug ?? product.id}`;
    const productUrl = `${publicEnv.siteUrl()}${productPath}`;
    const artistName = artist?.display_name ?? null;
    const description = productDescription(productTitle, artistName, product.description);
    const isAvailable = colors.length > 0;
    const productSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "@id": `${productUrl}#product`,
        url: productUrl,
        name: productTitle,
        description,
        image: galleryUrls,
        sku: product.id,
        category: "Band merchandise",
        brand: artistName
            ? { "@type": "Brand", name: artistName }
            : { "@type": "Brand", name: "Merch Tent" },
        offers: {
            "@type": "Offer",
            url: productUrl,
            priceCurrency: product.currency || "AUD",
            price: (product.price_cents / 100).toFixed(2),
            availability: `https://schema.org/${isAvailable ? "InStock" : "OutOfStock"}`,
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@id": `${publicEnv.siteUrl()}/#store` },
            shippingDetails: SHIPPING_METHOD_OPTIONS.map((method) => ({
                "@type": "OfferShippingDetails",
                shippingLabel: method.label,
                shippingDestination: {
                    "@type": "DefinedRegion",
                    addressCountry: "AU",
                },
                shippingRate: {
                    "@type": "MonetaryAmount",
                    value: (method.checkoutAmountCents / 100).toFixed(2),
                    currency: "AUD",
                },
            })),
        },
        ...(averageRating
            ? {
                aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: Number(averageRating.toFixed(2)),
                    reviewCount: ratings.length,
                    bestRating: 5,
                    worstRating: 1,
                },
            }
            : {}),
    };

    return (
        <>
            <StructuredData
                data={[
                    productSchema,
                    {
                        "@context": "https://schema.org",
                        "@type": "BreadcrumbList",
                        itemListElement: [
                            {
                                "@type": "ListItem",
                                position: 1,
                                name: "Home",
                                item: publicEnv.siteUrl(),
                            },
                            ...(artistName && artist?.slug
                                ? [{
                                    "@type": "ListItem",
                                    position: 2,
                                    name: artistName,
                                    item: `${publicEnv.siteUrl()}/artists/${artist.slug}`,
                                }]
                                : []),
                            {
                                "@type": "ListItem",
                                position: artistName && artist?.slug ? 3 : 2,
                                name: productTitle,
                                item: productUrl,
                            },
                        ],
                    },
                ]}
            />
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
        </>
    );
}

async function loadProductSeoData(idOrSlug: string) {
    const supabase = getPublicServerSupabase();
    const selection = `
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
    `;

    const bySlug = await publicCatalogProductQuery(supabase
        .from("products_with_first_image")
        .select(selection)
    )
        .eq("slug", idOrSlug)
        .maybeSingle();

    if (bySlug.data || !looksLikeUUID(idOrSlug)) return bySlug.data ?? null;

    const byId = await publicCatalogProductQuery(supabase
        .from("products_with_first_image")
        .select(selection)
    )
        .eq("id", idOrSlug)
        .maybeSingle();

    return byId.data ?? null;
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
    const hasFrontArtwork = design.layers?.some((layer) => layer.side === "front") ?? true;
    const hasBackArtwork = design.layers?.some((layer) => layer.side === "back") ?? false;
    const specs: ProductSpec[] = [];

    if (brand || model) {
        specs.push({ label: "Garment", value: [brand, model].filter(Boolean).join(" ") });
    }
    if (name) {
        specs.push({ label: "Fit", value: name });
    }
    specs.push({
        label: "Print",
        value: `${method || "DTG"} ${printSideCount === 2 || (hasFrontArtwork && hasBackArtwork) ? "front and back" : hasBackArtwork ? "back" : "front"} print`,
    });
    specs.push({ label: "Fulfilment", value: "Printed after checkout" });

    return specs;
}

function stringValue(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}
