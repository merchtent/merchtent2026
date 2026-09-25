export const PRODUCT_RESTORE_WINDOW_DAYS = 14;
export const PRODUCT_RESTORE_WINDOW_MS = PRODUCT_RESTORE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export function productRestoreDeadline(archivedAt: string | Date) {
    return new Date(new Date(archivedAt).getTime() + PRODUCT_RESTORE_WINDOW_MS);
}

export function isProductRestorable(archivedAt: string | Date, now = new Date()) {
    return productRestoreDeadline(archivedAt).getTime() > now.getTime();
}

export function productRestoreDaysRemaining(archivedAt: string | Date, now = new Date()) {
    const remaining = productRestoreDeadline(archivedAt).getTime() - now.getTime();
    return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

export function productRestoreCutoff(now = new Date()) {
    return new Date(now.getTime() - PRODUCT_RESTORE_WINDOW_MS);
}
