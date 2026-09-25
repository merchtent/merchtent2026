const MAX_PRODUCT_NAME_LENGTH = 120;

export function buildDesignedProductName(artistName: string, dropName: string, productName: string) {
    const artist = artistName.trim();
    const product = productName.trim();
    const availableDropLength = Math.max(1, MAX_PRODUCT_NAME_LENGTH - artist.length - product.length - 2);
    const drop = dropName.trim().slice(0, availableDropLength).trim();

    return [artist, drop || "...", product].filter(Boolean).join(" ");
}

export function extractDesignedProductDropName(
    savedTitle: string | null | undefined,
    artistName: string,
    productName: string
) {
    let editable = savedTitle?.trim() ?? "";
    const artistPrefix = `${artistName.trim()} `;
    const productSuffix = ` ${productName.trim()}`;

    if (editable.toLowerCase().startsWith(artistPrefix.toLowerCase())) {
        editable = editable.slice(artistPrefix.length).trim();
    }
    if (editable.toLowerCase().endsWith(productSuffix.toLowerCase())) {
        editable = editable.slice(0, -productSuffix.length).trim();
    }

    return editable.toLowerCase() === productName.trim().toLowerCase() ? "" : editable;
}
