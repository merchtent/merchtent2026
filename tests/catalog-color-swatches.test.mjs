import assert from "node:assert/strict";
import test from "node:test";
import { colorSwatchHex, resolvedCatalogColorHex } from "../src/lib/catalog/color-swatch.ts";

test("catalogue colour names resolve to recognisable swatches", () => {
    const expected = {
        Ash: "#b7b8b3",
        "Dark Chocolate": "#3b2925",
        "Dark Heather": "#555154",
        "Forest Green": "#14532d",
        "Light Blue": "#69a9dc",
        "Light Pink": "#efb6c8",
        Maroon: "#7f1d3b",
        Navy: "#172033",
        Red: "#c62828",
        Royal: "#2855b6",
        Sand: "#c8b99b",
        "Sport Grey": "#aeb4bd",
        White: "#f7f7f2",
    };

    for (const [label, hex] of Object.entries(expected)) {
        assert.equal(colorSwatchHex(label), hex, label);
    }
});

test("legacy generic greys are repaired without replacing supplied colour values", () => {
    assert.equal(resolvedCatalogColorHex("Light Pink", "#444444"), "#efb6c8");
    assert.equal(resolvedCatalogColorHex("Dark Heather", "#514b49"), "#514b49");
});
