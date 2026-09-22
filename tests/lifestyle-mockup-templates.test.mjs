import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { resolveGeometryRect } from "../src/lib/products/design-geometry.ts";
import { getLifestyleMockupTemplates, getLifestyleModelSets, getMockupTemplate } from "../src/lib/products/mockup-templates.ts";

test("garment image placement is ratio-based and preserves the canonical framing", () => {
    const tee = getMockupTemplate({ key: "printify-145" }, "#111111", "front");
    const hoodie = getMockupTemplate({ key: "printify-77" }, "#111111", "front");

    assert.equal(tee?.canvasPlacement.units, "ratio");
    assert.equal(hoodie?.canvasPlacement.units, "ratio");
    assert.deepEqual(resolveGeometryRect(tee.canvasPlacement), { x: 0, y: 0, width: 900, height: 1200 });
    assert.deepEqual(resolveGeometryRect(hoodie.canvasPlacement), { x: -90, y: 60, width: 1080, height: 1080 });
    assert.equal(hoodie.artworkPlacement?.units, "ratio");
    const hoodieArtwork = resolveGeometryRect(hoodie.artworkPlacement);
    assert.deepEqual({
        left: Math.round(hoodieArtwork.x * 1200 / 900),
        top: Math.round(hoodieArtwork.y * 1600 / 1200),
        width: Math.round(hoodieArtwork.width * 1200 / 900),
        height: Math.round(hoodieArtwork.height * 1600 / 1200),
    }, { left: 344, top: 535, width: 512, height: 346 });
});

test("black classic tee has paired front and back lifestyle mockups", () => {
    const templates = getLifestyleMockupTemplates({ key: "printify-145" }, "#111111");
    const pairs = [
        ["gig-front", "gig-back"],
        ["gig-angled", "gig-angled-back"],
        ["outdoor-show", "outdoor-show-back"],
        ["jazz-club", "jazz-club-back"],
    ];

    assert.equal(templates.length, pairs.length * 2);
    for (const [frontId, backId] of pairs) {
        assert.equal(templates.find((template) => template.id === frontId)?.side, "front");
        assert.equal(templates.find((template) => template.id === backId)?.side, "back");
    }
    for (const template of templates) {
        assert.ok(existsSync(path.join(process.cwd(), "public", template.publicPath.slice(1))));
        assert.equal(template.printMesh.length, 5);
        for (const row of template.printMesh) {
            assert.equal(row.length, 5);
            for (const point of row) {
                assert.ok(point.x > 0 && point.x < template.imageWidth);
                assert.ok(point.y > 0 && point.y < template.imageHeight);
            }
        }
    }
});

test("lifestyle mockups remain limited to supported black garments", () => {
    assert.deepEqual(getLifestyleMockupTemplates({ key: "printify-145" }, "#ffffff"), []);
    assert.deepEqual(getLifestyleMockupTemplates({ key: "another-product" }, "#111111"), []);
    assert.deepEqual(getLifestyleModelSets({ key: "printify-145" }, "#ffffff"), []);
    assert.equal(getLifestyleMockupTemplates({ key: "mt-a0e442ebc04f4556", brand: "Gildan", model: "64000" }, "#111111").length, 8);
    assert.equal(getLifestyleMockupTemplates({ key: "printify-77", brand: "Gildan", model: "18500" }, "#111111").length, 8);
});

test("each selectable model set has matching front and back templates", () => {
    const product = { key: "printify-145" };
    const modelSets = getLifestyleModelSets(product, "#111111");
    assert.equal(modelSets.filter((set) => set.audience === "female").length, 2);
    assert.equal(modelSets.filter((set) => set.audience === "male").length, 2);

    for (const set of modelSets) {
        const templates = getLifestyleMockupTemplates(product, "#111111", [set.id]);
        assert.deepEqual(templates.map((template) => template.id), [set.frontTemplateId, set.backTemplateId]);
        assert.deepEqual(templates.map((template) => template.side), ["front", "back"]);
        assert.ok(templates.every((template) => template.modelSetId === set.id));
    }

    const chosen = getLifestyleMockupTemplates(product, "#111111", ["gig", "outdoor"]);
    assert.equal(chosen.length, 4);
    assert.ok(chosen.every((template) => ["gig", "outdoor"].includes(template.modelSetId)));
});

test("black hoodie has two female and two male paired model sets", () => {
    const product = { key: "printify-77", brand: "Gildan", model: "18500" };
    const modelSets = getLifestyleModelSets(product, "#111111");

    assert.equal(modelSets.filter((set) => set.audience === "female").length, 2);
    assert.equal(modelSets.filter((set) => set.audience === "male").length, 2);

    for (const set of modelSets) {
        const templates = getLifestyleMockupTemplates(product, "#111111", [set.id]);
        assert.deepEqual(templates.map((template) => template.id), [set.frontTemplateId, set.backTemplateId]);
        assert.deepEqual(templates.map((template) => template.side), ["front", "back"]);
        for (const template of templates) {
            assert.ok(existsSync(path.join(process.cwd(), "public", template.publicPath.slice(1))));
            assert.equal(template.printMesh.length, 5);
            assert.ok(template.printMesh.every((row) => row.length === 5));
        }
    }
});

test("hoodie lifestyle meshes follow the calibrated front and back print proportions", () => {
    const templates = getLifestyleMockupTemplates(
        { key: "printify-77", brand: "Gildan", model: "18500" },
        "#111111",
    );

    for (const template of templates) {
        const points = template.printMesh.flat();
        const width = Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x));
        const height = Math.max(...points.map((point) => point.y)) - Math.min(...points.map((point) => point.y));
        const ratio = width / height;

        if (template.side === "front") {
            assert.ok(ratio >= 1.4 && ratio <= 1.6, `${template.id} front ratio`);
            assert.ok(width >= 460, `${template.id} uses the full chest width`);
            assert.ok(Math.min(...points.map((point) => point.y)) >= 500, `${template.id} clears the neckline`);
            assert.ok(Math.max(...points.map((point) => point.y)) <= 920, `${template.id} clears the pocket`);
        } else {
            assert.ok(ratio >= 0.8 && ratio <= 1, `${template.id} back ratio`);
            assert.ok(Math.min(...points.map((point) => point.y)) >= 520, `${template.id} clears the hood`);
        }
    }
});
