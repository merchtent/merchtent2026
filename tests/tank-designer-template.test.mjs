import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { getLifestyleMockupTemplates, getLifestyleModelSets, getMockupTemplate } from "../src/lib/products/mockup-templates.ts";
import { parseCatalogProductInfo } from "../src/lib/products/catalog-product-info.ts";

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

    assert.match(catalog, /garmentKind: "tee" \| "hoodie" \| "hat" \| "tank" \| "bag" \| "poster"/);
    assert.match(adminPage, /<option value="tank">Tank top<\/option>/);
    assert.match(adminActions, /ALLOWED_GARMENT_KINDS = new Set\(\["tee", "hoodie", "hat", "tank", "bag", "poster"\]\)/);
    assert.match(adminActions, /category === "tanks"/);
    assert.match(designer, /type GarmentKind = "tee" \| "hoodie" \| "hat" \| "tank" \| "bag" \| "poster"/);
    assert.match(designer, /else if \(kind === "tank"\)/);
    assert.match(designerActions, /merch-tent-\(tee\|hoodie\|hat\|tank\|bag\|poster\)-v1/);
    assert.match(renderer, /type GarmentKind = "tee" \| "hoodie" \| "hat" \| "tank" \| "bag" \| "poster"/);
    assert.match(renderer, /if \(kind === "tank"\)/);
});

test("AS Colour 5039 stone colours use their supplied front and back tank images", () => {
    const product = { key: "printify-995", brand: "AS Colour", model: "5039" };
    const colors = [
        { name: "Ash Stone", hex: "#444444", slug: "ash-stone" },
        { name: "Black Stone", hex: "#111111", slug: "black-stone" },
        { name: "Moss Stone", hex: "#444444", slug: "moss-stone" },
    ];

    for (const color of colors) {
        const front = getMockupTemplate(product, color.hex, "front", color.name);
        const back = getMockupTemplate(product, color.hex, "back", color.name);

        assert.equal(front?.publicPath, `/images/mockups/as-colour-5039/${color.slug}-front.jpg`);
        assert.equal(back?.publicPath, `/images/mockups/as-colour-5039/${color.slug}-back.jpg`);
        assert.ok(existsSync(path.join(process.cwd(), "public", front.publicPath.slice(1))));
        assert.ok(existsSync(path.join(process.cwd(), "public", back.publicPath.slice(1))));
    }

    assert.equal(getMockupTemplate(product, "#444444", "front", "Unknown Stone"), null);
});

test("the catalogue uses Black Stone for the tank's main preview", () => {
    const chooser = read("src/app/dashboard/products/designer/CatalogChooser.tsx");

    assert.match(chooser, /product\.garmentKind === "tank"/);
    assert.match(chooser, /\["black stone", "black"\]/);
});

test("the tank designer opens with Black Stone selected first", () => {
    const designer = read("src/app/dashboard/products/designer/DesignerClient.tsx");
    const supplierCatalog = read("src/lib/supplier-catalog.ts");

    assert.match(designer, /garmentKind === "tank" \? \["black stone", "black"\]/);
    assert.match(designer, /preferredBlackNames[\s\S]*designerPreviewColors\.find/);
    assert.match(supplierCatalog, /name === "black" \|\| name === "black stone"/);
});

