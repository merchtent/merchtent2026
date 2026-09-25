import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const sourcePath = fileURLToPath(new URL("../src/app/dashboard/products/designer/artwork-print-quality.ts", import.meta.url));
const source = readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const testModule = { exports: {} };
new Function("module", "exports", compiled)(testModule, testModule.exports);
const { estimateArtworkPrintQuality } = testModule.exports;

const tankArea = {
    layerWidth: 308,
    layerHeight: 308 * 3508 / 3071,
    printAreaWidth: 308,
    printAreaHeight: 308 * 3508 / 3071,
    targetPixelWidth: 3071,
    targetPixelHeight: 3508,
};

test("supplier-sized tank artwork is rated high at 300 DPI", () => {
    assert.deepEqual(estimateArtworkPrintQuality({
        sourceWidth: 3071,
        sourceHeight: 3508,
        ...tankArea,
    }), { dpi: 300, level: "high" });
});

test("quality drops when artwork is enlarged and improves when reduced", () => {
    const fullSize = estimateArtworkPrintQuality({
        sourceWidth: 1600,
        sourceHeight: 1828,
        ...tankArea,
    });
    const halfSize = estimateArtworkPrintQuality({
        sourceWidth: 1600,
        sourceHeight: 1828,
        ...tankArea,
        layerWidth: tankArea.layerWidth / 2,
        layerHeight: tankArea.layerHeight / 2,
    });

    assert.equal(fullSize.level, "medium");
    assert.equal(halfSize.level, "high");
    assert.ok(halfSize.dpi > fullSize.dpi);
});

test("low resolution artwork is reported but still returns a result", () => {
    const result = estimateArtworkPrintQuality({
        sourceWidth: 800,
        sourceHeight: 914,
        ...tankArea,
    });

    assert.equal(result.level, "low");
    assert.equal(result.dpi, 78);
});

test("invalid dimensions cannot produce a misleading rating", () => {
    assert.equal(estimateArtworkPrintQuality({
        sourceWidth: 0,
        sourceHeight: 1000,
        ...tankArea,
    }), null);
});

test("designer shows the active print dimensions in the toolbar and on the guide", () => {
    const designerPath = fileURLToPath(new URL("../src/app/dashboard/products/designer/DesignerClient.tsx", import.meta.url));
    const designerSource = readFileSync(designerPath, "utf8");

    assert.match(designerSource, /activeSide} print area/);
    assert.match(designerSource, /Recommended artwork/);
    assert.match(designerSource, /cm at 300 DPI/);
    assert.match(designerSource, /guideLabel = `\$\{printTarget\.width} x \$\{printTarget\.height} px`/);
});
