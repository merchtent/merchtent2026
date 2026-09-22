import assert from "node:assert/strict";
import test from "node:test";
import { publicCatalogProductKey } from "../src/lib/catalog/public-product-key.ts";

test("designer catalogue URLs use stable Merch Tent IDs without supplier details", () => {
    const key = publicCatalogProductKey("printify", "145");
    assert.match(key, /^mt-[a-f0-9]{16}$/);
    assert.equal(key, publicCatalogProductKey("printify", "145"));
    assert.notEqual(key, publicCatalogProductKey("printful", "145"));
    assert.notEqual(key, publicCatalogProductKey("printify", "146"));
    assert.ok(!key.includes("printify"));
    assert.ok(!key.includes("145"));
});
