import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseCatalogProductInfo } from "../src/lib/products/catalog-product-info.ts";

function read(path) {
    return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("hoodie information is available to the designer and customer product page", () => {
    const migration = read("supabase/migrations/202609240004_hoodie_product_information.sql");
    const designer = read("src/app/dashboard/products/designer/DesignerClient.tsx");
    const productView = read("src/app/product/ProductViewClient.tsx");
    const productPage = read("src/app/product/[id]/page.tsx");

    assert.match(migration, /supplier_product_id = '77'/);
    assert.match(migration, /'title', 'Cotton-poly fleece'/);
    assert.match(migration, /'title', 'Kangaroo pocket'/);
    assert.match(migration, /'sleeve_label', 'Sleeve length from centre back'/);
    assert.match(migration, /'size', 'S', 'width', 51\.00, 'length', 69\.00, 'sleeve_length', 85\.09/);
    assert.match(migration, /'size', '3XL', 'width', 76\.00, 'length', 81\.00, 'sleeve_length', 97\.79/);
    assert.doesNotMatch(migration, /'size', '4XL'/);
    assert.match(designer, /sizeGuide\.sleeveLabel/);
    assert.match(productView, /sizeGuide\.sleeveLabel/);
    assert.match(productPage, /normalized\.includes\("heavy blend"\)/);
    assert.match(productPage, /legacyCatalogIdentity\(productTitle\)/);
});

test("catalog product information preserves a hoodie-specific sleeve label", () => {
    const parsed = parseCatalogProductInfo({
        features: [{ title: "Drawstring hood", description: "Adjustable coverage." }],
        size_guide: {
            sleeve_label: "Sleeve length from centre back",
            measurements: [{
                size: "L",
                width: 61,
                length: 74,
                sleeve_length: 90.17,
                size_tolerance: 3.81,
            }],
        },
    });

    assert.equal(parsed?.sizeGuide?.sleeveLabel, "Sleeve length from centre back");
    assert.equal(parsed?.sizeGuide?.measurements[0].sleeveLength, 90.17);
});
