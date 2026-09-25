import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { parseCatalogProductInfo } from "../src/lib/products/catalog-product-info.ts";
import { posterCanvasArea, remapPosterLayers } from "../src/lib/products/poster-formats.ts";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("Prima blueprint 1079 is configured as a single-sided poster product", () => {
    const migration = read("supabase/migrations/202609240007_setup_prima_unframed_posters.sql");
    assert.match(migration, /supplier_product_id = '1079'/);
    assert.match(migration, /garment_kind = 'poster'/);
    assert.match(migration, /'Glossy'.*'Matte'/s);
    assert.match(migration, /'81390'.*'width', 6059, 'height', 4859/s);
    assert.match(migration, /'81396'.*'width', 6059, 'height', 9059/s);
    assert.match(migration, /when '81390' then '20" x 16" \(Horizontal\)'/);
    assert.match(migration, /cost_cents = case[\s\S]*then 1224[\s\S]*then 1307[\s\S]*else 1644/);
    assert.match(migration, /premium_reference_cents'[\s\S]*887[\s\S]*948[\s\S]*1192/);
    assert.match(migration, /'AU'.*1241, 172/s);
    assert.match(migration, /'NZ'.*1255, 678/s);
    assert.match(migration, /'ROW'.*4824, 4592/s);
});

test("poster information includes its description, paper details, care, and dimensions", () => {
    const parsed = parseCatalogProductInfo({
        about: "Premium paper posters for detailed artwork.",
        features: [{ title: "Glossy or matte", description: "Choose the surface." }],
        care_instructions: ["Dust with a dry cloth"],
        size_guide: {
            measurement_note: "Finished dimensions.",
            length_label: "Height",
            measurements: [{ size: "20 x 30 V", width: 50.8, length: 76.2 }],
        },
    });
    assert.equal(parsed?.about, "Premium paper posters for detailed artwork.");
    assert.equal(parsed?.sizeGuide?.lengthLabel, "Height");
    assert.deepEqual(parsed?.sizeGuide?.measurements[0], { size: "20 x 30 V", width: 50.8, length: 76.2 });
});

test("poster is a first-class single-sided designer template", () => {
    const catalog = read("src/lib/product-catalog.ts");
    const designer = read("src/app/dashboard/products/designer/DesignerClient.tsx");
    const actions = read("src/app/dashboard/products/designer/actions.ts");
    const renderer = read("src/lib/products/server-print-renderer.ts");
    const importer = read("src/app/admin/supplier-catalog/actions.ts");

    assert.match(catalog, /\| "poster"/);
    assert.match(designer, /kind === "poster"/);
    assert.match(actions, /tee\|hoodie\|hat\|tank\|bag\|poster/);
    assert.match(actions, /Posters support front artwork only/);
    assert.match(renderer, /kind === "poster"/);
    assert.match(importer, /options\.paper/);
    assert.match(importer, /category === "posters"/);
});

test("poster uses the supplied blank image for its catalogue preview", () => {
    const chooser = read("src/app/dashboard/products/designer/CatalogChooser.tsx");
    const previewPath = "public/images/mockups/prima-1079/poster-blank.jpg";

    assert.match(chooser, /product\.garmentKind === "poster"/);
    assert.match(chooser, /\/images\/mockups\/prima-1079\/poster-blank\.jpg/);
    assert.ok(existsSync(path.join(process.cwd(), previewPath)));
});

test("poster layouts preserve the complete composition across portrait and landscape formats", () => {
    const portrait = posterCanvasArea(6059, 9059);
    const landscape = posterCanvasArea(9059, 6059);
    const source = [{ x: portrait.x, y: portrait.y, width: portrait.width, height: portrait.height }];
    const [mapped] = remapPosterLayers(source, portrait, landscape);

    assert.ok(mapped.x >= landscape.x);
    assert.ok(mapped.y >= landscape.y);
    assert.ok(mapped.x + mapped.width <= landscape.x + landscape.width + 0.001);
    assert.ok(mapped.y + mapped.height <= landscape.y + landscape.height + 0.001);
    assert.ok(Math.abs(mapped.width / mapped.height - source[0].width / source[0].height) < 0.0001);
});

test("poster previews, exact exports, and Printify areas are grouped by format", () => {
    const designer = read("src/app/dashboard/products/designer/DesignerClient.tsx");
    const actions = read("src/app/dashboard/products/designer/actions.ts");
    const sync = read("src/lib/printify/product-sync.ts");

    assert.match(designer, /Poster preview format/);
    assert.match(designer, /posterLayouts\[next\.key\] \?\? remapPosterLayers\(layers, sourceArea, targetArea\)/);
    assert.match(designer, /posterLayouts\[format\.key\] \?\? remapPosterLayers/);
    assert.match(actions, /width: canonicalPosterTarget\.format\.width, height: canonicalPosterTarget\.format\.height/);
    assert.match(actions, /savedDesign\.posterPrintAssets = posterPrintAssets/);
    assert.match(sync, /buildPrintifyPrintAreas/);
    assert.match(sync, /variant_ids: matchingIds/);
    assert.match(sync, /Poster print assets do not cover every enabled supplier variant/);
});

test("Prima posters are limited to S, M and L vertical variants", () => {
    const migration = read("supabase/migrations/202609250001_make_prima_posters_vertical_sizes.sql");

    assert.match(migration, /merch_tent_name = 'Vertical Art Poster'/);
    assert.match(migration, /sizes = jsonb_build_array\('S', 'M', 'L'\)/);
    assert.match(migration, /'81394'.*'size', 'S'/s);
    assert.match(migration, /'81400'.*'size', 'M'/s);
    assert.match(migration, /'81396'.*'size', 'L'/s);
    assert.match(migration, /is_enabled = variant\.supplier_variant_id in \('81394', '81395', '81400', '81401', '81396', '81397'\)/);
    assert.doesNotMatch(migration, /'XL'/);
});

test("vertical poster information removes horizontal claims and uses height measurements", () => {
    const migration = read("supabase/migrations/202609250002_enrich_vertical_poster_information.sql");

    assert.match(migration, /high-gloss 200 gsm paper/);
    assert.match(migration, /smooth 300 gsm matte paper/);
    assert.match(migration, /'title', 'Three vertical sizes'/);
    assert.match(migration, /'length_label', 'Height'/);
    assert.doesNotMatch(migration, /Horizontal and vertical options available/);
});