test("AS Colour 5039 offers the four approved front-facing lifestyle mockups", () => {
    const product = { key: "printify-995", brand: "AS Colour", model: "5039" };
    const modelSets = getLifestyleModelSets(product, "#111111");
    const templates = getLifestyleMockupTemplates(product, "#111111");

    assert.equal(modelSets.length, 4);
    assert.equal(modelSets.filter((set) => set.audience === "female").length, 2);
    assert.equal(modelSets.filter((set) => set.audience === "male").length, 2);
    assert.ok(modelSets.every((set) => set.backTemplateId === undefined));
    assert.equal(templates.length, 4);
    assert.ok(templates.every((template) => template.side === "front"));

    for (const set of modelSets) {
        const selected = getLifestyleMockupTemplates(product, "#777777", [set.id]);
        assert.deepEqual(selected.map((template) => template.id), [set.frontTemplateId]);
    }

    for (const template of templates) {
        assert.ok(existsSync(path.join(process.cwd(), "public", template.publicPath.slice(1))));
        assert.equal(template.imageWidth, 1024);
        assert.equal(template.imageHeight, 1536);
        assert.equal(template.printMesh.length, 5);
        assert.ok(template.printMesh.every((row) => row.length === 5));

        const points = template.printMesh.flat();
        const width = Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x));
        const height = Math.max(...points.map((point) => point.y)) - Math.min(...points.map((point) => point.y));
        assert.ok(Math.abs(width / height - 3071 / 3508) < 0.02, `${template.id} follows the tank print ratio`);
    }
});

