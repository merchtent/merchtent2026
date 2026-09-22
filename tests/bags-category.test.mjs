import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("bags are available across the public shop and product administration", async () => {
    const [categories, homepage, categoryPage, adminActions, migration] = await Promise.all([
        read("src/lib/catalog/public-categories.ts"),
        read("src/app/HomePageClient.tsx"),
        read("src/app/category/[slug]/page.tsx"),
        read("src/app/admin/supplier-catalog/actions.ts"),
        read("supabase/migrations/202609220014_add_bags_category.sql"),
    ]);

    assert.match(categories, /"bags"/);
    assert.match(homepage, /href: "\/category\/bags"/);
    assert.match(categoryPage, /bags:\s*\{/);
    assert.match(adminActions, /"bags"/);
    assert.match(migration, /'bags'/);
});
