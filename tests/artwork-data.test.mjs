import assert from "node:assert/strict";
import test from "node:test";
import { collectArtworkPaths, removeArtworkPath } from "../src/lib/products/artwork-data.ts";

const target = "designer-assets/user/artwork.png";

test("collectArtworkPaths finds unique design layer locations without treating other images as reusable artwork", () => {
    const design = {
        sides: {
            front: { layers: [{ type: "image", src: target }, { type: "text", value: "Band" }] },
            back: { layers: [{ type: "image", src: "product-images/mockup.png" }] },
        },
    };

    assert.deepEqual(collectArtworkPaths(design), [target]);
});

test("removeArtworkPath removes matching layers while preserving the rest of the saved design", () => {
    const design = {
        sides: {
            front: { layers: [{ type: "image", src: target }, { type: "text", value: "Band" }] },
            back: { layers: [{ type: "image", src: target }, { type: "image", src: "designer-assets/user/other.png" }] },
        },
        printSideCount: 2,
    };

    const result = removeArtworkPath(design, target);
    assert.deepEqual(collectArtworkPaths(result), ["designer-assets/user/other.png"]);
    assert.equal(result.printSideCount, 2);
    assert.deepEqual(result.sides.front.layers, [{ type: "text", value: "Band" }]);
});