test("the female tank rehearsal mockup leaves the supplier-matched neckline gap", () => {
    const templates = read("src/lib/products/mockup-templates.ts");

    assert.match(templates, /id: "tank-rehearsal-front"[\s\S]*createTankLifestylePrintMesh\(344, 524, 680\)/);
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

test("Classic Tank Top front and back guides match Printify's 3071 by 3508 ratio", () => {
    const migration = read("supabase/migrations/202609240001_match_tank_print_area_ratio.sql");

    assert.match(migration, /supplier_product_id = '995'/);
    assert.match(migration, /'front'[\s\S]*'width', 320\.0 \/ 900\.0/);
    assert.match(migration, /'front'[\s\S]*'height', \(320\.0 \* 3508\.0 \/ 3071\.0\) \/ 1200\.0/);
    assert.match(migration, /'back'[\s\S]*'width', 320\.0 \/ 900\.0/);
    assert.match(migration, /'back'[\s\S]*'height', \(320\.0 \* 3508\.0 \/ 3071\.0\) \/ 1200\.0/);

    const width = 320;
    const height = (320 * 3508) / 3071;
    assert.ok(Math.abs(width / height - 3071 / 3508) < Number.EPSILON);
});

test("Classic Tank Top guides align with the supplier front and back placements", () => {
    const migration = read("supabase/migrations/202609250003_align_tank_print_areas_to_supplier_template.sql");

    assert.match(migration, /supplier_product_id = '995'/);
    assert.match(migration, /'front'[\s\S]*'x', 296\.0 \/ 900\.0/);
    assert.match(migration, /'front'[\s\S]*'y', 357\.0 \/ 1200\.0/);
    assert.match(migration, /'front'[\s\S]*'width', 308\.0 \/ 900\.0/);
    assert.match(migration, /'front'[\s\S]*'height', \(308\.0 \* 3508\.0 \/ 3071\.0\) \/ 1200\.0/);
    assert.match(migration, /'back'[\s\S]*'x', 296\.0 \/ 900\.0/);
    assert.match(migration, /'back'[\s\S]*'y', 302\.0 \/ 1200\.0/);
    assert.match(migration, /'back'[\s\S]*'width', 308\.0 \/ 900\.0/);
    assert.match(migration, /'back'[\s\S]*'height', \(308\.0 \* 3508\.0 \/ 3071\.0\) \/ 1200\.0/);

    const width = 308;
    const height = (width * 3508) / 3071;
    assert.ok(Math.abs(width / height - 3071 / 3508) < Number.EPSILON);
    assert.ok(357 + height < 1200);
    assert.ok(302 + height < 1200);
});

test("Classic Tank Top lower-placement migration extended the guides below the armholes", () => {
    const migration = read("supabase/migrations/202609250004_lower_tank_print_areas.sql");

    assert.match(migration, /supplier_product_id = '995'/);
    assert.match(migration, /'front'[\s\S]*'y', 441\.0 \/ 1200\.0/);
    assert.match(migration, /'back'[\s\S]*'y', 386\.0 \/ 1200\.0/);
    assert.match(migration, /'front'[\s\S]*'width', 308\.0 \/ 900\.0/);
    assert.match(migration, /'back'[\s\S]*'width', 308\.0 \/ 900\.0/);
    assert.match(migration, /'front'[\s\S]*'height', \(308\.0 \* 3508\.0 \/ 3071\.0\) \/ 1200\.0/);
    assert.match(migration, /'back'[\s\S]*'height', \(308\.0 \* 3508\.0 \/ 3071\.0\) \/ 1200\.0/);
    const height = (308 * 3508) / 3071;
    assert.ok(441 + height < 1200);
    assert.ok(386 + height < 1200);
});

test("Classic Tank Top first upward correction preserves the guide dimensions", () => {
    const migration = read("supabase/migrations/202609250006_raise_tank_print_areas.sql");

    assert.match(migration, /supplier_product_id = '995'/);
    assert.match(migration, /'front'[\s\S]*'y', 405\.0 \/ 1200\.0/);
    assert.match(migration, /'back'[\s\S]*'y', 350\.0 \/ 1200\.0/);
    assert.match(migration, /'front'[\s\S]*'width', 308\.0 \/ 900\.0/);
    assert.match(migration, /'back'[\s\S]*'width', 308\.0 \/ 900\.0/);
    const height = (308 * 3508) / 3071;
    assert.ok(Math.abs(308 / height - 3071 / 3508) < Number.EPSILON);
    assert.equal(405 - 350, 55);
});

test("Classic Tank Top final fine-tuning raises the front slightly more than the back", () => {
    const migration = read("supabase/migrations/202609250007_refine_tank_print_area_height.sql");
    const supplierCatalog = read("src/lib/supplier-catalog.ts");

    assert.match(migration, /supplier_product_id = '995'/);
    assert.match(migration, /'front'[\s\S]*'y', 387\.0 \/ 1200\.0/);
    assert.match(migration, /'back'[\s\S]*'y', 338\.0 \/ 1200\.0/);
    assert.match(supplierCatalog, /y: 387 \/ 1200/);
    assert.match(supplierCatalog, /y: 338 \/ 1200/);

    const height = (308 * 3508) / 3071;
    assert.ok(Math.abs(308 / height - 3071 / 3508) < Number.EPSILON);
    assert.equal(405 - 387, 18);
    assert.equal(350 - 338, 12);
});

test("Classic Tank Top information is structured for both designer and customer views", () => {
    const migration = read("supabase/migrations/202609240002_tank_product_information.sql");
    const designer = read("src/app/dashboard/products/designer/DesignerClient.tsx");
    const productPage = read("src/app/product/[id]/page.tsx");
    const productView = read("src/app/product/ProductViewClient.tsx");

    assert.match(migration, /'title', '100% combed cotton'/);
    assert.match(migration, /'title', 'Stone washed'/);
    assert.match(migration, /'care_instructions'/);
    assert.match(migration, /'size', 'S', 'width', 48, 'length', 72/);
    assert.match(migration, /'size', '2XL', 'width', 60, 'length', 84/);
    assert.doesNotMatch(migration, /'size', 'XS'/);
    assert.match(designer, /Specifications/);
    assert.match(productPage, /customer_info/);
    assert.match(productView, /Built for repeat wear/);

    const parsed = parseCatalogProductInfo({
        features: [{ title: "Stone washed", description: "Naturally worn-in finish." }],
        care_instructions: ["Machine wash cold"],
        size_guide: {
            measurement_note: "Garment measurements.",
            measurements: [{ size: "S", width: 48, length: 72 }],
        },
    });
    assert.equal(parsed?.features[0].title, "Stone washed");
    assert.deepEqual(parsed?.careInstructions, ["Machine wash cold"]);
    assert.deepEqual(parsed?.sizeGuide?.measurements[0], { size: "S", width: 48, length: 72 });
});
