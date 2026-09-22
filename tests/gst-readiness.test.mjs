import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("GST migration snapshots sales and supplier tax evidence", async () => {
    const migration = await read("supabase/migrations/202609210002_gst_readiness.sql");

    for (const field of [
        "gross_cents",
        "net_cents",
        "gst_cents",
        "line_gross_cents",
        "line_net_cents",
        "line_gst_cents",
        "supplier_cost_ex_gst_cents",
        "supplier_cost_gst_cents",
        "supplier_tax_invoice_reference",
    ]) {
        assert.match(migration, new RegExp(`\\b${field}\\b`));
    }

    assert.match(migration, /array\[5500000, 6500000, 7000000\]/);
    assert.match(migration, /Australia\/Sydney/);
});

test("receipt renders order snapshot as a GST-inclusive tax invoice", async () => {
    const receipt = await read("src/app/api/orders/[id]/receipt/route.ts");

    assert.match(receipt, /Tax invoice/);
    assert.match(receipt, /seller_abn/);
    assert.match(receipt, /Net/);
    assert.match(receipt, /GST/);
    assert.match(receipt, /All prices include GST/);
});

test("catalogue pricing supports preserving margins after GST", async () => {
    const catalog = await read("src/lib/supplier-catalog.ts");
    const tax = await read("src/lib/tax.ts");

    assert.match(catalog, /retailCentsForTaxSettings/);
    assert.match(tax, /preserve_margins/);
    assert.match(tax, /Australia\/Sydney/);
});
