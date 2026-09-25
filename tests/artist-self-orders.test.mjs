import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
    ARTIST_SELF_ORDER_TYPE,
    ARTIST_BULK_DISCOUNT_THRESHOLD,
    artistBulkOrderDiscountCents,
    artistBulkUnitPriceCents,
    artistSelfOrderUnitPriceCents,
} from "../src/lib/artist-self-orders.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("artist price removes the saved cut without going negative", () => {
    assert.equal(artistSelfOrderUnitPriceCents(5_900, 1_000), 4_900);
    assert.equal(artistSelfOrderUnitPriceCents(1_000, 1_500), 0);
    assert.equal(ARTIST_SELF_ORDER_TYPE, "artist_self_order");
});

test("artist volume pricing gives 10% off at ten units only", () => {
    assert.equal(ARTIST_BULK_DISCOUNT_THRESHOLD, 10);
    assert.equal(artistBulkUnitPriceCents(2_700, 9, ARTIST_SELF_ORDER_TYPE), 2_700);
    assert.equal(artistBulkUnitPriceCents(2_700, 10, ARTIST_SELF_ORDER_TYPE), 2_430);
    assert.equal(artistBulkUnitPriceCents(2_700, 10, "retail"), 2_700);
    assert.equal(artistBulkOrderDiscountCents([
        { price_cents: 2_700, qty: 6, purchase_type: ARTIST_SELF_ORDER_TYPE },
        { price_cents: 4_700, qty: 4, purchase_type: ARTIST_SELF_ORDER_TYPE },
    ]), 3_500);
});

test("checkout recomputes artist pricing and verifies product ownership", async () => {
    const action = await read("src/app/checkout/actions.ts");
    assert.match(action, /artistSelfOrderUnitPriceCents/);
    assert.match(action, /product\.artist_id !== artist\.id/);
    assert.match(action, /Retail items and artist-priced items must be checked out separately/);
    assert.match(action, /Merch credits cannot be combined with artist pricing/);
    assert.match(action, /artistBulkUnitPriceCents/);
    assert.match(action, /artist_bulk_discount_cents/);
    assert.match(action, /isArtistSelfOrder\s*\? await productQuery/);
});

test("webhook and database preserve the no-payout order type", async () => {
    const webhook = await read("src/app/api/stripe/webhook/route.ts");
    const migration = await read("supabase/migrations/202609230001_artist_self_orders.sql");
    const bulkMigration = await read("supabase/migrations/202609240005_snapshot_artist_bulk_discounts.sql");

    assert.match(webhook, /purchase_type: productMeta\?\.purchase_type/);
    assert.match(webhook, /artist_bulk_discount_cents/);
    assert.match(migration, /new\.cashed_out := true/);
    assert.match(migration, /oi\.purchase_type = 'retail'/);
    assert.match(migration, /o\.purchase_type = 'artist_self_order'/);
    assert.match(bulkMigration, /artist_bulk_discount_cents integer not null default 0/);
    assert.match(bulkMigration, /new\.artist_bulk_discount_bps/);
});

test("artist dashboard exposes the dedicated ordering area", async () => {
    const sidebar = await read("src/app/dashboard/DashboardSidebar.tsx");
    const page = await read("src/app/dashboard/order-merch/page.tsx");
    const orderClient = await read("src/app/dashboard/order-merch/ArtistMerchOrderClient.tsx");

    assert.match(sidebar, /\/dashboard\/order-merch/);
    assert.match(page, /RRP minus your artist cut/);
    assert.match(page, /do not create a later artist payout/);
    assert.match(page, /Order 10\+ and save another 10%/);
    assert.doesNotMatch(page, /\.eq\("is_published", true\)/);
    assert.doesNotMatch(page, /\.eq\("production_status", "published"\)/);
    assert.match(page, /from\("product_colors"\)/);
    assert.match(page, /fallbackSizes/);
    assert.match(orderClient, /const \[quantity, setQuantity\] = useState\(1\)/);
    assert.match(orderClient, /}, quantity\);/);
    assert.match(orderClient, /aria-label="Decrease quantity"/);
    assert.match(orderClient, /aria-label="Increase quantity"/);
});

test("designer products snapshot the configured artist profit", async () => {
    const designerAction = await read("src/app/dashboard/products/designer/actions.ts");
    const migration = await read("supabase/migrations/202609230002_backfill_product_artist_profit.sql");

    assert.match(designerAction, /artist_cut_cents: liveCatalogProduct\.production\.artistProfitCents \?\? 0/);
    assert.match(migration, /pricing\.supplier_product_id = design\.printify_blueprint_id::text/);
    assert.match(migration, /set artist_cut_cents = pricing\.artist_profit_cents/);
});

test("blueprint pricing cascades while completed orders retain payout snapshots", async () => {
    const migration = await read("supabase/migrations/202609230003_cascade_catalog_pricing_and_snapshot_artist_cut.sql");
    const checkout = await read("src/app/checkout/actions.ts");
    const webhook = await read("src/app/api/stripe/webhook/route.ts");
    const cashOut = await read("src/app/dashboard/cash-out/page.tsx");

    assert.match(migration, /create trigger trg_supplier_catalog_pricing_cascade/);
    assert.match(migration, /design\.printify_blueprint_id::text = new\.supplier_product_id/);
    assert.match(migration, /design\.design_data->>'printSideCount' = '2'/);
    assert.match(migration, /artist_cut_cents = new\.artist_profit_cents/);
    assert.match(migration, /coalesce\(item\.qty, 0\) \* item\.artist_cut_cents/);
    assert.match(checkout, /base_artist_cut_cents: String\(artistEarnings\.baseArtistCutCents\)/);
    assert.match(checkout, /amplify_boost_cents: String\(artistEarnings\.amplifyBoostCents\)/);
    assert.match(checkout, /artist_cut_cents: String\(artistEarnings\.artistCutCents\)/);
    assert.match(webhook, /artist_cut_cents: Number\(productMeta\?\.artist_cut_cents \?\? 0\)/);
    assert.match(cashOut, /i\.artist_cut_cents \?\? 0/);
    assert.doesNotMatch(cashOut, /products \( artist_cut_cents \)/);
});
