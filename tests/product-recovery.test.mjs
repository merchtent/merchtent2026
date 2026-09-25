import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
    PRODUCT_RESTORE_WINDOW_DAYS,
    isProductRestorable,
    productRestoreDaysRemaining,
} from "../src/lib/products/archive-retention.ts";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("deleted products remain recoverable for 14 days but not at the deadline", () => {
    const now = new Date("2026-09-25T12:00:00.000Z");
    assert.equal(PRODUCT_RESTORE_WINDOW_DAYS, 14);
    assert.equal(isProductRestorable("2026-09-11T12:00:00.001Z", now), true);
    assert.equal(isProductRestorable("2026-09-11T12:00:00.000Z", now), false);
    assert.equal(productRestoreDaysRemaining("2026-09-24T12:00:00.000Z", now), 13);
});

test("restore is owner scoped, server enforced, and always returns a draft", () => {
    const actions = read("src/app/dashboard/products/archive-actions.ts");
    const page = read("src/app/dashboard/products/deleted/page.tsx");
    const button = read("src/app/dashboard/products/deleted/RestoreProductButton.tsx");
    const sidebar = read("src/app/dashboard/DashboardSidebar.tsx");

    assert.match(actions, /export async function restoreProductAction/);
    assert.match(actions, /\.update\(\{ artist_archived_at: null, is_published: false \}\)/);
    assert.match(actions, /\.eq\("artist_id", artist\.id\)/);
    assert.match(actions, /\.gt\("artist_archived_at", productRestoreCutoff\(\)\.toISOString\(\)\)/);
    assert.match(page, /Deleted products\./);
    assert.match(page, /productRestoreCutoff/);
    assert.match(button, /Restore as draft/);
    assert.match(sidebar, /label: "Deleted products"/);
});
