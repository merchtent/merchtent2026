import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const sharp = require("sharp");
const sourcePath = fileURLToPath(new URL("../src/lib/products/mockup-placement.ts", import.meta.url));
const source = readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const testModule = { exports: {} };
new Function("module", "exports", compiled)(testModule, testModule.exports);
const { clipMockupPlacement, mapCanvasRectToMockupPlacement } = testModule.exports;

test("hoodie artwork follows the same zoomed placement as its base image", () => {
    assert.deepEqual(
        mapCanvasRectToMockupPlacement(
            { x: 280, y: 480, width: 340, height: 230 },
            { left: -120, top: 80, width: 1440, height: 1440 },
            900,
            1200,
        ),
        { left: 328, top: 656, width: 544, height: 276 },
    );
});

test("oversized hoodie templates are cropped to the output canvas", () => {
    assert.deepEqual(
        clipMockupPlacement({ left: -120, top: 80, width: 1440, height: 1440 }, 1200, 1600),
        {
            sourceLeft: 120,
            sourceTop: 0,
            width: 1200,
            height: 1440,
            destinationLeft: 0,
            destinationTop: 80,
        },
    );
});

test("templates fully outside the output canvas are rejected", () => {
    assert.equal(
        clipMockupPlacement({ left: 1300, top: 0, width: 200, height: 200 }, 1200, 1600),
        null,
    );
});

test("the oversized hoodie base can be composed after clipping", async () => {
    const placement = { left: -120, top: 80, width: 1440, height: 1440 };
    const clipped = clipMockupPlacement(placement, 1200, 1600);
    assert.ok(clipped);

    const sourcePath = fileURLToPath(new URL(
        "../public/images/mockups/gildan-18500/black-front.jpg",
        import.meta.url,
    ));
    const cropped = await sharp(readFileSync(sourcePath))
        .resize(placement.width, placement.height, { fit: "cover", position: "centre" })
        .extract({
            left: clipped.sourceLeft,
            top: clipped.sourceTop,
            width: clipped.width,
            height: clipped.height,
        })
        .toBuffer();
    const result = await sharp({
        create: { width: 1200, height: 1600, channels: 3, background: "#ffffff" },
    })
        .composite([{
            input: cropped,
            left: clipped.destinationLeft,
            top: clipped.destinationTop,
        }])
        .webp()
        .toBuffer({ resolveWithObject: true });

    assert.equal(result.info.width, 1200);
    assert.equal(result.info.height, 1600);
});
