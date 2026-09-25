import assert from "node:assert/strict";
import test from "node:test";

import {
    checkoutShippingAmountCents,
    shippingDeliveryLabel,
    shippingZone,
} from "../src/lib/shipping-methods.ts";
import {
    AUSTRALIAN_STATE_OPTIONS,
    COUNTRY_OPTIONS,
    normaliseAustralianState,
} from "../src/lib/address-options.ts";

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

test("shipping delivery estimates follow the selected destination", () => {
    assert.equal(shippingDeliveryLabel("AU"), "3-6 business days");
    assert.equal(shippingDeliveryLabel("NZ"), "5-10 business days");
    assert.equal(shippingDeliveryLabel("US"), "10-30 business days");
});

test("checkout address options cover ISO countries and Australian states", () => {
    assert.ok(COUNTRY_OPTIONS.length >= 240);
    assert.deepEqual(COUNTRY_OPTIONS.find(([code]) => code === "AU"), ["AU", "Australia"]);
    assert.equal(AUSTRALIAN_STATE_OPTIONS.length, 8);
    assert.equal(normaliseAustralianState("New South Wales"), "NSW");
    assert.equal(normaliseAustralianState("vic"), "VIC");
});

test("shipping protects separate product lines and additional quantities", () => {
    assert.equal(checkoutShippingAmountCents("standard", "AU", 2, 3), 3900);
    assert.equal(checkoutShippingAmountCents("standard", "US", 1, 2), 6800);
    assert.equal(checkoutShippingAmountCents("standard", "DE", 1, 2), 12900);
    assert.equal(checkoutShippingAmountCents("standard", "GB", 1, 2), 19500);
});
