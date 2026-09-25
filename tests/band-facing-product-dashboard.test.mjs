import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("the product dashboard uses band-facing drop and launch language", () => {
    const page = read("src/app/dashboard/products/page.tsx");

    assert.match(page, /Your drops\./);
    assert.match(page, /Drop lineup/);
    assert.match(page, /Fan price set/);
    assert.match(page, /Your earnings set/);
    assert.match(page, /Merch photos ready/);
    assert.match(page, /Artwork saved/);
    assert.match(page, /Shop review complete/);
    assert.doesNotMatch(page, /Inventory state/);
    assert.doesNotMatch(page, /Moderation approved/);
    assert.doesNotMatch(page, /lifecycle\?\.readiness_notes/);
});
