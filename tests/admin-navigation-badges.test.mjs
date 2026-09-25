import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("Backstage Products navigation shows the active pending-review count", () => {
    const layout = read("src/app/admin/layout.tsx");

    assert.match(layout, /count: "exact", head: true/);
    assert.match(layout, /\.eq\("moderation_status", "pending_review"\)/);
    assert.match(layout, /\.is\("artist_archived_at", null\)/);
    assert.match(layout, /label: "Products", icon: Package, badge: pendingProductCount \?\? 0/);
    assert.match(layout, /products pending review/);
    assert.match(layout, /badge > 99 \? "99\+" : badge/);
});
