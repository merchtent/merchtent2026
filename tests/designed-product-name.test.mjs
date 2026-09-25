import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
    buildDesignedProductName,
    extractDesignedProductDropName,
} from "../src/lib/products/designed-product-name.ts";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("designed product names lock the artist first and catalogue product last", () => {
    assert.equal(
        buildDesignedProductName("Merch Tent", "Anniversary Edition", "Classic Hoodie"),
        "Merch Tent Anniversary Edition Classic Hoodie"
    );
    assert.equal(
        extractDesignedProductDropName(
            "Merch Tent Anniversary Edition Classic Hoodie",
            "Merch Tent",
            "Classic Hoodie"
        ),
        "Anniversary Edition"
    );
});

test("new and legacy default product names produce an empty editable drop name", () => {
    assert.equal(extractDesignedProductDropName(undefined, "Merch Tent", "Classic Hoodie"), "");
    assert.equal(extractDesignedProductDropName("Merch Tent Classic Hoodie", "Merch Tent", "Classic Hoodie"), "");
});

test("the designer and save action require the editable drop name separately", () => {
    const designer = read("src/app/dashboard/products/designer/DesignerClient.tsx");
    const actions = read("src/app/dashboard/products/designer/actions.ts");

    assert.match(designer, /Drop name <span/);
    assert.match(designer, /required[\s\S]*maxLength=\{80\}/);
    assert.match(designer, /formData\.set\("drop_name", title\.trim\(\)\)/);
    assert.match(actions, /dropName: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(80\)/);
    assert.match(actions, /buildDesignedProductName\(artist\.display_name, dropName, liveCatalogProduct\.name\)/);
});
