import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseCatalogProductInfo } from "../src/lib/products/catalog-product-info.ts";

function read(path) {
    return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Classic Tee information is available to the designer and customer product page", () => {
    const migration = read("supabase/migrations/202609240003_classic_tee_product_information.sql");
    const designer = read("src/app/dashboard/products/designer/DesignerClient.tsx");
    const productView = read("src/app/product/ProductViewClient.tsx");

    assert.match(migration, /supplier_product_id = '145'/);
    assert.match(migration, /'title', 'Without side seams'/);
    assert.match(migration, /'title', 'Shoulder tape'/);
    assert.match(migration, /'size', 'XS', 'width', 40\.64, 'length', 68\.58, 'sleeve_length', 20\.30/);
    assert.match(migration, /'size', '5XL', 'width', 81\.28, 'length', 88\.90, 'sleeve_length', 25\.30/);
    assert.match(migration, /'size_tolerance', 3\.81/);
    assert.match(designer, /sizeGuide\.sleeveLabel \?\? "Sleeve length"/);
    assert.match(designer, />Tolerance</);
    assert.match(productView, /sizeGuide\.sleeveLabel \?\? "Sleeve length"/);
    assert.match(productView, />Size tolerance, cm</);
});

test("catalog product information preserves optional tee measurements", () => {
    const parsed = parseCatalogProductInfo({
        features: [{ title: "Shoulder tape", description: "Stabilises the garment." }],
        care_instructions: ["Machine wash cold"],
        size_guide: {
            measurements: [{
                size: "M",
                width: 50.8,
                length: 73.66,
                sleeve_length: 21.6,
                size_tolerance: 3.81,
            }],
        },
    });

    assert.deepEqual(parsed?.sizeGuide?.measurements[0], {
        size: "M",
        width: 50.8,
        length: 73.66,
        sleeveLength: 21.6,
        sizeTolerance: 3.81,
    });
});
