import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("customer journey tracking uses timed sessions and consent-aware server purchase confirmation", () => {
  const session = read("src/lib/marketing/session.ts");
  const pageViews = read("src/lib/usePageView.ts");
  const checkout = read("src/app/checkout/CheckoutFormClient.tsx");
  const webhook = read("src/app/api/stripe/webhook/route.ts");

  assert.match(session, /SESSION_TIMEOUT_MS = 30 \* 60 \* 1000/);
  assert.match(session, /now - stored\.last_activity_at > SESSION_TIMEOUT_MS/);
  assert.match(pageViews, /merch-tent:consent/);
  assert.match(checkout, /analytics_consent/);
  assert.match(checkout, /analytics_session_id/);
  assert.match(webhook, /session\.metadata\?\.analytics_consent === "true"/);
  assert.match(webhook, /recordPurchaseAnalytics/);
});

test("the funnel covers cart and checkout behaviour and is visible to administrators", () => {
  const events = read("src/lib/marketing/events.ts");
  const route = read("src/app/api/track/event/route.ts");
  const analytics = read("src/app/admin/analytics/page.tsx");
  const migration = read("supabase/migrations/202609280002_customer_journey_events.sql");

  for (const event of ["view_cart", "remove_from_cart", "view_checkout", "checkout_error"]) {
    assert.match(events, new RegExp(`\\| "${event}"`));
    assert.match(route, new RegExp(`"${event}"`));
    assert.match(migration, new RegExp(`'${event}'`));
  }

  assert.match(analytics, /Customer journey/);
  assert.match(analytics, /Campaign performance/);
  assert.match(analytics, /buildFunnel/);
  assert.match(analytics, /aggregateCampaigns/);
  assert.match(migration, /marketing_events_select_admin/);
});

test("marketing attribution updates the latest landing after preserving first touch", () => {
  const attribution = read("src/lib/marketing/attribution.ts");
  const previousIndex = attribution.indexOf("...previous");
  const latestIndex = attribution.indexOf("last_landing_page: landingPage");

  assert.ok(previousIndex > -1);
  assert.ok(latestIndex > previousIndex);
});
