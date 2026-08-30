export type CatalogSupplierKey = "printify" | "printful" | "local";

export type CatalogProductColor = {
    label: string;
    value: string;
    supplierColorName?: string;
};

export type CatalogProviderOption = {
    key: string;
    supplier: CatalogSupplierKey;
    supplierProductId: string;
    supplierProviderId: string | null;
    supplierProviderName: string | null;
    location?: {
        country?: string | null;
        region?: string | null;
        city?: string | null;
    };
    variantIds: number[];
    minCostCents: number | null;
    maxCostCents: number | null;
    colors: string[];
    sizes: string[];
};

export type CatalogPrintArea = {
    x: number;
    y: number;
    width: number;
    height: number;
    supplierPlacement: string;
};

export type CatalogProduct = {
    key: string;
    name: string;
    brand: string;
    model: string;
    category: "tees" | "hoodies" | "hats" | "tanks" | "posters" | "vinyl" | "accessories" | "other";
    garmentKind: "tee" | "hoodie";
    defaultPrice: string;
    supplier: {
        key: CatalogSupplierKey;
        name: string;
        externalProductId: string;
        productUrl: string;
        automationMode: "create_on_sale" | "manual_order" | "local_fulfilment";
        printify?: {
            blueprintId: number;
            printProviderId: number | null;
            variantIds: number[];
        };
    };
    providerOptions?: CatalogProviderOption[];
    sizes: string[];
    colors: CatalogProductColor[];
    printAreas: Record<"front" | "back", CatalogPrintArea>;
    printAsset: {
        width: 2400;
        height: 3200;
        format: "image/png";
    };
    production: {
        method: string;
        placements: string[];
        notes: string[];
        includedPrintSides?: number;
        additionalPrintSideCents?: number;
        additionalPrintSideRetailCents?: number;
        artistProfitCents?: number;
        platformProfitCents?: number;
    };
};

export const PRODUCT_CATALOG: CatalogProduct[] = [
    {
        key: "printify-gildan-64000-softstyle-tee",
        name: "Unisex Softstyle T-Shirt",
        brand: "Gildan",
        model: "64000",
        category: "tees",
        garmentKind: "tee",
        defaultPrice: "39.00",
        supplier: {
            key: "printify",
            name: "Printify",
            externalProductId: "145",
            productUrl: "https://printify.com/app/products/145/gildan/unisex-softstyle-t-shirt",
            automationMode: "create_on_sale",
            printify: {
                blueprintId: 145,
                printProviderId: null,
                variantIds: [],
            },
        },
        sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
        colors: [
            { label: "Black", value: "#111111", supplierColorName: "Black" },
            { label: "White", value: "#f7f7f2", supplierColorName: "White" },
            { label: "Sport Grey", value: "#9ca3af", supplierColorName: "Sport Grey" },
            { label: "Red", value: "#b91c1c", supplierColorName: "Red" },
            { label: "Navy", value: "#111827", supplierColorName: "Navy" },
            { label: "Forest", value: "#14532d", supplierColorName: "Forest Green" },
        ],
        printAreas: {
            front: { x: 280, y: 315, width: 340, height: 430, supplierPlacement: "front" },
            back: { x: 280, y: 300, width: 340, height: 460, supplierPlacement: "back" },
        },
        printAsset: {
            width: 2400,
            height: 3200,
            format: "image/png",
        },
        production: {
            method: "DTG",
            placements: ["Front side", "Back side", "Neck label inner"],
            notes: [
                "Create the supplier product only when the first order needs fulfilment.",
                "Start with front and back artwork in Merch Tent; neck labels can be added as a later catalogue capability.",
            ],
        },
    },
];

export const DEFAULT_CATALOG_PRODUCT_KEY = PRODUCT_CATALOG[0].key;

export function getCatalogProduct(key: string) {
    return PRODUCT_CATALOG.find((product) => product.key === key) ?? null;
}
