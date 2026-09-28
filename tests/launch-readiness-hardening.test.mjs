import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("checkout controls expose accessible names", () => {
  const checkout = read("src/app/checkout/CheckoutFormClient.tsx");
  for (const label of [
    "Email address",
    "First name",
    "Last name",
    "Address line 1",
    "Address line 2",
    "City or suburb",
    "State, province or region",
    "Postcode",
    "Phone number for delivery",
  ]) {
    assert.match(checkout, new RegExp(`aria-label=\\"${label}\\"`));
  }
});

test("customer cart surfaces do not render internal SKU values", () => {
  for (const path of [
    "src/components/MiniCartDrawer.tsx",
    "src/app/cart/CartPageClient.tsx",
    "src/app/checkout/CheckoutSummaryClient.tsx",
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /\{item\.sku\}/);
  }
});

test("production operations run on a protected recurring schedule", () => {
  const workflow = read(".github/workflows/production-operations.yml");
  assert.match(workflow, /cron: "\*\/15 \* \* \* \*"/);
  assert.match(workflow, /secrets\.OPERATIONAL_HEALTH_SECRET/);
  assert.match(workflow, /api\/health\/operations/);
  assert.match(workflow, /api\/operations\/maintenance/);
  assert.match(workflow, /audit_logged/);
});

test("production smoke accepts Vercel's consumed CDN cache headers", () => {
  const smoke = read("scripts/production-smoke.mjs");
  assert.match(smoke, /x-vercel-cache/);
  assert.match(smoke, /HIT\|MISS\|STALE\|PRERENDER\|BYPASS/);
  assert.match(smoke, /s-maxage=60/);
  assert.match(smoke, /stale-while-revalidate=300/);
});
