import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("product pages promote printer origin and move replacement messaging below the listing", () => {
    const page = read("src/app/product/[id]/page.tsx");
    const view = read("src/app/product/ProductViewClient.tsx");
    const buyBox = read("src/components/ProductBuyBox.tsx");

    assert.match(page, /provider_location/);
    assert.match(page, /printerOriginFromLocation/);
    assert.match(page, /isAustralia: country === "Australia"/);
    assert.match(view, /Printed in \{origin\.country\}/);
    assert.doesNotMatch(view, /\[origin\.city, origin\.region\]/);
    assert.match(view, /Order protection/);
    assert.match(view, /Damaged, misprinted or incorrect items are fully replaced at no cost\./);
    assert.doesNotMatch(buyBox, /Damaged, misprinted or incorrect items/);
});
