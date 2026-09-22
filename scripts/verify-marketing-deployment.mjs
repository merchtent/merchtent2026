import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.VERIFICATION_APP_URL || "http://localhost:3000";

if (!url || !anonKey || !serviceKey) {
    throw new Error("Supabase verification requires URL, anon key, and service-role key.");
}

const service = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});
const anonymous = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});
const runId = crypto.randomUUID();
const sessionId = `deployment-verification-${runId}`;
const transactionId = `verification-${runId}`;
const email = `codex-verification-${runId}@example.com`;
const reviewProductId = crypto.randomUUID();
const cleanup = { eventIds: [], subscriberId: null };
const results = [];

function check(name, passed, detail) {
    results.push({ name, passed, detail });
}

async function schemaCheck(table, columns) {
    const { error } = await service.from(table).select(columns).limit(1);
    check(`${table} schema`, !error, error?.message ?? `columns available: ${columns}`);
}

try {
    await schemaCheck("marketing_events", "id,event_name,path,session_id,user_id,attribution,properties,created_at");
    await schemaCheck("orders", "id,marketing_attribution");
    await schemaCheck("profiles", "id,marketing_attribution");
    await schemaCheck("newsletter_subscribers", "id,email,utm");
    await schemaCheck("fan_shouts", "id,user_id,order_item_id,verified_purchase,reviewed_at");

    const eventResponse = await fetch(`${appUrl}/api/track/event`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: appUrl },
        body: JSON.stringify({
            event_name: "view_item",
            path: "/verification/marketing-deployment",
            session_id: sessionId,
            attribution: { utm_source: "deployment-verification", gclid: `test-${runId}` },
            properties: { verification: true },
        }),
    });
    const eventBody = await eventResponse.json();
    const { data: insertedEvent, error: insertedEventError } = await service
        .from("marketing_events")
        .select("id,attribution,properties")
        .eq("session_id", sessionId)
        .single();
    if (insertedEvent?.id) cleanup.eventIds.push(insertedEvent.id);
    check(
        "event API and attribution persistence",
        eventResponse.ok && eventBody.ok === true && !insertedEventError && insertedEvent?.attribution?.utm_source === "deployment-verification",
        insertedEventError?.message ?? `HTTP ${eventResponse.status}; attributed event found`,
    );

    const firstPurchase = await service.from("marketing_events").insert({
        event_name: "purchase",
        path: "/verification/marketing-deployment",
        session_id: sessionId,
        attribution: { utm_source: "deployment-verification" },
        properties: { transaction_id: transactionId, value: 1, currency: "AUD", verification: true },
    }).select("id").single();
    if (firstPurchase.data?.id) cleanup.eventIds.push(firstPurchase.data.id);
    const duplicatePurchase = await service.from("marketing_events").insert({
        event_name: "purchase",
        path: "/verification/marketing-deployment",
        session_id: `${sessionId}-duplicate`,
        properties: { transaction_id: transactionId, value: 1, currency: "AUD", verification: true },
    });
    check(
        "purchase transaction deduplication",
        !firstPurchase.error && duplicatePurchase.error?.code === "23505",
        duplicatePurchase.error?.code === "23505" ? "duplicate transaction rejected" : duplicatePurchase.error?.message ?? "duplicate unexpectedly accepted",
    );

    const attribution = JSON.stringify({
        first_touch: { utm_source: "deployment-verification", fbclid: `test-${runId}` },
        last_touch: { utm_campaign: "live-schema-check" },
    });
    const subscribeResponse = await fetch(`${appUrl}/api/subscribe`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: appUrl },
        body: JSON.stringify({ email, name: "Deployment verification", source: "deployment-verification", utm: attribution, consent: true }),
    });
    const subscribeBody = await subscribeResponse.json();
    const { data: subscriber, error: subscriberError } = await service
        .from("newsletter_subscribers")
        .select("id,utm")
        .eq("email", email)
        .single();
    cleanup.subscriberId = subscriber?.id ?? null;
    check(
        "subscriber attribution persistence",
        subscribeResponse.ok && subscribeBody.ok === true && !subscriberError && subscriber?.utm === attribution,
        subscriberError?.message ?? `HTTP ${subscribeResponse.status}; UTM payload retained`,
    );

    const anonymousEvents = await anonymous.from("marketing_events").select("id").limit(1);
    check("marketing event table blocks anonymous reads", Boolean(anonymousEvents.error), anonymousEvents.error ? "anonymous read rejected" : "anonymous read unexpectedly allowed");

    const anonymousAccountEvent = await anonymous.rpc("record_account_marketing_event", {
        p_event_name: "sign_up", p_attribution: {}, p_properties: {},
    });
    check("account event RPC requires authentication", Boolean(anonymousAccountEvent.error), anonymousAccountEvent.error ? "anonymous call rejected" : "anonymous call unexpectedly allowed");

    const anonymousEligibility = await anonymous.rpc("eligible_product_review_items", { p_product_id: reviewProductId });
    const noAnonymousEligibility = Boolean(anonymousEligibility.error)
        || (Array.isArray(anonymousEligibility.data) && anonymousEligibility.data.length === 0);
    check(
        "review eligibility RPC leaks no anonymous orders",
        noAnonymousEligibility,
        anonymousEligibility.error ? "anonymous call rejected" : `eligible=${anonymousEligibility.data?.length ?? "invalid"}`,
    );

    const reviewGet = await fetch(`${appUrl}/api/reviews?product_id=${reviewProductId}`);
    const reviewGetBody = await reviewGet.json();
    check("anonymous review eligibility returns no orders", reviewGet.ok && Array.isArray(reviewGetBody.eligible) && reviewGetBody.eligible.length === 0, `HTTP ${reviewGet.status}; eligible=${reviewGetBody.eligible?.length ?? "invalid"}`);

    const reviewPost = await fetch(`${appUrl}/api/reviews`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: appUrl },
        body: JSON.stringify({ order_item_id: crypto.randomUUID(), rating: 5, text: "Verification review that must not be stored." }),
    });
    check("review submission requires authentication", reviewPost.status === 401, `HTTP ${reviewPost.status}`);
} finally {
    if (cleanup.eventIds.length) {
        await service.from("marketing_events").delete().in("id", cleanup.eventIds);
    }
    if (cleanup.subscriberId) {
        await service.from("newsletter_subscribers").delete().eq("id", cleanup.subscriberId);
    }
}

const remainingEvents = await service
    .from("marketing_events")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
const remainingSubscribers = await service
    .from("newsletter_subscribers")
    .select("id", { count: "exact", head: true })
    .eq("email", email);
check("temporary event records cleaned up", !remainingEvents.error && remainingEvents.count === 0, `remaining=${remainingEvents.count ?? "unknown"}`);
check("temporary subscriber record cleaned up", !remainingSubscribers.error && remainingSubscribers.count === 0, `remaining=${remainingSubscribers.count ?? "unknown"}`);

const failed = results.filter((result) => !result.passed);
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }, null, 2));
if (failed.length) process.exitCode = 1;
