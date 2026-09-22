import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
    return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Print Bar Classic Tee uses the supplied standard non-Premium production breakdown", () => {
    const migration = read("supabase/migrations/202609220017_print_bar_classic_tee_standard_costs.sql");

    assert.match(migration, /supplier_product_id = '145'/);
    assert.match(migration, /supplier_provider_id = '34'/);
    assert.match(migration, /'pricing_basis', 'standard_non_premium_ex_gst'/);
    assert.match(migration, /'blank_cost_min_cents', 595/);
    assert.match(migration, /'blank_cost_max_cents', 862/);
    assert.match(migration, /'front_print_cents', 1202/);
    assert.match(migration, /'back_print_cents', 1202/);
    assert.match(migration, /'one_side_total_min_cents', 1797/);
    assert.match(migration, /'one_side_total_max_cents', 2063/);
    assert.match(migration, /'two_side_total_min_cents', 2999/);
    assert.match(migration, /'two_side_total_max_cents', 3265/);
    assert.match(migration, /additional_print_side_cents = 1202/);
});

test("Prima White Classic Tee separates its standard two-sided production subtotal", () => {
    const migration = read("supabase/migrations/202609220018_prima_classic_tee_white_standard_costs.sql");

    assert.match(migration, /supplier_product_id = '145'/);
    assert.match(migration, /supplier_provider_id = '66'/);
    assert.match(migration, /variant\.color_label = 'White'/);
    assert.match(migration, /'pricing_basis', 'standard_non_premium_ex_gst'/);
    assert.match(migration, /'blank_cost_min_cents', 511/);
    assert.match(migration, /'blank_cost_max_cents', 688/);
    assert.match(migration, /'front_print_min_cents', 434/);
    assert.match(migration, /'front_print_max_cents', 468/);
    assert.match(migration, /'back_print_min_cents', 434/);
    assert.match(migration, /'back_print_max_cents', 468/);
    assert.match(migration, /'two_side_total_min_cents', 1378/);
    assert.match(migration, /'two_side_total_max_cents', 1624/);
});
