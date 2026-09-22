import assert from "node:assert/strict";
import test from "node:test";
import { verifyPrintifyProductContract } from "../src/lib/printify/product-contract.ts";

const expected = {
    blueprint_id: 77,
    print_provider_id: 29,
    variants: [
        { id: 101, is_enabled: true },
        { id: 102, is_enabled: true },
    ],
    print_areas: [{
        variant_ids: [101, 102],
        placeholders: [
            {
                position: "front",
                images: [{ id: "front-upload", x: 0.5, y: 0.5, scale: 1, angle: 0 }],
            },
            {
                position: "back",
                images: [{ id: "back-upload", x: 0.5, y: 0.5, scale: 1, angle: 0 }],
            },
        ],
    }],
};

function matchingProduct() {
    return {
        id: "printify-product",
        blueprint_id: 77,
        print_provider_id: 29,
        variants: [
            { id: 101, is_enabled: true },
            { id: 102, is_enabled: true },
        ],
        print_areas: [{
            variant_ids: [101, 102],
            placeholders: [
                {
                    position: "front",
                    images: [{ id: "front-upload", x: 0.5, y: 0.5, scale: 1, angle: 0 }],
                },
                {
                    position: "back",
                    images: [{ id: "back-upload", x: 0.5, y: 0.5, scale: 1, angle: 0 }],
                },
            ],
        }],
        images: [
            { src: "https://images.printify.com/front.jpg", variant_ids: [101], position: "front" },
            { src: "https://images.printify.com/back.jpg", variant_ids: [101], position: "back" },
        ],
    };
}

test("accepts a Printify product that retained every production placement", () => {
    assert.deepEqual(verifyPrintifyProductContract(matchingProduct(), expected), {
        ok: true,
        issues: [],
        mockupUrls: [
            "https://images.printify.com/front.jpg",
            "https://images.printify.com/back.jpg",
        ],
    });
});

test("rejects changed placement, disabled variants, and missing generated mockups", () => {
    const product = matchingProduct();
    product.variants[1].is_enabled = false;
    product.print_areas[0].placeholders[0].images[0].scale = 0.82;
    product.images = product.images.filter((image) => image.position !== "back");

    const result = verifyPrintifyProductContract(product, expected);

    assert.equal(result.ok, false);
    assert.ok(result.issues.includes("variant 102 is disabled"));
    assert.ok(result.issues.includes("variant 101 is missing the verified front placement"));
    assert.ok(result.issues.includes("variant 102 is missing the verified front placement"));
    assert.ok(result.issues.includes("Printify did not generate a back mockup"));
});

test("rejects the wrong blueprint or print provider", () => {
    const product = matchingProduct();
    product.blueprint_id = 145;
    product.print_provider_id = 99;

    const result = verifyPrintifyProductContract(product, expected);

    assert.equal(result.ok, false);
    assert.ok(result.issues.includes("blueprint 145 does not match 77"));
    assert.ok(result.issues.includes("provider 99 does not match 29"));
});
