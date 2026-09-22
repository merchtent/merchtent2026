import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const sourcePath = fileURLToPath(new URL("../src/app/dashboard/products/designer/layer-quick-actions.ts", import.meta.url));
const source = readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const testModule = { exports: {} };
new Function("module", "exports", compiled)(testModule, testModule.exports);
const { fitImageToPrintArea, getLayerPositionPatch, getLayerQuickActionPatch } = testModule.exports;

const area = { x: 280, y: 315, width: 340, height: 430 };
const actions = ["center-horizontal", "center-vertical", "max-width", "max-height", "top", "bottom", "left", "right"];

test("new landscape artwork fills the printable width and is centered", () => {
    assert.deepEqual(fitImageToPrintArea(1200, 600, area), {
        x: 280,
        y: 445,
        width: 340,
        height: 170,
    });
});

test("new portrait artwork fills the printable height and is centered", () => {
    assert.deepEqual(fitImageToPrintArea(600, 1200, area), {
        x: 342.5,
        y: 315,
        width: 215,
        height: 430,
    });
});

function visibleBounds(layer, patch) {
    const angle = layer.rotation * Math.PI / 180;
    const width = Math.abs(Math.cos(angle)) * patch.width + Math.abs(Math.sin(angle)) * patch.height;
    const height = Math.abs(Math.sin(angle)) * patch.width + Math.abs(Math.cos(angle)) * patch.height;
    const centerX = patch.x + patch.width / 2;
    const centerY = patch.y + patch.height / 2;
    return { left: centerX - width / 2, right: centerX + width / 2, top: centerY - height / 2, bottom: centerY + height / 2 };
}

test("quick actions keep a rotated image inside the printable area", () => {
    const layer = { type: "image", x: 180, y: 280, width: 500, height: 560, aspectRatio: 1.5, rotation: 27 };
    for (const action of actions) {
        const patch = getLayerQuickActionPatch(layer, area, action);
        const visible = visibleBounds(layer, patch);
        assert.ok(patch.x >= area.x - 0.001, action);
        assert.ok(patch.y >= area.y - 0.001, action);
        assert.ok(patch.x + patch.width <= area.x + area.width + 0.001, action);
        assert.ok(patch.y + patch.height <= area.y + area.height + 0.001, action);
        assert.ok(visible.left >= area.x - 0.001, action);
        assert.ok(visible.right <= area.x + area.width + 0.001, action);
        assert.ok(visible.top >= area.y - 0.001, action);
        assert.ok(visible.bottom <= area.y + area.height + 0.001, action);
    }
});

test("alignment targets the printable edges and centres", () => {
    const layer = { type: "image", x: 330, y: 390, width: 180, height: 160, rotation: 0 };
    const horizontal = getLayerQuickActionPatch(layer, area, "center-horizontal");
    const vertical = getLayerQuickActionPatch(layer, area, "center-vertical");
    assert.equal(horizontal.x + horizontal.width / 2, area.x + area.width / 2);
    assert.equal(vertical.y + vertical.height / 2, area.y + area.height / 2);
    assert.equal(getLayerQuickActionPatch(layer, area, "top").y, area.y);
    assert.equal(getLayerQuickActionPatch(layer, area, "bottom").y + layer.height, area.y + area.height);
    assert.equal(getLayerQuickActionPatch(layer, area, "left").x, area.x);
    assert.equal(getLayerQuickActionPatch(layer, area, "right").x + layer.width, area.x + area.width);
});

test("size actions restore image proportions and scale text size", () => {
    const image = { type: "image", x: 300, y: 400, width: 200, height: 200, aspectRatio: 2, rotation: 0 };
    for (const action of ["max-width", "max-height"]) {
        const patch = getLayerQuickActionPatch(image, area, action);
        assert.equal(patch.width / patch.height, 2);
        assert.equal(patch.width, area.width);
    }

    const tallImage = { type: "image", x: 300, y: 400, width: 100, height: 100, aspectRatio: 0.25, rotation: 0 };
    for (const action of ["max-width", "max-height"]) {
        const patch = getLayerQuickActionPatch(tallImage, area, action);
        assert.equal(patch.height, area.height);
        assert.equal(patch.width / patch.height, 0.25);
    }

    const text = { type: "text", x: 300, y: 400, width: 170, height: 100, fontSize: 50, rotation: 0 };
    const patch = getLayerQuickActionPatch(text, area, "max-width");
    assert.equal(patch.fontSize, 100);
});

test("X and Y positions are relative to the printable area and stay inside it", () => {
    const layer = { type: "image", x: 330, y: 390, width: 180, height: 160, rotation: 0 };
    assert.equal(getLayerPositionPatch(layer, area, "x", 20).x, area.x + 20);
    assert.equal(getLayerPositionPatch(layer, area, "y", 30).y, area.y + 30);
    assert.equal(getLayerPositionPatch(layer, area, "x", 999).x, area.x + area.width - layer.width);
    assert.equal(getLayerPositionPatch(layer, area, "y", -999).y, area.y);

    const rotatedLayer = { ...layer, rotation: 45 };
    const patch = getLayerPositionPatch(rotatedLayer, area, "x", 999);
    assert.ok(visibleBounds(rotatedLayer, patch).right <= area.x + area.width + 0.001);
});
