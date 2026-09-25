import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
    ARTIST_PLANS,
    ARTIST_SUBSCRIPTIONS_ENABLED,
    calculateAmplifyArtistCut,
    canPurchaseArtistPlan,
} from "../src/lib/artist-plans.ts";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("artist dashboard presents Amplify as a disabled preview", () => {
    const sidebar = read("src/app/dashboard/DashboardSidebar.tsx");

    assert.match(sidebar, /label: "Amplify"/);
    assert.match(sidebar, /badge: "Preview"/);
    assert.match(sidebar, /disabled: true/);
    assert.match(sidebar, /aria-disabled="true"/);
    assert.doesNotMatch(sidebar, /label: "Amplify", href:/);
});

test("Amplify supports fixed or percentage earnings without changing the base cut", () => {
    assert.deepEqual(calculateAmplifyArtistCut({
        baseArtistCutCents: 800,
        retailPriceCents: 4500,
        rule: { mode: "fixed", extraCents: 200 },
    }), {
        baseArtistCutCents: 800,
        amplifyBoostCents: 200,
        artistCutCents: 1000,
    });
    assert.deepEqual(calculateAmplifyArtistCut({
        baseArtistCutCents: 800,
        retailPriceCents: 4500,
        rule: { mode: "percentage", basisPoints: 500 },
    }), {
        baseArtistCutCents: 800,
        amplifyBoostCents: 225,
        artistCutCents: 1025,
    });
});

test("Amplify backend covers subscriptions, payout snapshots, placement and promotion operations", () => {
    const migration = read("supabase/migrations/202609260001_artist_amplify.sql");
    const checkout = read("src/app/checkout/actions.ts");
    const webhook = read("src/app/api/stripe/webhook/route.ts");
    const stripeSync = read("src/lib/amplify/stripe-subscription.ts");
    const productApi = read("src/app/api/products/route.ts");
    const featuredArtists = read("src/app/api/artists/featured/route.ts");
    const adminLayout = read("src/app/admin/layout.tsx");
    const adminPage = read("src/app/admin/amplify/page.tsx");
    const checkoutRoute = read("src/app/api/stripe/amplify/checkout/route.ts");
    const portalRoute = read("src/app/api/stripe/amplify/portal/route.ts");

    assert.match(migration, /create table if not exists public\.artist_subscriptions/);
    assert.match(migration, /create table if not exists public\.artist_plan_entitlements/);
    assert.match(migration, /create table if not exists public\.artist_promotion_requests/);
    assert.match(migration, /enable row level security/);
    assert.match(migration, /sync_artist_amplify_subscription/);
    assert.match(migration, /create_amplify_promotion_request/);
    assert.match(migration, /Artist earnings snapshot does not reconcile/);
    assert.match(checkout, /base_artist_cut_cents/);
    assert.match(checkout, /amplify_boost_cents/);
    assert.match(checkout, /artist_plan_key/);
    assert.match(webhook, /isAmplifySubscriptionEvent/);
    assert.match(webhook, /checkout_type === "artist_amplify"/);
    assert.match(stripeSync, /customer\.subscription\.updated/);
    assert.match(stripeSync, /entitlements_enabled: config\.launched/);
    assert.match(productApi, /getAmplifyPriorityArtistIds/);
    assert.match(featuredArtists, /getAmplifyPriorityArtistIds/);
    assert.match(adminLayout, /href: "\/admin\/amplify"/);
    assert.match(adminPage, /Promotion requests/);
    assert.match(checkoutRoute, /mode: "subscription"/);
    assert.match(checkoutRoute, /price\.currency\.toUpperCase\(\) === "AUD"/);
    assert.match(checkoutRoute, /price\.recurring\?\.interval === "month"/);
    assert.match(checkoutRoute, /rejectCrossOriginRequest/);
    assert.match(portalRoute, /billingPortal\.sessions\.create/);
    assert.match(portalRoute, /rejectCrossOriginRequest/);
});

test("Amplify commercial terms remain deliberately inactive and unset", () => {
    const amplify = ARTIST_PLANS.amplify;

    assert.equal(ARTIST_SUBSCRIPTIONS_ENABLED, false);
    assert.equal(amplify.name, "Merch Tent Amplify");
    assert.equal(amplify.status, "preview");
    assert.equal(amplify.billingInterval, "month");
    assert.equal(amplify.monthlyPriceCents, null);
    assert.equal(amplify.extraArtistEarningsCents, null);
    assert.equal(amplify.extraArtistEarningsBasisPoints, null);
    assert.equal(canPurchaseArtistPlan(amplify), false);
    assert.ok(amplify.benefits.includes("Priority homepage placement"));
});
