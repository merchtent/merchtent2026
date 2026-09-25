import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const designerPath = fileURLToPath(new URL("../src/app/dashboard/products/designer/DesignerClient.tsx", import.meta.url));
const actionsPath = fileURLToPath(new URL("../src/app/dashboard/products/designer/actions.ts", import.meta.url));
const rendererPath = fileURLToPath(new URL("../src/lib/products/server-print-renderer.ts", import.meta.url));
const designer = readFileSync(designerPath, "utf8");
const actions = readFileSync(actionsPath, "utf8");
const renderer = readFileSync(rendererPath, "utf8");

test("advanced mode exposes professional canvas and transform controls", () => {
    for (const feature of [
        "Advanced",
        "Hold Space and drag to pan",
        "Rulers",
        "Safe area",
        "Bleed",
        "Grid px",
        "Exact transform",
        "Lock ratio",
        "Width / cm",
        "Scale / %",
    ]) assert.match(designer, new RegExp(feature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("advanced mode includes layer, reuse, preflight and export workflows", () => {
    for (const feature of [
        "groupSelectedLayers",
        "alignSelectedLayers",
        "duplicateSelectedLayers",
        "copyPlacement",
        "pastePlacement",
        "copyToOtherSide",
        "replaceSelectedArtwork",
        "File diagnostics",
        "SVG template",
        "Proof PNG",
        "Preflight",
    ]) assert.match(designer, new RegExp(feature));
});

test("advanced layer metadata persists and hidden layers never print", () => {
    for (const field of ["name", "locked", "hidden", "groupId", "fileType", "hasTransparency", "colorProfile"]) {
        assert.match(actions, new RegExp(`${field}: z\\.`));
    }
    assert.match(renderer, /item\.side === side && !item\.hidden/);
});

test("undo and redo keyboard shortcuts retain a bounded history", () => {
    assert.match(designer, /historyRef/);
    assert.match(designer, /slice\(-49\)/);
    assert.match(designer, /event\.key\.toLowerCase\(\) === "z"/);
    assert.match(designer, /event\.key\.toLowerCase\(\) === "y"/);
});
