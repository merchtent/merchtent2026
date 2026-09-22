import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
    normalizeGeometryAreas,
    normalizeGeometryRect,
    resolveGeometryAreas,
    resolveGeometryRect,
} from "../src/lib/products/design-geometry.ts";

test("ratio geometry resolves consistently at desktop and mobile render sizes", () => {
    const rect = { x: 0.25, y: 0.2, width: 0.5, height: 0.4, units: "ratio" };

    assert.deepEqual(resolveGeometryRect(rect, 900, 1200), {
        x: 225,
        y: 240,
        width: 450,
        height: 480,
    });
    assert.deepEqual(resolveGeometryRect(rect, 360, 480), {
        x: 90,
        y: 96,
        width: 180,
        height: 192,
    });
});

test("legacy pixel geometry remains unchanged", () => {
    const legacy = { x: 280, y: 315, width: 340, height: 430 };
    assert.deepEqual(resolveGeometryRect(legacy), legacy);
});

test("pixel geometry round trips through normalized storage", () => {
    const legacyAreas = {
        front: { x: 280, y: 315, width: 340, height: 430 },
        back: { x: 280, y: 300, width: 340, height: 460 },
    };
    const normalized = normalizeGeometryAreas(legacyAreas, 900, 1200);

    assert.equal(normalized.front.units, "ratio");
    assert.deepEqual(resolveGeometryAreas(normalized, 900, 1200), legacyAreas);
    assert.deepEqual(resolveGeometryRect(normalizeGeometryRect(legacyAreas.front)), legacyAreas.front);
});

test("Gildan 18500 uses the Printify-calibrated front safe area", () => {
    const migration = readFileSync(
        new URL("../supabase/migrations/202609220006_gildan_18500_print_area.sql", import.meta.url),
        "utf8"
    );

    assert.match(migration, /supplier_product_id = '77'/);
    assert.match(migration, /'y', 480\.0 \/ 1200\.0/);
    assert.match(migration, /'width', 340\.0 \/ 900\.0/);
    assert.match(migration, /'height', 230\.0 \/ 1200\.0/);
    assert.match(migration, /'units', 'ratio'/);
});

test("Gildan 18500 back safe area clears the hood and lower hem", () => {
    const migration = readFileSync(
        new URL("../supabase/migrations/202609220007_gildan_18500_back_print_area.sql", import.meta.url),
        "utf8"
    );

    assert.match(migration, /supplier_product_id = '77'/);
    assert.match(migration, /'x', 280\.0 \/ 900\.0/);
    assert.match(migration, /'y', 450\.0 \/ 1200\.0/);
    assert.match(migration, /'width', 340\.0 \/ 900\.0/);
    assert.match(migration, /'height', 385\.0 \/ 1200\.0/);
});
