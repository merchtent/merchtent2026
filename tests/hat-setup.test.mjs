import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
    getLifestyleMockupTemplates,
    getLifestyleModelSets,
    getMockupTemplate,
} from "../src/lib/products/mockup-templates.ts";
import { parseCatalogProductInfo } from "../src/lib/products/catalog-product-info.ts";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("Yupoong 6089M uses the supplied colour photography", () => {
    const product = { key: "printify-1703", brand: "Yupoong", model: "6089M" };
    const expected = {
        Black: "black-front.jpg",
        "Dark Heather": "dark-heather-front.jpg",
        White: "white-front.jpg",
    };

    for (const [color, file] of Object.entries(expected)) {
        const template = getMockupTemplate(product, "#111111", "front", color);
        assert.equal(template?.publicPath, `/images/mockups/yupoong-6089m/${file}`);
        assert.equal(template?.fit, "contain");
        assert.ok(existsSync(path.join(process.cwd(), "public", template.publicPath.slice(1))));
    }
});

test("hat setup records front DTF geometry, international shipping, pricing, and product details", () => {
    const migration = read("supabase/migrations/202609240008_setup_yupoong_6089m_snapback.sql");

    assert.match(migration, /supplier_product_id = '1703'/);
    assert.match(migration, /supplier_provider_id = '41'/);
    assert.match(migration, /garment_kind = 'hat'/);
    assert.match(migration, /'international_supplier', true/);
    assert.match(migration, /'method', 'DTF'/);
    assert.match(migration, /460\.0 \* 750\.0 \/ 1654\.0/);
    assert.match(migration, /cost_cents = 3071/);
    assert.match(migration, /premium_reference_cents', 2222/);
    assert.match(migration, /default_price_cents = 5900/);
    assert.match(migration, /'AU'.*'10 - 30 business days'.*1804, 865/s);
    assert.match(migration, /'US'.*'2 - 5 business days'.*1125, 143/s);
    assert.match(migration, /'CA'.*'2 - 5 business days'.*1400, 287/s);
    assert.match(migration, /'European Countries'.*2238, 865/s);
});

test("hat size information supports product-specific measurements", () => {
    const parsed = parseCatalogProductInfo({
        size_guide: {
            measurement_note: "One-size adjustable snapback.",
            measurements: [{
                size: "One size",
                metrics: [
                    { label: "Circumference, cm", value: "51–60" },
                    { label: "Crown height, cm", value: 11.5 },
                ],
            }],
        },
    });

    assert.deepEqual(parsed?.sizeGuide?.measurements[0], {
        size: "One size",
        metrics: [
            { label: "Circumference, cm", value: "51–60" },
            { label: "Crown height, cm", value: 11.5 },
        ],
    });
});

test("the designer treats hats as their own front-only product kind", () => {
    const designer = read("src/app/dashboard/products/designer/DesignerClient.tsx");
    const actions = read("src/app/dashboard/products/designer/actions.ts");
    const importer = read("src/app/admin/supplier-catalog/actions.ts");

    assert.match(designer, /garmentKind === "poster" \|\| garmentKind === "hat"/);
    assert.match(actions, /design\.garment\.kind === "poster" \|\| design\.garment\.kind === "hat"/);
    assert.match(actions, /tee\|hoodie\|hat\|tank\|bag\|poster/);
    assert.match(importer, /category === "hats"[\s\S]*?\? "hat"/);
});

test("the black Yupoong hat offers two younger female and two male punk lifestyle mockups", () => {
    const product = { key: "printify-1703", brand: "Yupoong", model: "6089M" };
    const sets = getLifestyleModelSets(product, "#111111");
    const templates = getLifestyleMockupTemplates(product, "#111111");

    assert.equal(sets.length, 4);
    assert.equal(sets.filter((set) => set.audience === "female").length, 2);
    assert.equal(sets.filter((set) => set.audience === "male").length, 2);
    assert.ok(sets.every((set) => set.backTemplateId === undefined));
    assert.equal(templates.length, 4);
    assert.ok(templates.every((template) => template.side === "front"));
    assert.ok(templates.filter((template) => template.modelSetId.startsWith("hat-")).every((template) => {
        return existsSync(path.join(process.cwd(), "public", template.publicPath.slice(1)));
    }));
    assert.deepEqual(getLifestyleModelSets(product, "#ffffff"), []);
});
