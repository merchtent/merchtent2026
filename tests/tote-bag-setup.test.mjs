import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { getLifestyleMockupTemplates, getLifestyleModelSets, getMockupTemplate } from "../src/lib/products/mockup-templates.ts";
import { parseCatalogProductInfo } from "../src/lib/products/catalog-product-info.ts";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("AS Colour 1001 uses its supplied Black and Cream front/back assets", () => {
    const product = { key: "printify-553", brand: "AS Colour", model: "1001" };

    for (const color of ["Black", "Cream"]) {
        for (const side of ["front", "back"]) {
            const template = getMockupTemplate(product, "#111111", side, color);
            assert.equal(template?.publicPath, `/images/mockups/as-colour-1001/${color.toLowerCase()}-${side}.jpg`);
            assert.ok(existsSync(path.join(process.cwd(), "public", template.publicPath.slice(1))));
        }
    }
});

test("the catalogue uses Cream for the tote's main preview", () => {
    const chooser = read("src/app/dashboard/products/designer/CatalogChooser.tsx");

    assert.match(chooser, /product\.garmentKind === "bag"/);
    assert.match(chooser, /\["cream", "white"\]/);
});

test("AS Colour 1001 offers the two approved female lifestyle mockups", () => {
    const product = { key: "printify-553", brand: "AS Colour", model: "1001" };
    const sets = getLifestyleModelSets(product, "#111111");
    const templates = getLifestyleMockupTemplates(product, "#111111");

    assert.equal(sets.length, 2);
    assert.ok(sets.every((set) => set.audience === "female"));
    assert.deepEqual(sets.map((set) => set.id), ["tote-record-shop", "tote-loading-dock"]);
    assert.equal(templates.length, 2);

    for (const template of templates) {
        assert.ok(existsSync(path.join(process.cwd(), "public", template.publicPath.slice(1))));
        assert.equal(template.imageWidth, 1024);
        assert.equal(template.imageHeight, 1536);
        const points = template.printMesh.flat();
        const width = Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x));
        const height = Math.max(...points.map((point) => point.y)) - Math.min(...points.map((point) => point.y));
        assert.ok(Math.abs(width / height - 2835 / 3425) < 0.01);
    }
});

test("tote setup records variants, exact print ratio, pricing, shipping, and customer details", () => {
    const migration = read("supabase/migrations/202609240006_setup_as_colour_1001_tote.sql");

    assert.match(migration, /supplier_product_id = '553'/);
    assert.match(migration, /garment_kind = 'bag'/);
    assert.match(migration, /'Black'.*'#111111'/s);
    assert.match(migration, /'Cream'.*'#f1eee4'/s);
    assert.match(migration, /cost_cents = 2782/);
    assert.match(migration, /premium_reference_cents', 2017/);
    assert.match(migration, /default_price_cents = 4900/);
    assert.match(migration, /'AU'.*966, 201/s);
    assert.match(migration, /'NZ'.*1877, 201/s);
    assert.match(migration, /'ROW'.*2180, 230/s);
    assert.match(migration, /430\.0 \* 3425\.0 \/ 2835\.0/);

    const parsed = parseCatalogProductInfo({
        features: [{ title: "100% cotton canvas", description: "Durable printing surface." }],
        care_instructions: ["Machine wash cold"],
        size_guide: {
            measurement_note: "Bag body measurements.",
            measurements: [{ size: "One size", width: 42, length: 42 }],
        },
    });
    assert.deepEqual(parsed?.sizeGuide?.measurements[0], { size: "One size", width: 42, length: 42 });
});

test("the Printify importer treats One size as a size and maps bags to the bag designer", () => {
    const actions = read("src/app/admin/supplier-catalog/actions.ts");
    const designerActions = read("src/app/dashboard/products/designer/actions.ts");

    assert.match(actions, /"ONE SIZE"/);
    assert.match(actions, /category === "bags"/);
    assert.match(actions, /\? "bag"/);
    assert.match(designerActions, /tee\|hoodie\|hat\|tank\|bag/);
});
