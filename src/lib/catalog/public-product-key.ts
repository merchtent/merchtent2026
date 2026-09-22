import { createHash } from "node:crypto";

export function publicCatalogProductKey(supplier: string, supplierProductId: string) {
    const digest = createHash("sha256")
        .update(`${supplier}\0${supplierProductId}`)
        .digest("hex")
        .slice(0, 16);

    return `mt-${digest}`;
}
