import assert from "node:assert/strict";
import test from "node:test";

import {
    checkoutShippingAmountCents,
    shippingZone,
} from "../src/lib/shipping-methods.ts";

test("international checkout shipping uses conservative destination bands", () => {
    assert.equal(shippingZone("AU"), "AU");
    assert.equal(shippingZone("NZ"), "NZ");
    assert.equal(shippingZone("US"), "US");
    assert.equal(shippingZone("CA"), "CA");
    assert.equal(shippingZone("DE"), "EU");
    assert.equal(shippingZone("GB"), "ROW");

    assert.equal(checkoutShippingAmountCents("standard", "AU"), 1700);
    assert.equal(checkoutShippingAmountCents("standard", "US"), 3500);
    assert.equal(checkoutShippingAmountCents("standard", "DE"), 10100);
    assert.equal(checkoutShippingAmountCents("standard", "GB"), 10000);
});

test("shipping protects separate product lines and additional quantities", () => {
    assert.equal(checkoutShippingAmountCents("standard", "AU", 2, 3), 3900);
    assert.equal(checkoutShippingAmountCents("standard", "US", 1, 2), 6800);
    assert.equal(checkoutShippingAmountCents("standard", "DE", 1, 2), 12900);
    assert.equal(checkoutShippingAmountCents("standard", "GB", 1, 2), 19500);
});
