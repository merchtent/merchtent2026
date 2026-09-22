export const PUBLIC_CATEGORY_SLUGS = [
    "tees",
    "hoodies",
    "hats",
    "tanks",
    "bags",
    "posters",
] as const;

export type PublicCategorySlug = (typeof PUBLIC_CATEGORY_SLUGS)[number];

const publicCategorySlugs = new Set<string>(PUBLIC_CATEGORY_SLUGS);

export function isPublicCategorySlug(value: string): value is PublicCategorySlug {
    return publicCategorySlugs.has(value);
}
