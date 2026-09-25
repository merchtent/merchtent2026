export const ARTIST_SELF_ORDER_TYPE = "artist_self_order" as const;
export const RETAIL_PURCHASE_TYPE = "retail" as const;
export const ARTIST_BULK_DISCOUNT_THRESHOLD = 10;
export const ARTIST_BULK_DISCOUNT_BPS = 1000;

export type PurchaseType =
    | typeof RETAIL_PURCHASE_TYPE
    | typeof ARTIST_SELF_ORDER_TYPE;

export function artistSelfOrderUnitPriceCents(
    retailPriceCents: number,
    artistCutCents: number
) {
    return Math.max(0, Math.trunc(retailPriceCents) - Math.max(0, Math.trunc(artistCutCents)));
}

export function isArtistSelfOrder(purchaseType: unknown) {
    return purchaseType === ARTIST_SELF_ORDER_TYPE;
}

export function artistBulkDiscountBps(totalQuantity: number, purchaseType: unknown) {
    return isArtistSelfOrder(purchaseType) && Math.trunc(totalQuantity) >= ARTIST_BULK_DISCOUNT_THRESHOLD
        ? ARTIST_BULK_DISCOUNT_BPS
        : 0;
}

export function artistBulkUnitPriceCents(
    artistUnitPriceCents: number,
    totalQuantity: number,
    purchaseType: unknown
) {
    const unitPrice = Math.max(0, Math.trunc(artistUnitPriceCents));
    const discountBps = artistBulkDiscountBps(totalQuantity, purchaseType);
    return Math.round(unitPrice * (10000 - discountBps) / 10000);
}

export function artistBulkOrderDiscountCents(items: Array<{
    price_cents: number;
    qty: number;
    purchase_type?: PurchaseType;
}>) {
    if (!items.length || !items.every((item) => isArtistSelfOrder(item.purchase_type))) return 0;
    const totalQuantity = items.reduce((sum, item) => sum + Math.max(0, Math.trunc(item.qty)), 0);
    return items.reduce((sum, item) => {
        const discountedUnit = artistBulkUnitPriceCents(
            item.price_cents,
            totalQuantity,
            item.purchase_type
        );
        return sum + (Math.max(0, Math.trunc(item.price_cents)) - discountedUnit) * item.qty;
    }, 0);
}
