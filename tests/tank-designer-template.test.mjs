import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
    return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("tank tops are a first-class admin and designer garment template", () => {
    const catalog = read("src/lib/product-catalog.ts");
    const adminPage = read("src/app/admin/supplier-catalog/[supplier]/[supplierProductId]/page.tsx");
    const adminActions = read("src/app/admin/supplier-catalog/actions.ts");
    const designer = read("src/app/dashboard/products/designer/DesignerClient.tsx");
    const designerActions = read("src/app/dashboard/products/designer/actions.ts");
    const renderer = read("src/lib/products/server-print-renderer.ts");

    assert.match(catalog, /garmentKind: "tee" \| "hoodie" \| "tank"/);
    assert.match(adminPage, /<option value="tank">Tank top<\/option>/);
    assert.match(adminActions, /ALLOWED_GARMENT_KINDS = new Set\(\["tee", "hoodie", "tank"\]\)/);
    assert.match(adminActions, /category === "tanks" \? "tank" : "tee"/);
    assert.match(designer, /type GarmentKind = "tee" \| "hoodie" \| "tank"/);
    assert.match(designer, /else if \(kind === "tank"\)/);
    assert.match(designerActions, /merch-tent-\(tee\|hoodie\|tank\)-v1/);
    assert.match(renderer, /type GarmentKind = "tee" \| "hoodie" \| "tank"/);
    assert.match(renderer, /if \(kind === "tank"\)/);
});

test("Classic Tank Top migrations record the corrected full-product Premium calculation", () => {
    const migration = read("supabase/migrations/202609220008_classic_tank_template_and_pricing.sql");
    const currencyFix = read("supabase/migrations/202609220009_classic_tank_shipping_currency.sql");
    const premiumCorrection = read("supabase/migrations/202609220010_correct_classic_tank_premium_costs.sql");

    assert.match(migration, /supplier_product_id = '995'/);
    assert.match(migration, /garment_kind = 'tank'/);
    assert.match(migration, /cost_cents = 2730/);
    assert.match(migration, /price_cents = 3653/);
    assert.match(migration, /first_item_cents[\s\S]*966/);
    assert.match(migration, /additional_item_cents[\s\S]*null/);
    assert.match(migration, /'S', 'M', 'L', 'XL', '2XL'/);
    assert.match(migration, /'Ash Stone', 'Black Stone', 'Moss Stone'/);
    assert.match(currencyFix, /first_item_cents = 966/);
    assert.match(currencyFix, /currency = 'AUD'/);
    assert.doesNotMatch(currencyFix, /additional_item_cents\s*=/);
    assert.match(premiumCorrection, /cost_cents = 2922/);
    assert.match(premiumCorrection, /price_cents = 3652/);
    assert.match(premiumCorrection, /additional_print_side_cents = 1072/);
    assert.match(premiumCorrection, /additional_print_side_retail_cents = case/);
    assert.match(premiumCorrection, /premium_discount_bps', 2000/);
});
