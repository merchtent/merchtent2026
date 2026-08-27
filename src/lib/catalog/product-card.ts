import { publicImageUrl } from "@/lib/storage";

export type CatalogProductImageRow = {
    path?: string | null;
    sort_order?: number | null;
};

export type CatalogProductColorRow = {
    hex?: string | null;
    label?: string | null;
    sort_order?: number | null;
    front_image_path?: string | null;
    back_image_path?: string | null;
};

export type CatalogProductArtistRow = {
    display_name?: string | null;
    name?: string | null;
};

export type CatalogProductRow = {
    id: string;
    title?: string | null;
    slug?: string | null;
    price_cents?: number | null;
    product_images?: CatalogProductImageRow[] | null;
    product_colors?: CatalogProductColorRow[] | null;
    artist?: CatalogProductArtistRow | CatalogProductArtistRow[] | null;
};

export type CatalogProductCard = {
    id: string;
    title: string;
    price: number;
    image: string;
    hover: string;
    slug: string;
    badge: string;
    colors: Array<{
        hex?: string | null;
        label?: string | null;
        front: string;
        back: string;
    }>;
    kind: "tee";
    sizes: string[];
};

const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

function sortBySortOrder<T extends { sort_order?: number | null }>(rows?: T[] | null) {
    return Array.isArray(rows)
        ? [...rows].sort((a, b) => (a?.sort_order ?? 999) - (b?.sort_order ?? 999))
        : [];
}

function firstArtist(artist?: CatalogProductArtistRow | CatalogProductArtistRow[] | null) {
    return Array.isArray(artist) ? artist[0] : artist;
}

export function mapCatalogProductCard(
    product: CatalogProductRow,
    options?: { fallbackBadge?: string }
): CatalogProductCard {
    const images = sortBySortOrder(product.product_images);
    const primary = publicImageUrl(images[0]?.path) ?? "/merch-placeholder.svg";
    const hover = publicImageUrl(images[1]?.path) ?? primary;
    const colors = sortBySortOrder(product.product_colors).map((color) => ({
        hex: color.hex,
        label: color.label,
        front: publicImageUrl(color.front_image_path) ?? primary,
        back: publicImageUrl(color.back_image_path) ?? hover,
    }));
    const artist = firstArtist(product.artist);
    const badge = artist?.display_name ?? artist?.name ?? options?.fallbackBadge ?? "Artist";

    return {
        id: String(product.id),
        title: product.title ?? "Untitled product",
        price: (product.price_cents ?? 0) / 100,
        image: primary,
        hover,
        slug: product.slug ?? String(product.id),
        badge,
        colors,
        kind: "tee",
        sizes: DEFAULT_SIZES,
    };
}
