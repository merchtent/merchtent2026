import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function filesUnder(path) {
  const root = new URL(`../${path}`, import.meta.url);
  const out = [];
  for (const entry of readdirSync(root)) {
    const childPath = `${path}/${entry}`;
    const childUrl = new URL(`../${childPath}`, import.meta.url);
    if (statSync(childUrl).isDirectory()) {
      out.push(...filesUnder(childPath));
    } else {
      out.push(childPath);
    }
  }
  return out;
}

test("Supabase migrations use unique ordered timestamped SQL filenames", () => {
  const migrationFiles = readdirSync(new URL("../supabase/migrations", import.meta.url));
  const sorted = [...migrationFiles].sort();
  const timestamps = new Set();

  assert.deepEqual(migrationFiles, sorted);

  for (const file of migrationFiles) {
    assert.match(file, /^\d{12}_[a-z0-9_]+\.sql$/, file);
    assert.ok(!timestamps.has(file.slice(0, 12)), `duplicate migration timestamp ${file}`);
    timestamps.add(file.slice(0, 12));
    assert.ok(read(`supabase/migrations/${file}`).trim().length > 0, `${file} is empty`);
  }
});

test("Supabase security definer functions pin search_path before function bodies", () => {
  const migrationFiles = readdirSync(new URL("../supabase/migrations", import.meta.url));

  for (const file of migrationFiles) {
    const sql = read(`supabase/migrations/${file}`);
    const matches = sql.matchAll(/create\s+or\s+replace\s+function\s+public\.[\s\S]*?security\s+definer[\s\S]*?as\s+\$\$/gi);

    for (const match of matches) {
      assert.match(match[0], /set\s+search_path\s*=\s*public/i, `${file} has a security definer function without a pinned search_path`);
    }
  }
});

test("Supabase tables created by migrations enable row level security", () => {
  const migrationFiles = readdirSync(new URL("../supabase/migrations", import.meta.url));
  const sql = migrationFiles.map((file) => read(`supabase/migrations/${file}`)).join("\n");
  const createdTables = new Set(
    [...sql.matchAll(/create\s+table\s+if\s+not\s+exists\s+public\.([a-z0-9_]+)/gi)]
      .map((match) => match[1])
  );

  for (const tableName of createdTables) {
    assert.match(
      sql,
      new RegExp(`alter\\s+table\\s+(if\\s+exists\\s+)?public\\.${tableName}\\s+enable\\s+row\\s+level\\s+security`, "i"),
      `${tableName} is created without enabling row level security`
    );
  }
});

test("Supabase tables created by migrations define explicit RLS policies", () => {
  const migrationFiles = readdirSync(new URL("../supabase/migrations", import.meta.url));
  const sql = migrationFiles.map((file) => read(`supabase/migrations/${file}`)).join("\n");
  const createdTables = new Set(
    [...sql.matchAll(/create\s+table\s+if\s+not\s+exists\s+public\.([a-z0-9_]+)/gi)]
      .map((match) => match[1])
  );

  for (const tableName of createdTables) {
    assert.match(
      sql,
      new RegExp(`create\\s+policy\\s+[\\s\\S]*?\\s+on\\s+public\\.${tableName}\\b`, "i"),
      `${tableName} is created without an explicit RLS policy`
    );
  }
});

test("Privileged Supabase RPCs are not executable by anonymous clients", () => {
  const migrationFiles = readdirSync(new URL("../supabase/migrations", import.meta.url));
  const sql = migrationFiles.map((file) => read(`supabase/migrations/${file}`)).join("\n");
  const privilegedFunctions = [
    "process_stripe_checkout_order",
    "subscribe_newsletter",
    "log_platform_event",
    "check_rate_limit",
    "award_merch_credits_for_order",
    "admin_adjust_merch_credits",
    "attach_merch_credit_reservation",
    "release_merch_credit_reservation",
    "redeem_merch_credit_reservation",
    "expire_merch_credit_reservations",
    "admin_update_order_status",
    "admin_mark_stale_stripe_webhooks_failed",
    "system_mark_stale_stripe_webhooks_failed",
    "system_mark_stale_notification_deliveries_failed",
    "system_mark_stale_printify_order_syncs_failed",
    "system_mark_stale_product_generations_failed",
  ];

  for (const functionName of privilegedFunctions) {
    const grantStatements = sql.match(new RegExp(`grant execute on function public\\.${functionName}\\([^;]+;`, "gi")) ?? [];

    assert.match(sql, new RegExp(`revoke all on function public\\.${functionName}\\(`, "i"));
    assert.match(sql, new RegExp(`revoke all on function public\\.${functionName}\\([\\s\\S]*? from anon`, "i"));
    assert.match(sql, new RegExp(`grant execute on function public\\.${functionName}\\([\\s\\S]*? to service_role`, "i"));

    for (const statement of grantStatements) {
      assert.doesNotMatch(statement, /\bto\s+anon\b/i);
      assert.doesNotMatch(statement, /\bto\s+anon\s*,\s*authenticated\b/i);
    }
  }
});

test("Anonymous Supabase RPC grants are limited to the intentional public API surface", () => {
  const migrationFiles = readdirSync(new URL("../supabase/migrations", import.meta.url));
  const sql = migrationFiles.map((file) => read(`supabase/migrations/${file}`)).join("\n");
  const publicRpcAllowlist = new Set([
    "check_public_rate_limit",
    "public_subscribe_newsletter",
    "public_track_page_view",
    "public_submit_contact_message",
  ]);
  const anonymousGrantStatements = sql.match(/grant execute on function public\.[^;]+;\s*/gi) ?? [];
  const hardeningMigration = read("supabase/migrations/202608230031_public_rpc_grant_hardening.sql");

  for (const statement of anonymousGrantStatements) {
    if (!/\bto\s+(anon|anon\s*,\s*authenticated|authenticated\s*,\s*anon)\b/i.test(statement)) {
      continue;
    }

    const functionName = statement.match(/public\.([a-z0-9_]+)\s*\(/i)?.[1];
    assert.ok(functionName, `could not parse anonymous RPC grant: ${statement}`);
    assert.ok(publicRpcAllowlist.has(functionName), `${functionName} should not be anonymously executable`);
  }

  assert.match(hardeningMigration, /drop function if exists public\.public_track_page_view\(text, text, text, text, uuid\)/);

  for (const functionName of publicRpcAllowlist) {
    assert.match(hardeningMigration, new RegExp(`revoke all on function public\\.${functionName}\\(`, "i"));
    assert.match(hardeningMigration, new RegExp(`revoke all on function public\\.${functionName}\\([\\s\\S]*? from anon`, "i"));
    assert.match(hardeningMigration, new RegExp(`revoke all on function public\\.${functionName}\\([\\s\\S]*? from authenticated`, "i"));
    assert.match(hardeningMigration, new RegExp(`grant execute on function public\\.${functionName}\\([\\s\\S]*? to anon, authenticated`, "i"));
  }
});

test("Stripe webhook delegates critical order invariants to the database RPC", () => {
  const route = read("src/app/api/stripe/webhook/route.ts");
  const deliveryLedger = read("src/lib/notifications/delivery-ledger.ts");
  const stripeClient = read("src/lib/stripe/client.ts");
  const checkout = read("src/app/checkout/actions.ts");
  const connect = read("src/lib/stripe/connect.ts");
  const connectAccountLink = read("src/app/api/stripe/connect/account-link/route.ts");
  const connectRefresh = read("src/app/api/stripe/connect/refresh/route.ts");
  const transfers = read("src/lib/stripe/transfers.ts");

  assert.match(stripeClient, /STRIPE_API_TIMEOUT_MS = 20_000/);
  assert.match(stripeClient, /STRIPE_MAX_NETWORK_RETRIES = 2/);
  assert.match(stripeClient, /timeout: STRIPE_API_TIMEOUT_MS/);
  assert.match(stripeClient, /maxNetworkRetries: STRIPE_MAX_NETWORK_RETRIES/);
  assert.match(route, /@\/lib\/stripe\/client/);
  assert.match(route, /@\/lib\/api\/no-store/);
  assert.match(route, /NO_STORE_HEADERS/);
  assert.match(route, /noStoreJson/);
  assert.match(route, /function getSupabaseAdmin\(\)/);
  assert.match(route, /supabaseAdminClient \?\?= getServiceSupabase\(\)/);
  assert.doesNotMatch(route, /const supabaseAdmin = getServiceSupabase\(\)/);
  assert.match(checkout, /@\/lib\/stripe\/client/);
  assert.match(connect, /@\/lib\/stripe\/client/);
  assert.match(connectAccountLink, /@\/lib\/stripe\/client/);
  assert.match(connectRefresh, /@\/lib\/stripe\/client/);
  assert.match(transfers, /@\/lib\/stripe\/client/);
  assert.doesNotMatch(route, /new Stripe\(serverEnv\.stripeSecretKey\(\)\)/);
  assert.doesNotMatch(checkout, /new Stripe\(serverEnv\.stripeSecretKey\(\)\)/);
  assert.doesNotMatch(connect, /new Stripe\(serverEnv\.stripeSecretKey\(\)\)/);
  assert.doesNotMatch(connect, /export const stripe/);
  assert.match(route, /process_stripe_checkout_order/);
  assert.match(route, /failStripeWebhookProcessing/);
  assert.match(route, /STRIPE_WEBHOOK_LINE_ITEM_FETCH_LIMIT = 100/);
  assert.match(route, /limit: STRIPE_WEBHOOK_LINE_ITEM_FETCH_LIMIT/);
  assert.match(route, /lineItems\.has_more/);
  assert.match(route, /Stripe checkout session has more line items than the webhook fetch limit/);
  assert.match(route, /Stripe Connect account snapshot update failed/);
  assert.match(route, /Stripe webhook product lookup failed/);
  assert.match(route, /Stripe checkout order RPC failed/);
  assert.doesNotMatch(route, /return NextResponse\.json/);
  assert.match(route, /headers: NO_STORE_HEADERS/);
  assert.match(route, /FINANCIAL_ATTENTION_WEBHOOKS/);
  assert.match(route, /"charge\.refunded"/);
  assert.match(route, /"charge\.dispute\.created"/);
  assert.match(route, /"charge\.dispute\.updated"/);
  assert.match(route, /"charge\.dispute\.closed"/);
  assert.match(route, /"payment_intent\.payment_failed"/);
  assert.match(route, /handleFinancialAttentionWebhook/);
  assert.match(route, /recordStripeFinancialEvent/);
  assert.match(route, /\.from\("stripe_financial_events"\)/);
  assert.match(route, /stripe_event_id: event\.id/);
  assert.match(route, /review_status: "open"/);
  assert.match(route, /Stripe financial event ledger write failed/);
  assert.match(route, /Stripe financial webhook order lookup failed/);
  assert.match(route, /financialWebhookSeverity/);
  assert.match(route, /eventType\.startsWith\("charge\.dispute\."\) \? "critical" : "error"/);
  assert.match(route, /Stripe \$\{event\.type\} webhook requires operator review\./);
  assert.match(route, /finishWebhookLedger\(event\.id, "processed"\)/);
  assert.match(route, /attention: true/);
  assert.doesNotMatch(route, /failed to process checkout order: \$\{processError\.message\}/);
  assert.doesNotMatch(route, /failed to fetch products for order_items: \$\{prodErr\.message\}/);
  assert.doesNotMatch(route, /failed to update Stripe Connect account snapshot: \$\{error\.message\}/);
  assert.doesNotMatch(route, /\.from\("orders"\)\s*[\s\S]*?\.insert\(/);
  assert.match(route, /reserveNotificationDelivery/);
  assert.match(route, /finishWebhookLedger\(event\.id, "failed"/);
  assert.match(deliveryLedger, /Number\(existing\?\.attempts \?\? 0\) \+ 1/);
  assert.match(deliveryLedger, /status === "sent" \|\| existing\?\.status === "skipped"/);
  assert.match(deliveryLedger, /failNotificationDelivery/);
  assert.match(deliveryLedger, /Notification delivery lookup failed/);
  assert.match(deliveryLedger, /Notification delivery reservation failed/);
  assert.match(deliveryLedger, /Could not reserve notification delivery\./);
  assert.doesNotMatch(deliveryLedger, /failed to read notification delivery: \$\{existingError\.message\}/);
  assert.doesNotMatch(deliveryLedger, /failed to reserve notification delivery: \$\{error\.message\}/);
});

test("Stripe checkout order RPC validates fulfillment-critical data before queuing fulfillment", () => {
  const migration = read("supabase/migrations/202608230020_checkout_order_fulfillment_validation.sql");
  const operationsPage = read("src/app/admin/operations/page.tsx");

  assert.match(migration, /create or replace function public\.process_stripe_checkout_order/);
  assert.match(migration, /complete shipping contact and address fields are required/);
  assert.match(migration, /shipping country must be a two-letter ISO country code/);
  assert.match(migration, /customer email is required for paid checkout orders/);
  assert.match(migration, /at least one checkout product line item is required/);
  assert.match(migration, /checkout line items must include stripe_line_item_id, product_id, positive qty, and non-negative unit_price_cents/);
  assert.match(migration, /on conflict on constraint fulfillment_jobs_order_id_key do update/);
  assert.match(migration, /missing_fulfillment_address/);
  assert.match(migration, /invalid_shipping_country/);
  assert.match(migration, /grant select on public\.orders_operational_exceptions to authenticated/);
  assert.match(operationsPage, /exception_reason/);
  assert.match(operationsPage, /replaceAll\("_", " "\)/);
});

test("Operational migration includes audit, reconciliation, and idempotency primitives", () => {
  const migration = read("supabase/migrations/202608230004_operational_audit_and_idempotent_orders.sql");
  const platformEvents = read("src/lib/platform-events.ts");
  const adminContentAudit = read("src/lib/admin/content-audit.ts");
  const adminExportAudit = read("src/lib/admin/export-audit.ts");
  const payoutTransfer = read("src/lib/cash-outs/stripe-transfer.ts");
  const stripeWebhook = read("src/app/api/stripe/webhook/route.ts");

  assert.match(migration, /create table if not exists public\.platform_events/);
  assert.match(migration, /create table if not exists public\.order_status_events/);
  assert.match(migration, /create table if not exists public\.fulfillment_job_events/);
  assert.match(migration, /create table if not exists public\.notification_deliveries/);
  assert.match(migration, /create or replace function public\.award_merch_credits_for_order/);
  assert.match(migration, /create or replace function public\.process_stripe_checkout_order/);
  assert.match(migration, /create or replace view public\.orders_operational_exceptions/);
  assert.match(platformEvents, /export async function recordPlatformEvent/);
  assert.match(platformEvents, /p_scope: input\.scope/);
  assert.match(platformEvents, /p_actor_user_id: input\.actorUserId/);
  assert.match(platformEvents, /throwOnFailure/);
  assert.match(platformEvents, /failurePublicMessage/);
  assert.match(adminContentAudit, /recordPlatformEvent/);
  assert.match(adminContentAudit, /throwOnFailure: true/);
  assert.match(adminContentAudit, /Could not audit admin content change\./);
  assert.match(adminExportAudit, /recordPlatformEvent/);
  assert.match(adminExportAudit, /throwOnFailure: true/);
  assert.match(adminExportAudit, /Could not audit admin export\./);
  assert.match(payoutTransfer, /recordPlatformEvent/);
  assert.match(stripeWebhook, /recordPlatformEvent/);
});

test("Merch credit redemption is ledger-backed, locked, and idempotent", () => {
  const migration = read("supabase/migrations/202608230010_merch_credit_redemption_rpc.sql");
  const adminAdjustmentMigration = read("supabase/migrations/202608230042_admin_merch_credit_adjustment_rpc.sql");
  const reservationMigration = read("supabase/migrations/202608230013_merch_credit_checkout_reservations.sql");
  const merchCreditContractMigration = read("supabase/migrations/202608230035_merch_credit_contract_constraints.sql");
  const checkoutCredits = read("src/lib/merch-credits/checkout.ts");
  const checkout = read("src/app/checkout/actions.ts");
  const checkoutForm = read("src/app/checkout/CheckoutFormClient.tsx");
  const checkoutSummary = read("src/app/checkout/CheckoutSummaryClient.tsx");
  const webhook = read("src/app/api/stripe/webhook/route.ts");
  const dashboard = read("src/app/dashboard/page.tsx");

  assert.match(migration, /create or replace function public\.redeem_merch_credits/);
  assert.match(migration, /idx_merch_credit_ledger_redemption_idempotency/);
  assert.match(migration, /for update/);
  assert.match(migration, /insufficient merch credits/);
  assert.match(migration, /points_balance = points_balance - p_points/);
  assert.match(migration, /redeemed_points = redeemed_points \+ p_points/);
  assert.match(migration, /'redemption'/);
  assert.match(migration, /grant execute on function public\.redeem_merch_credits/);
  assert.match(adminAdjustmentMigration, /create unique index if not exists idx_merch_credit_ledger_manual_adjustment_idempotency/);
  assert.match(adminAdjustmentMigration, /create or replace function public\.admin_adjust_merch_credits/);
  assert.match(adminAdjustmentMigration, /p_actor_user_id is null or not exists/);
  assert.match(adminAdjustmentMigration, /p\.role = 'admin'/);
  assert.match(adminAdjustmentMigration, /where user_id = p_user_id\s+for update/);
  assert.match(adminAdjustmentMigration, /adjustment would make merch credit balance negative/);
  assert.match(adminAdjustmentMigration, /reason = 'manual_adjustment'/);
  assert.match(adminAdjustmentMigration, /idempotency_key = v_clean_idempotency_key/);
  assert.match(adminAdjustmentMigration, /points_balance = points_balance \+ p_points/);
  assert.match(adminAdjustmentMigration, /lifetime_points = case/);
  assert.match(adminAdjustmentMigration, /redeemed_points = case/);
  assert.match(adminAdjustmentMigration, /public\.log_platform_event/);
  assert.match(adminAdjustmentMigration, /admin_merch_credit_adjusted/);
  assert.match(adminAdjustmentMigration, /grant execute on function public\.admin_adjust_merch_credits/);
  assert.doesNotMatch(adminAdjustmentMigration, /to authenticated/);
  assert.match(reservationMigration, /create table if not exists public\.merch_credit_reservations/);
  assert.match(reservationMigration, /create or replace function public\.reserve_merch_credits/);
  assert.match(reservationMigration, /for update/);
  assert.match(reservationMigration, /insufficient available merch credits/);
  assert.match(reservationMigration, /create or replace function public\.redeem_merch_credit_reservation/);
  assert.match(reservationMigration, /public\.redeem_merch_credits/);
  assert.match(reservationMigration, /grant execute on function public\.redeem_merch_credit_reservation/);
  assert.match(checkoutCredits, /MERCH_CREDIT_REDEMPTION_POINTS = 20/);
  assert.match(checkoutCredits, /logger\.error/);
  assert.match(checkoutCredits, /failMerchCreditOperation/);
  assert.match(checkoutCredits, /Could not update merch credits\./);
  assert.match(checkoutCredits, /merch credit reservation rpc failed/);
  assert.match(checkoutCredits, /merch credit reservation redeem rpc failed/);
  assert.match(checkoutCredits, /reserveMerchCreditsForCheckout/);
  assert.match(checkoutCredits, /attachMerchCreditReservationToStripeSession/);
  assert.match(checkoutCredits, /redeemMerchCreditReservation/);
  assert.doesNotMatch(checkoutCredits, /throw new Error\(error\.message\)/);
  assert.match(checkout, /reserveMerchCreditsForCheckout/);
  assert.match(checkout, /stripe\.coupons\.create/);
  assert.match(checkout, /discounts: merchCreditCouponId/);
  assert.match(checkout, /merch_credit_reservation_id/);
  assert.match(checkout, /releaseMerchCreditReservation/);
  assert.match(checkoutForm, /use_merch_credits/);
  assert.match(checkoutForm, /Credits are reserved for this checkout and only redeemed after payment succeeds/);
  assert.match(checkoutSummary, /Merch credits/);
  assert.match(webhook, /redeemMerchCreditReservation/);
  assert.match(webhook, /merch_credit_reservation_redeemed/);
  assert.match(webhook, /merch_credit_reservation_redemption_failed/);
  assert.match(webhook, /session\.total_details\?\.amount_discount/);
  assert.match(dashboard, /reserved at checkout/);
  assert.match(merchCreditContractMigration, /merch_credit_ledger_reason_points_contract_check/);
  assert.match(merchCreditContractMigration, /reason = 'order_earned' and points > 0/);
  assert.match(merchCreditContractMigration, /reason = 'redemption' and points < 0/);
  assert.match(merchCreditContractMigration, /reason = 'manual_adjustment' and points <> 0/);
  assert.match(merchCreditContractMigration, /merch_credit_reservations_currency_contract_check/);
  assert.match(merchCreditContractMigration, /\^\[A-Z\]\{3\}\$/);
  assert.match(merchCreditContractMigration, /merch_credit_reservations_terminal_timestamp_check/);
  assert.match(merchCreditContractMigration, /status = 'reserved' and redeemed_at is null and released_at is null/);
  assert.match(merchCreditContractMigration, /status = 'redeemed' and redeemed_at is not null/);
  assert.match(merchCreditContractMigration, /status in \('released', 'expired'\) and released_at is not null/);
  assert.match(merchCreditContractMigration, /not valid/);
});

test("Operations dashboard surfaces stale fulfillment SLA exceptions", () => {
  const migration = read("supabase/migrations/202608230009_fulfillment_operational_exceptions.sql");
  const fulfillmentTerminalStatesMigration = read("supabase/migrations/202608230023_fulfillment_job_terminal_states.sql");
  const payoutMigration = read("supabase/migrations/202608230011_payout_operational_exceptions.sql");
  const payoutReconciliationMigration = read("supabase/migrations/202608230038_payout_reconciliation_exceptions.sql");
  const productGenerationMigration = read("supabase/migrations/202608230012_product_generation_operational_exceptions.sql");
  const merchCreditMigration = read("supabase/migrations/202608230014_merch_credit_operational_exceptions.sql");
  const merchCreditBalanceReconciliationMigration = read("supabase/migrations/202608230037_merch_credit_balance_reconciliation.sql");
  const staleWebhookCleanupMigration = read("supabase/migrations/202608230027_admin_stale_webhook_cleanup_rpc.sql");
  const systemWebhookCleanupMigration = read("supabase/migrations/202608230028_system_stale_webhook_cleanup_rpc.sql");
  const systemNotificationCleanupMigration = read("supabase/migrations/202608230029_system_stale_notification_cleanup_rpc.sql");
  const systemPrintifyOrderSyncCleanupMigration = read("supabase/migrations/202608230030_system_stale_printify_order_sync_cleanup_rpc.sql");
  const systemPrintifyProductSyncCleanupMigration = read("supabase/migrations/202608230043_system_stale_printify_product_sync_cleanup_rpc.sql");
  const systemProductGenerationCleanupMigration = read("supabase/migrations/202608230032_stale_product_generation_cleanup.sql");
  const productModerationMigration = read("supabase/migrations/202608230039_product_moderation_state.sql");
  const stripeFinancialEventsMigration = read("supabase/migrations/202608230041_stripe_financial_events.sql");
  const operationsPage = read("src/app/admin/operations/page.tsx");
  const operationsActions = read("src/app/admin/operations/actions.ts");
  const adminCsv = read("src/lib/admin/csv.ts");
  const adminFulfillmentPage = read("src/app/admin/fulfillment/page.tsx");
  const adminFulfillmentExport = read("src/app/api/admin/fulfillment/export/route.ts");
  const adminPayoutsExport = read("src/app/api/admin/payouts/export/route.ts");
  const adminMerchCreditsExport = read("src/app/api/admin/merch-credits/export/route.ts");
  const adminPlatformEventsExport = read("src/app/api/admin/platform-events/export/route.ts");
  const adminStripeFinancialEventsExport = read("src/app/api/admin/stripe-financial-events/export/route.ts");
  const maintenanceRoute = read("src/app/api/operations/maintenance/route.ts");
  const checklist = read("PRODUCTION_RELEASE_CHECKLIST.md");
  const runbook = read("PRODUCTION_OPERATIONS_RUNBOOK.md");
  const operationsSecret = read("src/lib/auth/operations-secret.ts");
  const clientIp = read("src/lib/api/client-ip.ts");
  const expireCreditButton = read("src/app/admin/operations/ExpireCreditReservationsButton.tsx");
  const adjustMerchCreditsForm = read("src/app/admin/operations/AdjustMerchCreditsForm.tsx");
  const retryNotificationButton = read("src/app/admin/operations/RetryNotificationButton.tsx");
  const markStaleWebhooksButton = read("src/app/admin/operations/MarkStaleWebhooksFailedButton.tsx");
  const markStaleProductGenerationsButton = read("src/app/admin/operations/MarkStaleProductGenerationsFailedButton.tsx");
  const retryPayoutButton = read("src/app/admin/operations/RetryPayoutButton.tsx");
  const repairProductGenerationButton = read("src/app/admin/operations/RepairProductGenerationButton.tsx");
  const submitFulfillmentButton = read("src/app/admin/operations/SubmitFulfillmentExceptionButton.tsx");
  const retryPrintifyOrderSyncButton = read("src/app/admin/operations/RetryPrintifyOrderSyncButton.tsx");
  const reviewStripeFinancialEventButton = read("src/app/admin/operations/ReviewStripeFinancialEventButton.tsx");
  const orderConfirmation = read("src/lib/notifications/order-confirmation.ts");

  assert.match(migration, /create or replace view public\.fulfillment_operational_exceptions/);
  assert.match(migration, /pending_over_24h/);
  assert.match(migration, /in_progress_over_48h/);
  assert.match(fulfillmentTerminalStatesMigration, /add column if not exists failed_at/);
  assert.match(fulfillmentTerminalStatesMigration, /status in \('pending', 'in_progress', 'completed', 'failed', 'cancelled'\)/);
  assert.match(fulfillmentTerminalStatesMigration, /fulfillment_failed/);
  assert.match(fulfillmentTerminalStatesMigration, /fj\.status = 'failed'/);
  assert.match(payoutMigration, /create or replace view public\.payout_operational_exceptions/);
  assert.match(payoutMigration, /transfer_failed/);
  assert.match(payoutMigration, /transfer_processing_over_24h/);
  assert.match(payoutReconciliationMigration, /create or replace view public\.payout_operational_exceptions/);
  assert.match(payoutReconciliationMigration, /left join public\.artist_transfers/);
  assert.match(payoutReconciliationMigration, /cash_out_missing_transfer_over_24h/);
  assert.match(payoutReconciliationMigration, /cash_out_paid_without_succeeded_transfer/);
  assert.match(payoutReconciliationMigration, /transfer_succeeded_cash_out_not_paid/);
  assert.match(payoutReconciliationMigration, /cash_out_transfer_failed_without_failed_transfer/);
  assert.match(payoutReconciliationMigration, /grant select on public\.payout_operational_exceptions/);
  assert.match(productGenerationMigration, /create or replace view public\.product_generation_operational_exceptions/);
  assert.match(productGenerationMigration, /published_without_design/);
  assert.match(productGenerationMigration, /missing_front_print_asset/);
  assert.match(productGenerationMigration, /missing_storefront_mockup/);
  assert.match(systemProductGenerationCleanupMigration, /create or replace view public\.product_generation_operational_exceptions/);
  assert.match(systemProductGenerationCleanupMigration, /generation_failed/);
  assert.match(systemProductGenerationCleanupMigration, /generation_stale/);
  assert.match(systemProductGenerationCleanupMigration, /p\.production_status = 'generating'/);
  assert.match(merchCreditMigration, /create or replace function public\.expire_merch_credit_reservations/);
  assert.match(merchCreditMigration, /create or replace view public\.merch_credit_operational_exceptions/);
  assert.match(merchCreditMigration, /expired_reserved_credits/);
  assert.match(merchCreditMigration, /paid_order_with_unredeemed_credits/);
  assert.match(merchCreditMigration, /credit_redemption_failed/);
  assert.match(merchCreditMigration, /grant select on public\.merch_credit_operational_exceptions/);
  assert.match(merchCreditBalanceReconciliationMigration, /create or replace view public\.merch_credit_balance_reconciliation_exceptions/);
  assert.match(merchCreditBalanceReconciliationMigration, /ledger_points_balance/);
  assert.match(merchCreditBalanceReconciliationMigration, /ledger_lifetime_points/);
  assert.match(merchCreditBalanceReconciliationMigration, /ledger_redeemed_points/);
  assert.match(merchCreditBalanceReconciliationMigration, /points_balance_mismatch/);
  assert.match(merchCreditBalanceReconciliationMigration, /lifetime_points_mismatch/);
  assert.match(merchCreditBalanceReconciliationMigration, /redeemed_points_mismatch/);
  assert.match(merchCreditBalanceReconciliationMigration, /grant select on public\.merch_credit_balance_reconciliation_exceptions/);
  assert.match(staleWebhookCleanupMigration, /create or replace function public\.admin_mark_stale_stripe_webhooks_failed/);
  assert.match(staleWebhookCleanupMigration, /security definer/);
  assert.match(staleWebhookCleanupMigration, /p\.role = 'admin'/);
  assert.match(staleWebhookCleanupMigration, /for update skip locked/);
  assert.match(staleWebhookCleanupMigration, /p_limit < 1 or p_limit > 500/);
  assert.match(staleWebhookCleanupMigration, /status = 'failed'/);
  assert.match(staleWebhookCleanupMigration, /stale_stripe_webhooks_marked_failed/);
  assert.match(staleWebhookCleanupMigration, /grant execute on function public\.admin_mark_stale_stripe_webhooks_failed/);
  assert.match(systemWebhookCleanupMigration, /create or replace function public\.system_mark_stale_stripe_webhooks_failed/);
  assert.match(systemWebhookCleanupMigration, /security definer/);
  assert.match(systemWebhookCleanupMigration, /for update skip locked/);
  assert.match(systemWebhookCleanupMigration, /scheduled_stale_stripe_webhooks_marked_failed/);
  assert.match(systemWebhookCleanupMigration, /grant execute on function public\.system_mark_stale_stripe_webhooks_failed/);
  assert.match(systemNotificationCleanupMigration, /create or replace function public\.system_mark_stale_notification_deliveries_failed/);
  assert.match(systemNotificationCleanupMigration, /security definer/);
  assert.match(systemNotificationCleanupMigration, /status = 'pending'/);
  assert.match(systemNotificationCleanupMigration, /for update skip locked/);
  assert.match(systemNotificationCleanupMigration, /stale_pending_timeout/);
  assert.match(systemNotificationCleanupMigration, /scheduled_stale_notification_deliveries_marked_failed/);
  assert.match(systemNotificationCleanupMigration, /grant execute on function public\.system_mark_stale_notification_deliveries_failed/);
  assert.match(systemPrintifyOrderSyncCleanupMigration, /create or replace function public\.system_mark_stale_printify_order_syncs_failed/);
  assert.match(systemPrintifyOrderSyncCleanupMigration, /security definer/);
  assert.match(systemPrintifyOrderSyncCleanupMigration, /status = 'started'/);
  assert.match(systemPrintifyOrderSyncCleanupMigration, /for update skip locked/);
  assert.match(systemPrintifyOrderSyncCleanupMigration, /Scheduled maintenance marked stale Printify order syncs as failed\./);
  assert.match(systemPrintifyOrderSyncCleanupMigration, /scheduled_stale_printify_order_syncs_marked_failed/);
  assert.match(systemPrintifyOrderSyncCleanupMigration, /grant execute on function public\.system_mark_stale_printify_order_syncs_failed/);
  assert.match(systemPrintifyProductSyncCleanupMigration, /create or replace function public\.system_mark_stale_printify_product_syncs_failed/);
  assert.match(systemPrintifyProductSyncCleanupMigration, /security definer/);
  assert.match(systemPrintifyProductSyncCleanupMigration, /pd\.printify_status = 'syncing'/);
  assert.match(systemPrintifyProductSyncCleanupMigration, /for update skip locked/);
  assert.match(systemPrintifyProductSyncCleanupMigration, /printify_status = 'failed'/);
  assert.match(systemPrintifyProductSyncCleanupMigration, /insert into public\.printify_sync_events/);
  assert.match(systemPrintifyProductSyncCleanupMigration, /scheduled_stale_printify_product_syncs_marked_failed/);
  assert.match(systemPrintifyProductSyncCleanupMigration, /grant execute on function public\.system_mark_stale_printify_product_syncs_failed/);
  assert.match(systemProductGenerationCleanupMigration, /create or replace function public\.system_mark_stale_product_generations_failed/);
  assert.match(systemProductGenerationCleanupMigration, /security definer/);
  assert.match(systemProductGenerationCleanupMigration, /for update skip locked/);
  assert.match(systemProductGenerationCleanupMigration, /production_status = 'failed'/);
  assert.match(systemProductGenerationCleanupMigration, /Scheduled maintenance marked stale product generations as failed\./);
  assert.match(systemProductGenerationCleanupMigration, /scheduled_stale_product_generations_marked_failed/);
  assert.match(systemProductGenerationCleanupMigration, /grant execute on function public\.system_mark_stale_product_generations_failed/);
  assert.match(productModerationMigration, /add column if not exists moderation_status/);
  assert.match(productModerationMigration, /products_moderation_status_contract_check/);
  assert.match(productModerationMigration, /'pending_review'/);
  assert.match(productModerationMigration, /'approved'/);
  assert.match(productModerationMigration, /'blocked'/);
  assert.match(productModerationMigration, /products_blocked_moderation_publish_contract_check/);
  assert.match(productModerationMigration, /products_moderation_review_contract_check/);
  assert.match(productModerationMigration, /published_pending_moderation/);
  assert.match(productModerationMigration, /blocked_product_published/);
  assert.match(productModerationMigration, /idx_products_moderation_status_created_at/);
  assert.match(stripeFinancialEventsMigration, /create table if not exists public\.stripe_financial_events/);
  assert.match(stripeFinancialEventsMigration, /stripe_event_id text not null unique/);
  assert.match(stripeFinancialEventsMigration, /review_status text not null default 'open'/);
  assert.match(stripeFinancialEventsMigration, /stripe_financial_events_review_status_check/);
  assert.match(stripeFinancialEventsMigration, /alter table public\.stripe_financial_events enable row level security/);
  assert.match(stripeFinancialEventsMigration, /stripe_financial_events_select_admin/);
  assert.match(stripeFinancialEventsMigration, /stripe_financial_events_update_admin/);
  assert.match(stripeFinancialEventsMigration, /revoke all on public\.stripe_financial_events from anon/);
  assert.match(operationsPage, /fulfillment_operational_exceptions/);
  assert.match(operationsPage, /Fulfillment SLA Exceptions/);
  assert.match(operationsPage, /STALE_PRINTIFY_ORDER_SYNC_MINUTES = 30/);
  assert.match(operationsPage, /SEVERE_PLATFORM_EVENT_WINDOW_HOURS = 24/);
  assert.match(operationsPage, /severePlatformEventCutoff/);
  assert.match(operationsPage, /\.in\("severity", \["error", "critical"\]\)/);
  assert.match(operationsPage, /\.gte\("created_at", severePlatformEventCutoff\)/);
  assert.match(operationsPage, /severePlatformEventCount/);
  assert.match(operationsPage, /Severe events/);
  assert.match(operationsPage, /stalePrintifyOrderSyncCutoff/);
  assert.match(operationsPage, /printify_order_syncs/);
  assert.match(operationsPage, /Printify Order Sync Exceptions/);
  assert.match(operationsPage, /No failed or stale Printify order syncs detected\./);
  assert.match(operationsPage, /RetryPrintifyOrderSyncButton/);
  assert.match(operationsPage, /orderId=\{String\(sync\.order_id\)\}/);
  assert.match(operationsPage, /Printify sync/);
  assert.match(operationsPage, /STALE_WEBHOOK_PROCESSING_MINUTES = 15/);
  assert.match(operationsPage, /STALE_NOTIFICATION_PENDING_MINUTES = 15/);
  assert.match(operationsPage, /staleWebhookCutoff/);
  assert.match(operationsPage, /\.eq\("status", "processing"\)/);
  assert.match(operationsPage, /\.lt\("processing_started_at", staleWebhookCutoff\)/);
  assert.match(operationsPage, /staleNotificationCutoff/);
  assert.match(operationsPage, /\.eq\("status", "pending"\)/);
  assert.match(operationsPage, /\.lt\("created_at", staleNotificationCutoff\)/);
  assert.match(operationsPage, /No failed or stale webhook events/);
  assert.match(operationsPage, /No failed or stale pending notifications/);
  assert.match(operationsPage, /payout_operational_exceptions/);
  assert.match(operationsPage, /Payout Exceptions/);
  assert.match(operationsPage, /No failed, stale, or inconsistent payout records detected\./);
  assert.match(operationsPage, /payout\.transfer_id \?\? payout\.cash_out_id/);
  assert.match(operationsPage, /\/api\/admin\/payouts\/export/);
  assert.match(operationsPage, /stripe_financial_events/);
  assert.match(operationsPage, /\.in\("review_status", \["open", "investigating"\]\)/);
  assert.match(operationsPage, /Stripe Financial Review/);
  assert.match(operationsPage, /No unresolved refund, dispute, or payment failure events/);
  assert.match(operationsPage, /Financial review/);
  assert.match(operationsPage, /\/api\/admin\/stripe-financial-events\/export/);
  assert.match(operationsPage, /ReviewStripeFinancialEventButton/);
  assert.match(operationsPage, /status="investigating"/);
  assert.match(operationsPage, /status="resolved"/);
  assert.match(operationsPage, /status="ignored"/);
  assert.match(operationsActions, /export async function reviewStripeFinancialEvent/);
  assert.match(operationsActions, /requireAdminAction/);
  assert.match(operationsActions, /STRIPE_FINANCIAL_REVIEW_STATUSES/);
  assert.match(operationsActions, /Invalid Stripe financial review status\./);
  assert.match(operationsActions, /\.from\("stripe_financial_events"\)/);
  assert.match(operationsActions, /resolved_at: status === "resolved" \|\| status === "ignored" \? now : null/);
  assert.match(operationsActions, /resolved_by: status === "resolved" \|\| status === "ignored" \? user\.id : null/);
  assert.match(operationsActions, /recordPlatformEvent/);
  assert.match(operationsActions, /scope: "stripe_financial_review"/);
  assert.match(operationsActions, /action: `stripe_financial_event_\$\{status\}`/);
  assert.match(operationsActions, /Admin updated Stripe financial event review status\./);
  assert.match(operationsActions, /Stripe financial event review update failed/);
  assert.match(operationsActions, /Could not audit Stripe financial review\./);
  assert.match(reviewStripeFinancialEventButton, /reviewStripeFinancialEvent/);
  assert.match(reviewStripeFinancialEventButton, /useTransition/);
  assert.match(reviewStripeFinancialEventButton, /Financial review updated/);
  assert.match(reviewStripeFinancialEventButton, /type ReviewStatus = "investigating" \| "resolved" \| "ignored"/);
  assert.match(reviewStripeFinancialEventButton, /CircleSlash2/);
  assert.match(reviewStripeFinancialEventButton, /Resolution note/);
  assert.match(reviewStripeFinancialEventButton, /Investigation note/);
  assert.match(reviewStripeFinancialEventButton, /Ignore reason/);
  assert.match(reviewStripeFinancialEventButton, /label: "Ignore"/);
  assert.match(operationsPage, /Export CSV/);
  assert.match(operationsPage, /Download/);
  assert.match(operationsPage, /product_generation_operational_exceptions/);
  assert.match(operationsPage, /production_status/);
  assert.match(operationsPage, /moderation_status/);
  assert.match(operationsPage, /Moderation \{product\.moderation_status \?\? "unknown"\}/);
  assert.match(operationsPage, /readiness_notes/);
  assert.match(operationsPage, /Product Generation Exceptions/);
  assert.match(operationsPage, /merch_credit_operational_exceptions/);
  assert.match(operationsPage, /merch_credit_balance_reconciliation_exceptions/);
  assert.match(operationsPage, /MerchCreditBalanceReconciliationException/);
  assert.match(operationsPage, /ledger_points_balance/);
  assert.match(operationsPage, /No stale reservations or credit balance mismatches detected\./);
  assert.match(operationsPage, /Merch Credit Exceptions/);
  assert.match(operationsPage, /\/api\/admin\/merch-credits\/export/);
  assert.match(operationsPage, /Credit issues/);
  assert.match(operationsPage, /Dashboard Data Issues/);
  assert.match(operationsPage, /queryFailures\.length/);
  assert.match(operationsPage, /Admin operations page query failed/);
  assert.match(operationsPage, /Could not load one or more operational data sources\./);
  assert.match(operationsPage, /Recent Platform Events/);
  assert.match(operationsPage, /\/api\/admin\/platform-events\/export/);
  assert.doesNotMatch(operationsPage, /message: .*\.error\?\.message/);
  assert.doesNotMatch(operationsPage, /failure\.message/);
  assert.match(adminFulfillmentPage, /Admin fulfillment page failed to load jobs/);
  assert.match(adminFulfillmentPage, /Could not load fulfillment jobs\. Check platform logs for details\./);
  assert.match(adminFulfillmentPage, /printify_order_syncs/);
  assert.match(adminFulfillmentPage, /Admin fulfillment page failed to load Printify sync ledger/);
  assert.match(adminFulfillmentPage, /Could not load Printify sync status\. Check platform logs for details\./);
  assert.match(adminFulfillmentPage, /Printify Sync/);
  assert.match(adminFulfillmentPage, /truncateOperationalMessage/);
  assert.match(adminFulfillmentPage, /Not submitted/);
  assert.match(adminFulfillmentPage, /\/api\/admin\/fulfillment\/export/);
  assert.match(adminFulfillmentPage, /Export CSV/);
  assert.match(adminFulfillmentPage, /Download/);
  assert.doesNotMatch(adminFulfillmentPage, /Failed to load fulfillment jobs: \{error\.message\}/);
  assert.match(adminFulfillmentExport, /export const runtime = "nodejs"/);
  assert.match(adminFulfillmentExport, /export const dynamic = "force-dynamic"/);
  assert.match(adminFulfillmentExport, /export async function GET\(request: Request\)/);
  assert.match(adminFulfillmentExport, /requireAdmin\(request\)/);
  assert.match(adminFulfillmentExport, /getServiceSupabase/);
  assert.match(adminFulfillmentExport, /\.from\("fulfillment_jobs"\)/);
  assert.match(adminFulfillmentExport, /\.from\("printify_order_syncs"\)/);
  assert.match(adminFulfillmentExport, /\.limit\(10_000\)/);
  assert.match(adminFulfillmentExport, /NO_STORE_HEADERS/);
  assert.match(adminFulfillmentExport, /Content-Disposition/);
  assert.match(adminFulfillmentExport, /attachment; filename=/);
  assert.match(adminFulfillmentExport, /text\/csv; charset=utf-8/);
  assert.match(adminFulfillmentExport, /X-Robots-Tag/);
  assert.match(adminFulfillmentExport, /noindex, noarchive/);
  assert.match(adminFulfillmentExport, /FULFILLMENT_EXPORT_HEADERS/);
  assert.match(adminFulfillmentExport, /fulfillment_job_id/);
  assert.match(adminFulfillmentExport, /printify_order_id/);
  assert.match(adminFulfillmentExport, /Admin fulfillment export failed/);
  assert.match(adminFulfillmentExport, /Admin fulfillment export Printify sync lookup failed/);
  assert.match(adminFulfillmentExport, /Could not export fulfillment jobs\./);
  assert.match(adminFulfillmentExport, /Could not export fulfillment sync status\./);
  assert.match(adminFulfillmentExport, /recordAdminExportAuditEvent/);
  assert.match(adminFulfillmentExport, /exportName: "fulfillment"/);
  assert.match(adminFulfillmentExport, /rowCount: jobs\.length/);
  assert.match(adminFulfillmentExport, /printify_sync_rows/);
  assert.match(adminFulfillmentExport, /Admin fulfillment export audit failed/);
  assert.match(adminFulfillmentExport, /Could not audit fulfillment export\./);
  assert.match(adminFulfillmentExport, /@\/lib\/admin\/csv/);
  assert.match(adminFulfillmentExport, /\.map\(csvCell\)/);
  assert.doesNotMatch(adminFulfillmentExport, /return noStoreJson\(\{ error: error\.message/);
  assert.match(adminPayoutsExport, /export const runtime = "nodejs"/);
  assert.match(adminPayoutsExport, /export const dynamic = "force-dynamic"/);
  assert.match(adminPayoutsExport, /export async function GET\(request: Request\)/);
  assert.match(adminPayoutsExport, /requireAdmin\(request\)/);
  assert.match(adminPayoutsExport, /getServiceSupabase/);
  assert.match(adminPayoutsExport, /\.from\("cash_outs"\)/);
  assert.match(adminPayoutsExport, /\.from\("artist_transfers"\)/);
  assert.match(adminPayoutsExport, /\.limit\(10_000\)/);
  assert.match(adminPayoutsExport, /NO_STORE_HEADERS/);
  assert.match(adminPayoutsExport, /Content-Disposition/);
  assert.match(adminPayoutsExport, /attachment; filename=/);
  assert.match(adminPayoutsExport, /text\/csv; charset=utf-8/);
  assert.match(adminPayoutsExport, /X-Robots-Tag/);
  assert.match(adminPayoutsExport, /noindex, noarchive/);
  assert.match(adminPayoutsExport, /PAYOUT_EXPORT_HEADERS/);
  assert.match(adminPayoutsExport, /cash_out_id/);
  assert.match(adminPayoutsExport, /stripe_transfer_id/);
  assert.match(adminPayoutsExport, /destination_account_id/);
  assert.match(adminPayoutsExport, /Admin payouts export failed/);
  assert.match(adminPayoutsExport, /Admin payouts export transfer lookup failed/);
  assert.match(adminPayoutsExport, /Could not export payouts\./);
  assert.match(adminPayoutsExport, /Could not export payout transfer status\./);
  assert.match(adminPayoutsExport, /recordAdminExportAuditEvent/);
  assert.match(adminPayoutsExport, /exportName: "payouts"/);
  assert.match(adminPayoutsExport, /rowCount: cashOuts\.length/);
  assert.match(adminPayoutsExport, /transfer_rows/);
  assert.match(adminPayoutsExport, /Admin payouts export audit failed/);
  assert.match(adminPayoutsExport, /Could not audit payouts export\./);
  assert.match(adminPayoutsExport, /@\/lib\/admin\/csv/);
  assert.match(adminPayoutsExport, /\.map\(csvCell\)/);
  assert.doesNotMatch(adminPayoutsExport, /return noStoreJson\(\{ error: error\.message/);
  assert.match(adminMerchCreditsExport, /export const runtime = "nodejs"/);
  assert.match(adminMerchCreditsExport, /export const dynamic = "force-dynamic"/);
  assert.match(adminMerchCreditsExport, /export async function GET\(request: Request\)/);
  assert.match(adminMerchCreditsExport, /requireAdmin\(request\)/);
  assert.match(adminMerchCreditsExport, /getServiceSupabase/);
  assert.match(adminMerchCreditsExport, /\.from\("merch_credit_balances"\)/);
  assert.match(adminMerchCreditsExport, /\.from\("merch_credit_reservations"\)/);
  assert.match(adminMerchCreditsExport, /\.from\("merch_credit_balance_reconciliation_exceptions"\)/);
  assert.match(adminMerchCreditsExport, /\.eq\("status", "reserved"\)/);
  assert.match(adminMerchCreditsExport, /\.limit\(10_000\)/);
  assert.match(adminMerchCreditsExport, /NO_STORE_HEADERS/);
  assert.match(adminMerchCreditsExport, /Content-Disposition/);
  assert.match(adminMerchCreditsExport, /attachment; filename=/);
  assert.match(adminMerchCreditsExport, /text\/csv; charset=utf-8/);
  assert.match(adminMerchCreditsExport, /X-Robots-Tag/);
  assert.match(adminMerchCreditsExport, /noindex, noarchive/);
  assert.match(adminMerchCreditsExport, /MERCH_CREDIT_EXPORT_HEADERS/);
  assert.match(adminMerchCreditsExport, /points_balance/);
  assert.match(adminMerchCreditsExport, /active_reserved_points/);
  assert.match(adminMerchCreditsExport, /active_reserved_discount_cents/);
  assert.match(adminMerchCreditsExport, /available_points_after_reservations/);
  assert.match(adminMerchCreditsExport, /redemption_units_20_points/);
  assert.match(adminMerchCreditsExport, /reconciliation_status/);
  assert.match(adminMerchCreditsExport, /Admin merch credits export failed/);
  assert.match(adminMerchCreditsExport, /Admin merch credits export reservation lookup failed/);
  assert.match(adminMerchCreditsExport, /Admin merch credits export reconciliation lookup failed/);
  assert.match(adminMerchCreditsExport, /Could not export merch credits\./);
  assert.match(adminMerchCreditsExport, /Could not export merch credit reservations\./);
  assert.match(adminMerchCreditsExport, /Could not export merch credit reconciliation\./);
  assert.match(adminMerchCreditsExport, /recordAdminExportAuditEvent/);
  assert.match(adminMerchCreditsExport, /exportName: "merch_credits"/);
  assert.match(adminMerchCreditsExport, /rowCount: balances\.length/);
  assert.match(adminMerchCreditsExport, /active_reservation_users/);
  assert.match(adminMerchCreditsExport, /reconciliation_exception_users/);
  assert.match(adminMerchCreditsExport, /Admin merch credits export audit failed/);
  assert.match(adminMerchCreditsExport, /Could not audit merch credits export\./);
  assert.match(adminMerchCreditsExport, /@\/lib\/admin\/csv/);
  assert.match(adminMerchCreditsExport, /\.map\(csvCell\)/);
  assert.doesNotMatch(adminMerchCreditsExport, /return noStoreJson\(\{ error: error\.message/);
  assert.match(adminPlatformEventsExport, /export const runtime = "nodejs"/);
  assert.match(adminPlatformEventsExport, /export const dynamic = "force-dynamic"/);
  assert.match(adminPlatformEventsExport, /export async function GET\(request: Request\)/);
  assert.match(adminPlatformEventsExport, /requireAdmin\(request\)/);
  assert.match(adminPlatformEventsExport, /getServiceSupabase/);
  assert.match(adminPlatformEventsExport, /\.from\("platform_events"\)/);
  assert.match(adminPlatformEventsExport, /\.order\("created_at", \{ ascending: false \}\)/);
  assert.match(adminPlatformEventsExport, /\.limit\(10_000\)/);
  assert.match(adminPlatformEventsExport, /NO_STORE_HEADERS/);
  assert.match(adminPlatformEventsExport, /Content-Disposition/);
  assert.match(adminPlatformEventsExport, /attachment; filename=/);
  assert.match(adminPlatformEventsExport, /text\/csv; charset=utf-8/);
  assert.match(adminPlatformEventsExport, /X-Robots-Tag/);
  assert.match(adminPlatformEventsExport, /noindex, noarchive/);
  assert.match(adminPlatformEventsExport, /PLATFORM_EVENT_EXPORT_HEADERS/);
  assert.match(adminPlatformEventsExport, /metadata_json/);
  assert.match(adminPlatformEventsExport, /safeMetadataJson/);
  assert.match(adminPlatformEventsExport, /JSON\.stringify\(metadata\)/);
  assert.match(adminPlatformEventsExport, /Admin platform events export failed/);
  assert.match(adminPlatformEventsExport, /Could not export platform events\./);
  assert.match(adminPlatformEventsExport, /recordAdminExportAuditEvent/);
  assert.match(adminPlatformEventsExport, /exportName: "platform_events"/);
  assert.match(adminPlatformEventsExport, /rowCount: events\.length/);
  assert.match(adminPlatformEventsExport, /Admin platform events export audit failed/);
  assert.match(adminPlatformEventsExport, /Could not audit platform events export\./);
  assert.match(adminPlatformEventsExport, /@\/lib\/admin\/csv/);
  assert.match(adminPlatformEventsExport, /\.map\(csvCell\)/);
  assert.doesNotMatch(adminPlatformEventsExport, /return noStoreJson\(\{ error: error\.message/);
  assert.match(adminStripeFinancialEventsExport, /export const runtime = "nodejs"/);
  assert.match(adminStripeFinancialEventsExport, /export const dynamic = "force-dynamic"/);
  assert.match(adminStripeFinancialEventsExport, /export async function GET\(request: Request\)/);
  assert.match(adminStripeFinancialEventsExport, /requireAdmin\(request\)/);
  assert.match(adminStripeFinancialEventsExport, /getServiceSupabase/);
  assert.match(adminStripeFinancialEventsExport, /\.from\("stripe_financial_events"\)/);
  assert.match(adminStripeFinancialEventsExport, /\.order\("received_at", \{ ascending: false \}\)/);
  assert.match(adminStripeFinancialEventsExport, /\.limit\(10_000\)/);
  assert.match(adminStripeFinancialEventsExport, /NO_STORE_HEADERS/);
  assert.match(adminStripeFinancialEventsExport, /Content-Disposition/);
  assert.match(adminStripeFinancialEventsExport, /attachment; filename=/);
  assert.match(adminStripeFinancialEventsExport, /text\/csv; charset=utf-8/);
  assert.match(adminStripeFinancialEventsExport, /X-Robots-Tag/);
  assert.match(adminStripeFinancialEventsExport, /noindex, noarchive/);
  assert.match(adminStripeFinancialEventsExport, /STRIPE_FINANCIAL_EVENT_EXPORT_HEADERS/);
  assert.match(adminStripeFinancialEventsExport, /stripe_event_id/);
  assert.match(adminStripeFinancialEventsExport, /review_status/);
  assert.match(adminStripeFinancialEventsExport, /amount_refunded/);
  assert.match(adminStripeFinancialEventsExport, /resolution_notes/);
  assert.match(adminStripeFinancialEventsExport, /Admin Stripe financial events export failed/);
  assert.match(adminStripeFinancialEventsExport, /Could not export Stripe financial events\./);
  assert.match(adminStripeFinancialEventsExport, /recordAdminExportAuditEvent/);
  assert.match(adminStripeFinancialEventsExport, /exportName: "stripe_financial_events"/);
  assert.match(adminStripeFinancialEventsExport, /rowCount: events\.length/);
  assert.match(adminStripeFinancialEventsExport, /Admin Stripe financial events export audit failed/);
  assert.match(adminStripeFinancialEventsExport, /Could not audit Stripe financial events export\./);
  assert.match(adminStripeFinancialEventsExport, /@\/lib\/admin\/csv/);
  assert.match(adminStripeFinancialEventsExport, /\.map\(csvCell\)/);
  assert.doesNotMatch(adminStripeFinancialEventsExport, /return noStoreJson\(\{ error: error\.message/);
  assert.match(adminCsv, /FORMULA_PREFIX_PATTERN/);
  assert.match(adminCsv, /\^\[=\+\\-@\\t\\r\]/);
  assert.match(adminCsv, /FORMULA_PREFIX_PATTERN\.test\(value\) \? `'\$\{value\}` : value/);
  assert.match(adminCsv, /safeValue\.replaceAll\('"', '""'\)/);
  assert.match(operationsPage, /ExpireCreditReservationsButton/);
  assert.match(operationsPage, /AdjustMerchCreditsForm/);
  assert.match(operationsActions, /expireStaleMerchCreditReservations/);
  assert.match(operationsActions, /expire_merch_credit_reservations/);
  assert.match(operationsActions, /stale_merch_credit_reservations_expired/);
  assert.match(operationsActions, /Could not expire stale merch credit reservations\./);
  assert.match(operationsActions, /Could not audit merch credit cleanup\./);
  assert.match(operationsActions, /export async function adjustMerchCredits/);
  assert.match(operationsActions, /UUID_PATTERN/);
  assert.match(operationsActions, /admin_adjust_merch_credits/);
  assert.match(operationsActions, /p_actor_user_id: user\.id/);
  assert.match(operationsActions, /p_user_id: targetUserId/);
  assert.match(operationsActions, /p_points: points/);
  assert.match(operationsActions, /p_idempotency_key: idempotencyKey/);
  assert.match(operationsActions, /Admin merch credit adjustment failed/);
  assert.match(operationsActions, /Could not adjust merch credits\./);
  assert.doesNotMatch(operationsActions, /throw new Error\(error\.message\)/);
  assert.match(adjustMerchCreditsForm, /"use client"/);
  assert.match(adjustMerchCreditsForm, /adjustMerchCredits/);
  assert.match(adjustMerchCreditsForm, /useTransition/);
  assert.match(adjustMerchCreditsForm, /useToast/);
  assert.match(adjustMerchCreditsForm, /Manual credit adjustment/);
  assert.match(adjustMerchCreditsForm, /Credit adjustment failed/);
  assert.match(adjustMerchCreditsForm, /setUserId\(""\)/);
  assert.match(adjustMerchCreditsForm, /setPoints\(""\)/);
  assert.match(adjustMerchCreditsForm, /setDescription\(""\)/);
  assert.match(operationsActions, /requireAdminAction/);
  assert.doesNotMatch(operationsActions, /profile\?\.role !== "admin"/);
  assert.match(operationsActions, /retryOrderNotification/);
  assert.match(operationsActions, /sendOrderConfirmationEmail/);
  assert.match(operationsActions, /sendOrderConfirmationSms/);
  assert.match(operationsActions, /delivery\.channel !== "email" && delivery\.channel !== "sms"/);
  assert.match(operationsActions, /markStaleStripeWebhooksFailed/);
  assert.match(operationsActions, /STALE_WEBHOOK_PROCESSING_MINUTES = 15/);
  assert.match(operationsActions, /admin_mark_stale_stripe_webhooks_failed/);
  assert.match(operationsActions, /p_actor_user_id: user\.id/);
  assert.match(operationsActions, /p_stale_after_minutes: STALE_WEBHOOK_PROCESSING_MINUTES/);
  assert.doesNotMatch(operationsActions, /\.from\("stripe_webhook_events"\)[\s\S]*?\.update\(/);
  assert.doesNotMatch(operationsActions, /stale_stripe_webhooks_marked_failed/);
  assert.match(operationsActions, /markStaleProductGenerationsFailed/);
  assert.match(operationsActions, /STALE_PRODUCT_GENERATION_MINUTES = 30/);
  assert.match(operationsActions, /system_mark_stale_product_generations_failed/);
  assert.match(operationsActions, /admin_stale_product_generations_checked/);
  assert.match(operationsActions, /Could not mark stale product generations as failed\./);
  assert.match(operationsActions, /Could not audit stale product generation cleanup\./);
  assert.match(maintenanceRoute, /export async function POST/);
  assert.match(maintenanceRoute, /serverEnv\.operationalHealthSecret/);
  assert.match(maintenanceRoute, /hasValidOperationalSecret/);
  assert.match(maintenanceRoute, /getClientIp/);
  assert.match(maintenanceRoute, /checkDurableRateLimit/);
  assert.match(maintenanceRoute, /MAINTENANCE_RATE_LIMIT = 20/);
  assert.match(maintenanceRoute, /MAINTENANCE_RATE_WINDOW_MS = 60 \* 1000/);
  assert.match(maintenanceRoute, /`operations_maintenance:\$\{ip\}`/);
  assert.match(maintenanceRoute, /"check_rate_limit"/);
  assert.match(maintenanceRoute, /fallback: "deny"/);
  assert.match(maintenanceRoute, /status: "rate_limited"/);
  assert.match(maintenanceRoute, /type MaintenanceTask/);
  assert.match(maintenanceRoute, /taskRunners\.map\(runMaintenanceTask\)/);
  assert.match(maintenanceRoute, /async function runMaintenanceTask/);
  assert.match(maintenanceRoute, /async function logMaintenanceRun/);
  assert.match(maintenanceRoute, /recordPlatformEvent/);
  assert.match(maintenanceRoute, /scope: "maintenance"/);
  assert.match(maintenanceRoute, /scheduled_maintenance_completed/);
  assert.match(maintenanceRoute, /scheduled_maintenance_failed/);
  assert.match(maintenanceRoute, /severity: ok \? "info" : "error"/);
  assert.match(maintenanceRoute, /task_count: tasks\.length/);
  assert.match(maintenanceRoute, /failed_tasks: tasks\.filter/);
  assert.match(maintenanceRoute, /scheduled maintenance platform event failed/);
  assert.match(maintenanceRoute, /const auditOk = await logMaintenanceRun\(supabase, tasks, tasksOk\)/);
  assert.match(maintenanceRoute, /const ok = tasksOk && auditOk/);
  assert.match(maintenanceRoute, /status: ok \? "ok" : auditOk \? "failed" : "audit_failed"/);
  assert.match(maintenanceRoute, /audit_logged: auditOk/);
  assert.match(maintenanceRoute, /throwOnFailure: true/);
  assert.match(maintenanceRoute, /Could not audit scheduled maintenance run\./);
  assert.match(maintenanceRoute, /scheduled maintenance audit failed/);
  assert.match(maintenanceRoute, /duration_ms: number/);
  assert.match(maintenanceRoute, /const startedAt = performance\.now\(\)/);
  assert.match(maintenanceRoute, /duration_ms: Math\.round\(performance\.now\(\) - startedAt\)/);
  assert.match(maintenanceRoute, /const durationMs = Math\.round\(performance\.now\(\) - startedAt\)/);
  assert.match(maintenanceRoute, /duration_ms: durationMs/);
  assert.match(maintenanceRoute, /scheduled maintenance task crashed/);
  assert.match(maintenanceRoute, /expire_merch_credit_reservations/);
  assert.match(maintenanceRoute, /system_mark_stale_stripe_webhooks_failed/);
  assert.match(maintenanceRoute, /STALE_WEBHOOK_BATCH_LIMIT = 100/);
  assert.match(maintenanceRoute, /system_mark_stale_notification_deliveries_failed/);
  assert.match(maintenanceRoute, /STALE_NOTIFICATION_PENDING_MINUTES = 15/);
  assert.match(maintenanceRoute, /STALE_NOTIFICATION_BATCH_LIMIT = 100/);
  assert.match(maintenanceRoute, /mark_stale_notification_deliveries_failed/);
  assert.match(maintenanceRoute, /Stale notification cleanup failed\./);
  assert.match(maintenanceRoute, /system_mark_stale_printify_order_syncs_failed/);
  assert.match(maintenanceRoute, /STALE_PRINTIFY_ORDER_SYNC_MINUTES = 30/);
  assert.match(maintenanceRoute, /STALE_PRINTIFY_ORDER_SYNC_BATCH_LIMIT = 100/);
  assert.match(maintenanceRoute, /mark_stale_printify_order_syncs_failed/);
  assert.match(maintenanceRoute, /Stale Printify order sync cleanup failed\./);
  assert.match(maintenanceRoute, /system_mark_stale_printify_product_syncs_failed/);
  assert.match(maintenanceRoute, /STALE_PRINTIFY_PRODUCT_SYNC_MINUTES = 30/);
  assert.match(maintenanceRoute, /STALE_PRINTIFY_PRODUCT_SYNC_BATCH_LIMIT = 100/);
  assert.match(maintenanceRoute, /mark_stale_printify_product_syncs_failed/);
  assert.match(maintenanceRoute, /Stale Printify product sync cleanup failed\./);
  assert.match(maintenanceRoute, /system_mark_stale_product_generations_failed/);
  assert.match(maintenanceRoute, /STALE_PRODUCT_GENERATION_MINUTES = 30/);
  assert.match(maintenanceRoute, /STALE_PRODUCT_GENERATION_BATCH_LIMIT = 100/);
  assert.match(maintenanceRoute, /mark_stale_product_generations_failed/);
  assert.match(maintenanceRoute, /Stale product generation cleanup failed\./);
  assert.match(checklist, /stale credit, webhook, notification, Printify product sync, Printify order sync, and product generation cleanup tasks/);
  assert.match(checklist, /zero unresolved Stripe financial review events/);
  assert.match(checklist, /stripe_financial_events/);
  assert.match(checklist, /\/api\/admin\/stripe-financial-events\/export/);
  assert.match(checklist, /Sensitive CSV exports create `admin_export` platform events/);
  assert.match(runbook, /stale pending notification deliveries/);
  assert.match(runbook, /stale Printify product sync attempts/);
  assert.match(runbook, /stale Printify order sync attempts/);
  assert.match(runbook, /stale product generations/);
  assert.match(runbook, /stripe_financial_events/);
  assert.match(runbook, /financial review/);
  assert.match(runbook, /Mark the event `investigating`/);
  assert.match(runbook, /`resolved` only after/);
  assert.match(runbook, /\/api\/admin\/stripe-financial-events\/export/);
  assert.match(runbook, /sensitive CSV export creates an `admin_export` platform event/);
  assert.match(runbook, /\/api\/admin\/merch-credits\/export/);
  assert.match(runbook, /liability snapshots/);
  assert.match(maintenanceRoute, /@\/lib\/api\/no-store/);
  assert.match(maintenanceRoute, /noStoreJson/);
  assert.doesNotMatch(maintenanceRoute, /NextResponse\.json/);
  assert.match(operationsSecret, /timingSafeEqual/);
  assert.match(operationsSecret, /x-merch-tent-ops-secret/);
  assert.match(operationsSecret, /authorization/);
  assert.match(operationsSecret, /\^Bearer\\s\+/);
  assert.match(clientIp, /x-forwarded-for/);
  assert.match(clientIp, /x-real-ip/);
  assert.match(clientIp, /cf-connecting-ip/);
  assert.match(operationsActions, /retryPayoutTransfer/);
  assert.match(operationsActions, /sendCashOutStripeTransfer/);
  assert.match(operationsActions, /typedCashOut\.status === "paid"/);
  assert.match(operationsActions, /transferError/);
  assert.match(operationsActions, /Payout retry transfer ledger lookup failed/);
  assert.match(operationsActions, /Could not load payout transfer ledger\./);
  assert.match(operationsActions, /Payout retry payment account lookup failed/);
  assert.match(operationsActions, /transfer\?\.status === "succeeded"/);
  assert.match(operationsActions, /payouts_enabled/);
  assert.match(operationsActions, /details_submitted/);
  assert.match(operationsActions, /repairProductGeneration/);
  assert.match(operationsActions, /repairProductGenerationAssets/);
  assert.match(operationsActions, /submitFulfillmentException/);
  assert.match(operationsActions, /submitFulfillmentJobToPrintify/);
  assert.match(operationsActions, /retryPrintifyOrderSync/);
  assert.match(operationsActions, /attemptPrintifyFulfillmentForOrder\(orderId\)/);
  assert.match(operationsActions, /Printify order sync retry failed/);
  assert.match(operationsActions, /Could not retry Printify order sync\./);
  assert.match(operationsActions, /revalidatePath\(`\/admin\/orders\/\$\{orderId\}`\)/);
  assert.match(expireCreditButton, /Expire stale reservations/);
  assert.match(expireCreditButton, /useToast/);
  assert.match(retryNotificationButton, /Retry notification/);
  assert.match(retryNotificationButton, /retryOrderNotification/);
  assert.match(markStaleWebhooksButton, /Mark stale processing failed/);
  assert.match(markStaleWebhooksButton, /markStaleStripeWebhooksFailed/);
  assert.match(markStaleProductGenerationsButton, /Mark stale generations failed/);
  assert.match(markStaleProductGenerationsButton, /markStaleProductGenerationsFailed/);
  assert.match(retryPayoutButton, /Retry payout/);
  assert.match(retryPayoutButton, /retryPayoutTransfer/);
  assert.match(repairProductGenerationButton, /Repair generation/);
  assert.match(repairProductGenerationButton, /repairProductGeneration/);
  assert.match(submitFulfillmentButton, /Submit Printify/);
  assert.match(submitFulfillmentButton, /submitFulfillmentException/);
  assert.match(retryPrintifyOrderSyncButton, /Retry Printify sync/);
  assert.match(retryPrintifyOrderSyncButton, /retryPrintifyOrderSync/);
  assert.match(retryPrintifyOrderSyncButton, /useToast/);
  assert.match(operationsPage, /RetryNotificationButton/);
  assert.match(operationsPage, /MarkStaleWebhooksFailedButton/);
  assert.match(operationsPage, /MarkStaleProductGenerationsFailedButton/);
  assert.match(operationsPage, /RetryPayoutButton/);
  assert.match(operationsPage, /RepairProductGenerationButton/);
  assert.match(operationsPage, /SubmitFulfillmentExceptionButton/);
  assert.match(operationsPage, /RetryPrintifyOrderSyncButton/);
  assert.match(operationsPage, /delivery\.channel === "email" \|\| delivery\.channel === "sms"/);
  assert.match(orderConfirmation, /order:\$\{typedOrder\.id\}:email:confirmation/);
  assert.match(orderConfirmation, /order:\$\{typedOrder\.id\}:sms:confirmation/);
  assert.match(orderConfirmation, /recordPlatformEvent/);
  assert.match(orderConfirmation, /scope: "notifications"/);
  assert.match(orderConfirmation, /actorUserId: input\.actorUserId/);
  assert.match(orderConfirmation, /Notification platform event failed/);
  assert.match(orderConfirmation, /buildOrderEmailPayloadFromStripe/);
  assert.match(orderConfirmation, /order_email_resent/);
  assert.match(orderConfirmation, /order_email_retry_failed/);
  assert.match(orderConfirmation, /Order confirmation email order lookup failed/);
  assert.match(orderConfirmation, /Order confirmation email send failed/);
  assert.match(orderConfirmation, /Could not send order confirmation email\./);
  assert.match(orderConfirmation, /sendOrderConfirmationSms/);
  assert.match(orderConfirmation, /sendSms\(phone, smsMessage/);
  assert.match(orderConfirmation, /order_sms_resent/);
  assert.match(orderConfirmation, /order_sms_retry_failed/);
  assert.match(orderConfirmation, /Order confirmation SMS order lookup failed/);
  assert.match(orderConfirmation, /Order confirmation SMS send failed/);
  assert.match(orderConfirmation, /Could not send order confirmation SMS\./);
  assert.doesNotMatch(orderConfirmation, /throw sendError/);
  assert.doesNotMatch(orderConfirmation, /error\?\.message \?\? "Order not found\."/);
});

test("Critical order and payout paths use structured logging", () => {
  const webhook = read("src/app/api/stripe/webhook/route.ts");
  const transfers = read("src/lib/cash-outs/stripe-transfer.ts");
  const artistCashOutHistory = read("src/app/dashboard/cash-outs/page.tsx");
  const logger = read("src/lib/logger.ts");
  const adminOrderStatus = read("src/app/api/admin/orders/[id]/status/route.ts");
  const adminOrderStatusMigration = read("supabase/migrations/202608230024_admin_order_status_rpc.sql");
  const adminFulfillment = read("src/app/admin/fulfillment/actions.ts");
  const operationsActions = read("src/app/admin/operations/actions.ts");
  const artistCashOut = read("src/app/dashboard/cash-out/server-actions.ts");
  const artistCashOutRetry = read("src/app/dashboard/cash-outs/server-actions.ts");
  const sms = read("src/lib/sms.ts");
  const pageView = read("src/app/api/track/page-view/route.ts");
  const testPostmark = read("src/app/api/test-postmark/route.ts");
  const stripeConnectAccountLink = read("src/app/api/stripe/connect/account-link/route.ts");
  const stripeConnectRefresh = read("src/app/api/stripe/connect/refresh/route.ts");
  const payoutContractMigration = read("supabase/migrations/202608230036_payout_contract_constraints.sql");

  assert.match(logger, /SENSITIVE_KEY_PATTERN/);
  assert.match(logger, /stripe\[_-\]\?\(account\|session\|payment\[_-\]\?intent\|transfer\)\[_-\]\?id/);
  assert.match(logger, /session\[_-\]\?id/);
  assert.match(logger, /user\[_-\]\?id/);
  assert.match(logger, /redactLogValue/);
  assert.match(logger, /redactLogString/);
  assert.match(logger, /SENSITIVE_VALUE_PATTERNS/);
  assert.match(logger, /REDACTED_EMAIL/);
  assert.match(logger, /REDACTED_STRIPE_SECRET/);
  assert.match(logger, /REDACTED_STRIPE_WEBHOOK_SECRET/);
  assert.match(logger, /REDACTED_JWT/);
  assert.match(logger, /"\[REDACTED\]"/);
  assert.match(logger, /"\[Circular\]"/);
  assert.match(webhook, /logger\.error/);
  assert.match(webhook, /logger\.warn/);
  assert.doesNotMatch(webhook, /console\.(error|warn|log)/);
  assert.match(webhook, /function buildOrderSmsMessage/);
  assert.match(webhook, /buildOrderSmsMessage\(\{/);
  assert.match(webhook, /Merch Tent:/);
  assert.match(webhook, /We'll send tracking once it ships\./);
  assert.doesNotMatch(webhook, /Merch Tent 🎸/);
  assert.doesNotMatch(webhook, /ships 📦/);
  assert.match(transfers, /logger\.error/);
  assert.match(transfers, /failCashOutTransfer/);
  assert.match(transfers, /Could not process cash-out transfer\./);
  assert.match(transfers, /recordPlatformEvent/);
  assert.match(transfers, /scope: "payouts"/);
  assert.match(transfers, /cash_out_transfer_attempted/);
  assert.match(transfers, /cash_out_transfer_succeeded/);
  assert.match(transfers, /cash_out_transfer_failed/);
  assert.match(stripeConnectAccountLink, /recordPlatformEvent/);
  assert.match(stripeConnectAccountLink, /scope: "payouts"/);
  assert.match(stripeConnectAccountLink, /stripe_connect_account_created/);
  assert.match(stripeConnectAccountLink, /stripe_connect_account_synced/);
  assert.match(stripeConnectAccountLink, /stripe_connect_onboarding_link_created/);
  assert.match(stripeConnectAccountLink, /throwOnFailure: true/);
  assert.match(stripeConnectAccountLink, /Could not audit Stripe Connect account state\./);
  assert.match(stripeConnectAccountLink, /Could not audit Stripe Connect onboarding\./);
  assert.doesNotMatch(stripeConnectAccountLink, /metadata:\s*\{[\s\S]{0,240}link\.url/);
  assert.match(stripeConnectRefresh, /recordPlatformEvent/);
  assert.match(stripeConnectRefresh, /scope: "payouts"/);
  assert.match(stripeConnectRefresh, /stripe_connect_account_refreshed/);
  assert.match(stripeConnectRefresh, /throwOnFailure: true/);
  assert.match(stripeConnectRefresh, /Could not audit Stripe Connect refresh\./);
  assert.match(webhook, /handleStripeAccountUpdated/);
  assert.match(webhook, /\.select\("artist_id"\)/);
  assert.match(webhook, /\.maybeSingle\(\)/);
  assert.match(webhook, /Stripe Connect account snapshot update matched no artist payment account/);
  assert.match(webhook, /stripe_connect_account_webhook_synced/);
  assert.match(webhook, /Stripe Connect account state was synced from account\.updated webhook\./);
  assert.match(webhook, /Stripe Connect account webhook platform event failed/);
  assert.match(webhook, /Could not audit Stripe Connect account webhook sync\./);
  assert.match(transfers, /existingTransferError/);
  assert.match(transfers, /typedExistingTransfer\?\.status === "succeeded"/);
  assert.match(transfers, /cash_out_transfer_already_succeeded/);
  assert.match(transfers, /Cash-out paid status repair failed for already-succeeded transfer/);
  assert.match(transfers, /Cash-out transfer ledger is succeeded without a Stripe transfer id/);
  assert.match(transfers, /throw new Error\("Cash-out transfer ledger is missing the Stripe transfer id\."\)/);
  assert.match(transfers, /transferFailureUpdateError/);
  assert.match(transfers, /cashOutFailureUpdateError/);
  assert.match(transfers, /Cash-out transfer failure ledger update failed/);
  assert.match(transfers, /Cash-out failure status update failed/);
  assert.match(payoutContractMigration, /cash_outs_status_contract_check/);
  assert.match(payoutContractMigration, /status in \('pending', 'paid', 'transfer_failed'\)/);
  assert.match(payoutContractMigration, /cash_outs_total_positive_check/);
  assert.match(payoutContractMigration, /total_cents > 0/);
  assert.match(payoutContractMigration, /artist_transfers_currency_contract_check/);
  assert.match(payoutContractMigration, /\^\[A-Z\]\{3\}\$/);
  assert.match(payoutContractMigration, /artist_transfers_state_timestamp_contract_check/);
  assert.match(payoutContractMigration, /status = 'processing' and attempted_at is not null and stripe_transfer_id is null/);
  assert.match(payoutContractMigration, /status = 'succeeded'/);
  assert.match(payoutContractMigration, /succeeded_at is not null/);
  assert.match(payoutContractMigration, /status = 'failed'/);
  assert.match(payoutContractMigration, /failed_at is not null/);
  assert.match(payoutContractMigration, /not valid/);
  assert.match(artistCashOutHistory, /artistSafeTransferFailureMessage/);
  assert.match(artistCashOutHistory, /transferActivityLabel/);
  assert.match(artistCashOutHistory, /formatDateTime/);
  assert.match(artistCashOutHistory, /failure_code/);
  assert.match(artistCashOutHistory, /attempted_at, succeeded_at, failed_at, created_at, updated_at/);
  assert.match(artistCashOutHistory, /Paid \$\{formatDateTime\(transfer\.succeeded_at\)\}/);
  assert.match(artistCashOutHistory, /Failed \$\{formatDateTime\(transfer\.failed_at\)\}/);
  assert.match(artistCashOutHistory, /Attempted \$\{formatDateTime\(transfer\.attempted_at\)\}/);
  assert.match(artistCashOutHistory, /transferActivityLabel\(transfer\)/);
  assert.match(artistCashOutHistory, /transfer\.stripe_transfer_id/);
  assert.match(artistCashOutHistory, /Stripe needs updated payout details before this cash out can be paid\./);
  assert.match(artistCashOutHistory, /This cash out transfer failed\. Please retry or contact support if it keeps failing\./);
  assert.match(artistCashOutHistory, /const safeFailureMessage = artistSafeTransferFailureMessage\(transfer\)/);
  assert.doesNotMatch(artistCashOutHistory, /\{transfer\.failure_message\}/);
  assert.doesNotMatch(transfers, /throw existingTransferError/);
  assert.doesNotMatch(transfers, /throw cashOutRepairError/);
  assert.doesNotMatch(transfers, /throw ledgerError/);
  assert.doesNotMatch(transfers, /throw transferUpdateError/);
  assert.doesNotMatch(transfers, /throw cashOutUpdateError/);
  assert.doesNotMatch(transfers, /throw error;/);
  assert.doesNotMatch(transfers, /console\.(error|warn|log)/);
  assert.match(artistCashOut, /logger\.error/);
  assert.match(artistCashOut, /requireArtistAction/);
  assert.doesNotMatch(artistCashOut, /supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(artistCashOut, /\.from\("artists"\)/);
  assert.match(artistCashOut, /CASH_OUT_CREATE_LIMIT = 5/);
  assert.match(artistCashOut, /checkDurableRateLimit/);
  assert.match(artistCashOut, /cash_out_create:\$\{user\.id\}/);
  assert.match(artistCashOut, /check_public_rate_limit/);
  assert.match(artistCashOut, /fallback: "deny"/);
  assert.match(artistCashOut, /Too many cash-out attempts\. Try again later\./);
  assert.match(artistCashOut, /cash out payment account lookup failed/);
  assert.match(artistCashOut, /Could not load Stripe payout account\./);
  assert.match(artistCashOut, /Could not create cash out\./);
  assert.match(artistCashOut, /Could not send cash out to Stripe\./);
  assert.doesNotMatch(artistCashOut, /throw paymentAccountError/);
  assert.doesNotMatch(artistCashOut, /throw error;/);
  assert.match(artistCashOutRetry, /logger\.error/);
  assert.match(artistCashOutRetry, /requireArtistAction/);
  assert.doesNotMatch(artistCashOutRetry, /supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(artistCashOutRetry, /\.from\("artists"\)/);
  assert.match(artistCashOutRetry, /CASH_OUT_RETRY_LIMIT = 10/);
  assert.match(artistCashOutRetry, /checkDurableRateLimit/);
  assert.match(artistCashOutRetry, /cash_out_retry:\$\{user\.id\}/);
  assert.match(artistCashOutRetry, /check_public_rate_limit/);
  assert.match(artistCashOutRetry, /fallback: "deny"/);
  assert.match(artistCashOutRetry, /Too many cash-out retry attempts\. Try again later\./);
  assert.match(artistCashOutRetry, /cash out retry lookup failed/);
  assert.match(artistCashOutRetry, /Could not load cash out\./);
  assert.match(artistCashOutRetry, /Could not retry cash out transfer\./);
  assert.doesNotMatch(artistCashOutRetry, /throw artistError/);
  assert.doesNotMatch(artistCashOutRetry, /throw cashOutError/);
  assert.doesNotMatch(artistCashOutRetry, /throw paymentAccountError/);
  assert.match(adminOrderStatusMigration, /admin_order_status_updated/);
  assert.match(adminOrderStatus, /logger\.error/);
  assert.match(adminOrderStatus, /admin_update_order_status/);
  assert.match(adminOrderStatus, /Could not update order status\./);
  assert.doesNotMatch(adminOrderStatus, /\.from\("orders"\)\s*[\s\S]*?\.update\(/);
  assert.doesNotMatch(adminOrderStatus, /\.from\("order_status_events"\)\s*[\s\S]*?\.insert\(/);
  assert.doesNotMatch(adminOrderStatus, /message: error\.message/);
  assert.doesNotMatch(adminOrderStatus, /console\.(error|warn|log)/);
  assert.match(adminFulfillment, /admin_fulfillment_status_updated/);
  assert.match(adminFulfillment, /logger\.error/);
  assert.match(adminFulfillment, /insertFulfillmentJobEvent/);
  assert.match(adminFulfillment, /Admin fulfillment job event insert failed/);
  assert.match(adminFulfillment, /Could not update fulfillment status\./);
  assert.match(adminFulfillment, /Admin fulfillment job lookup failed/);
  assert.match(adminFulfillment, /Could not submit fulfillment job to Printify\./);
  assert.match(adminFulfillment, /recordPlatformEvent/);
  assert.match(adminFulfillment, /scope: "fulfillment"/);
  assert.match(adminFulfillment, /Could not audit fulfillment status update\./);
  assert.match(adminFulfillment, /Could not audit Printify fulfillment submission\./);
  assert.match(adminFulfillment, /Admin Printify fulfillment failure platform event failed/);
  assert.match(adminFulfillment, /Could not audit Printify fulfillment failure\./);
  assert.doesNotMatch(adminFulfillment, /throw new Error\([A-Za-z0-9_]+\.message\)/);
  assert.doesNotMatch(adminFulfillment, /throw jobError/);
  assert.doesNotMatch(operationsActions, /throw new Error\(error\.message\)/);
  assert.doesNotMatch(operationsActions, /throw new Error\(transferError\.message\)/);
  assert.doesNotMatch(operationsActions, /throw new Error\([A-Za-z0-9_]+Error\?\.message/);
  assert.match(sms, /logger\.error/);
  assert.match(sms, /SMS_REQUEST_TIMEOUT_MS = 15_000/);
  assert.match(sms, /AbortSignal\.timeout\(SMS_REQUEST_TIMEOUT_MS\)/);
  assert.match(sms, /if \(!res\.ok\)/);
  assert.match(sms, /throw new Error\(`MobileMessage request failed with \$\{res\.status\}`\)/);
  assert.match(sms, /Could not send SMS message\./);
  assert.doesNotMatch(sms, /throw err/);
  assert.doesNotMatch(sms, /logger\.error\("SMS send failed", \{[\s\S]*?\bto[,}]/);
  assert.doesNotMatch(sms, /console\.(error|warn|log)/);
  assert.match(pageView, /logger\.error/);
  assert.doesNotMatch(pageView, /console\.(error|warn|log)/);
  assert.match(testPostmark, /logger\.error/);
  assert.doesNotMatch(testPostmark, /console\.(error|warn|log)/);
});

test("Admin order operations use persisted tracking fields and expose status audit history", () => {
  const adminOrderStatus = read("src/app/api/admin/orders/[id]/status/route.ts");
  const adminOrderStatusMigration = read("supabase/migrations/202608230024_admin_order_status_rpc.sql");
  const preserveTrackingMigration = read("supabase/migrations/202608230044_preserve_order_tracking_on_status_update.sql");
  const orderStatusUpdater = read("src/components/admin/OrderStatusUpdater.tsx");
  const adminOrders = read("src/app/admin/orders/page.tsx");
  const adminDashboard = read("src/app/admin/page.tsx");
  const adminOrderDetail = read("src/app/admin/orders/[id]/page.tsx");
  const adminOrdersExport = read("src/app/api/admin/orders/export/route.ts");
  const adminExportAudit = read("src/lib/admin/export-audit.ts");
  const orderContractMigration = read("supabase/migrations/202608230033_order_contract_constraints.sql");

  assert.match(adminOrderStatus, /tracking_code/);
  assert.match(adminOrderStatus, /tracking_carrier/);
  assert.match(adminOrderStatus, /admin_update_order_status/);
  assert.match(adminOrderStatus, /@\/lib\/api\/no-store/);
  assert.match(adminOrderStatus, /noStoreJson/);
  assert.match(adminOrderStatus, /request\.json\(\)\.catch\(\(\) => \(\{\}\)\)/);
  assert.doesNotMatch(adminOrderStatus, /NextResponse\.json/);
  assert.match(adminOrderStatusMigration, /create or replace function public\.admin_update_order_status/);
  assert.match(adminOrderStatusMigration, /p\.role = 'admin'/);
  assert.match(adminOrderStatusMigration, /tracking number and carrier are required for shipped orders/);
  assert.match(adminOrderStatusMigration, /update public\.orders/);
  assert.match(adminOrderStatusMigration, /insert into public\.order_status_events/);
  assert.match(adminOrderStatusMigration, /public\.log_platform_event/);
  assert.match(adminOrderStatusMigration, /grant execute on function public\.admin_update_order_status/);
  assert.match(preserveTrackingMigration, /select \*/);
  assert.match(preserveTrackingMigration, /v_existing_order public\.orders%rowtype/);
  assert.match(preserveTrackingMigration, /tracking_code = coalesce\(v_tracking_code, v_existing_order\.tracking_code\)/);
  assert.match(preserveTrackingMigration, /tracking_carrier = coalesce\(v_tracking_carrier, v_existing_order\.tracking_carrier\)/);
  assert.match(preserveTrackingMigration, /tracking_url = coalesce\(v_tracking_url, v_existing_order\.tracking_url\)/);
  assert.match(preserveTrackingMigration, /grant execute on function public\.admin_update_order_status/);
  assert.match(orderStatusUpdater, /currentTrackingNumber/);
  assert.match(orderStatusUpdater, /currentCarrier/);
  assert.match(orderStatusUpdater, /value="Star Track"/);
  assert.match(orderStatusUpdater, /value="Customer Pickup"/);
  assert.match(orderStatusUpdater, /value="Other"/);
  assert.doesNotMatch(orderStatusUpdater, /value="Aramex"/);
  assert.doesNotMatch(orderStatusUpdater, /value="Couriers Please"/);
  assert.doesNotMatch(orderStatusUpdater, /value="Sendle"/);
  assert.match(adminOrders, /tracking_code/);
  assert.match(adminOrders, /tracking_carrier/);
  assert.match(adminOrders, /\/api\/admin\/orders\/export/);
  assert.match(adminOrders, /Export CSV/);
  assert.match(adminOrders, /Download/);
  assert.doesNotMatch(adminOrders, /tracking_number/);
  assert.doesNotMatch(adminOrders, /\bcarrier\b,/);
  assert.match(adminDashboard, /tracking_code/);
  assert.match(adminDashboard, /tracking_carrier/);
  assert.doesNotMatch(adminDashboard, /tracking_number/);
  assert.match(adminOrderDetail, /order_status_events/);
  assert.match(adminOrderDetail, /Status Timeline/);
  assert.match(adminOrderDetail, /tracking_code/);
  assert.match(adminOrderDetail, /tracking_carrier/);
  assert.match(adminOrderDetail, /normaliseExternalUrl\(order\.tracking_url\)/);
  assert.doesNotMatch(adminOrderDetail, /href=\{order\.tracking_url\}/);
  assert.doesNotMatch(adminOrderDetail, /order\.tracking_number/);
  assert.doesNotMatch(adminOrderDetail, /order\.carrier/);
  assert.match(orderContractMigration, /orders_status_contract_check/);
  assert.match(orderContractMigration, /'in_production'/);
  assert.match(orderContractMigration, /'fulfilled'/);
  assert.match(orderContractMigration, /orders_operational_status_contract_check/);
  assert.match(orderContractMigration, /'ready_for_fulfillment'/);
  assert.match(orderContractMigration, /orders_shipping_method_contract_check/);
  assert.match(orderContractMigration, /'standard', 'express'/);
  assert.match(orderContractMigration, /orders_currency_contract_check/);
  assert.match(orderContractMigration, /\^\[A-Z\]\{3\}\$/);
  assert.match(orderContractMigration, /orders_amounts_non_negative_check/);
  assert.match(orderContractMigration, /not valid/);
  assert.match(adminOrdersExport, /export const runtime = "nodejs"/);
  assert.match(adminOrdersExport, /export const dynamic = "force-dynamic"/);
  assert.match(adminOrdersExport, /export async function GET\(request: Request\)/);
  assert.match(adminOrdersExport, /requireAdmin\(request\)/);
  assert.match(adminOrdersExport, /getServiceSupabase/);
  assert.match(adminOrdersExport, /\.from\("orders"\)/);
  assert.match(adminOrdersExport, /\.limit\(10_000\)/);
  assert.match(adminOrdersExport, /NO_STORE_HEADERS/);
  assert.match(adminOrdersExport, /Content-Disposition/);
  assert.match(adminOrdersExport, /attachment; filename=/);
  assert.match(adminOrdersExport, /text\/csv; charset=utf-8/);
  assert.match(adminOrdersExport, /X-Robots-Tag/);
  assert.match(adminOrdersExport, /noindex, noarchive/);
  assert.match(adminOrdersExport, /ORDER_EXPORT_HEADERS/);
  assert.match(adminOrdersExport, /order_id/);
  assert.match(adminOrdersExport, /stripe_payment_intent/);
  assert.match(adminOrdersExport, /Admin orders export failed/);
  assert.match(adminOrdersExport, /Could not export orders\./);
  assert.match(adminOrdersExport, /recordAdminExportAuditEvent/);
  assert.match(adminOrdersExport, /exportName: "orders"/);
  assert.match(adminOrdersExport, /rowCount: orders\.length/);
  assert.match(adminOrdersExport, /Admin orders export audit failed/);
  assert.match(adminOrdersExport, /Could not audit orders export\./);
  assert.match(adminOrdersExport, /@\/lib\/admin\/csv/);
  assert.match(adminOrdersExport, /\.map\(csvCell\)/);
  assert.doesNotMatch(adminOrdersExport, /return noStoreJson\(\{ error: error\.message/);
  assert.match(adminExportAudit, /export async function recordAdminExportAuditEvent/);
  assert.match(adminExportAudit, /recordPlatformEvent/);
  assert.match(adminExportAudit, /scope: "admin_export"/);
  assert.match(adminExportAudit, /action: `\$\{exportName\}_csv_exported`/);
  assert.match(adminExportAudit, /actorUserId/);
  assert.match(adminExportAudit, /row_count: rowCount/);
  assert.match(adminExportAudit, /throwOnFailure: true/);
  assert.match(adminExportAudit, /Admin export audit event failed/);
  assert.match(adminExportAudit, /Could not audit admin export\./);
});

test("Admin server actions use shared privileged action guard", () => {
  const adminGuard = read("src/lib/auth/admin.ts");
  const adminLayout = read("src/app/admin/layout.tsx");
  const operationsActions = read("src/app/admin/operations/actions.ts");
  const fulfillmentActions = read("src/app/admin/fulfillment/actions.ts");

  assert.match(adminGuard, /export async function requireAdminAction/);
  assert.match(adminGuard, /throw new Error\("Sign in required\."\)/);
  assert.match(adminGuard, /throw new Error\("Admin access required\."\)/);
  assert.match(adminGuard, /export async function requireAdminPage/);
  assert.match(adminGuard, /redirect\("\/auth\/sign-in"\)/);
  assert.match(adminGuard, /redirect\("\/"\)/);
  assert.match(adminLayout, /import \{ requireAdminPage \} from "@\/lib\/auth\/admin"/);
  assert.match(adminLayout, /export const dynamic = "force-dynamic"/);
  assert.match(adminLayout, /export const revalidate = 0/);
  assert.match(adminLayout, /await requireAdminPage\(\)/);
  assert.doesNotMatch(adminLayout, /redirect\("\/login"\)/);
  assert.doesNotMatch(adminLayout, /profile\.role !== "admin"/);
  assert.match(operationsActions, /import \{ requireAdminAction \} from "@\/lib\/auth\/admin"/);
  assert.match(operationsActions, /await requireAdminAction\(\)/);
  assert.doesNotMatch(operationsActions, /getServerSupabase/);
  assert.match(fulfillmentActions, /import \{ requireAdminAction \} from "@\/lib\/auth\/admin"/);
  assert.match(fulfillmentActions, /await requireAdminAction\(\)/);
  assert.doesNotMatch(fulfillmentActions, /getServerSupabase/);
});

test("Auth mutation endpoints reject cross-origin browser posts", () => {
  const guard = read("src/lib/auth/request-origin.ts");
  const adminGuard = read("src/lib/auth/admin.ts");
  const artistGuard = read("src/lib/auth/artist.ts");
  const signIn = read("src/app/auth/sign-in/page.tsx");
  const signUp = read("src/app/auth/sign-up/page.tsx");
  const accountSetup = read("src/app/account/setup/actions.ts");
  const setSession = read("src/app/auth/set-session/route.ts");
  const onboard = read("src/app/auth/onboard/route.ts");
  const completeCallback = read("src/app/auth/callback/complete/route.ts");
  const signOut = read("src/app/auth/sign-out/route.ts");
  const noStore = read("src/lib/api/no-store.ts");
  const stripeConnectAccountLink = read("src/app/api/stripe/connect/account-link/route.ts");
  const stripeConnectRefresh = read("src/app/api/stripe/connect/refresh/route.ts");
  const stripeConnectButton = read("src/app/dashboard/cash-out/StripeConnectButton.tsx");
  const artistHeroUpload = read("src/app/api/artist-hero-upload/route.ts");
  const onboardingMigration = read("supabase/migrations/202608230015_account_onboarding_rpc.sql");
  const artistStorageMigration = read("supabase/migrations/202608230017_artist_image_storage_policies.sql");
  const stripeConnectRateLimitMigration = read("supabase/migrations/202608230018_stripe_connect_rate_limit_key.sql");
  const accountTypeMigration = read("supabase/migrations/202608230019_account_type_business_only.sql");

  assert.match(guard, /originUrl\.host === host/);
  assert.match(guard, /@\/lib\/api\/no-store/);
  assert.match(guard, /noStoreJson\(\{ error: "Forbidden" \}/);
  assert.doesNotMatch(guard, /NextResponse\.json/);
  assert.match(adminGuard, /rejectCrossOriginRequest\(request\)/);
  assert.match(adminGuard, /@\/lib\/api\/no-store/);
  assert.match(adminGuard, /noStoreJson/);
  assert.doesNotMatch(adminGuard, /NextResponse\.json/);
  assert.match(artistGuard, /export async function requireArtistPage/);
  assert.match(artistGuard, /export async function requireArtistAction/);
  assert.match(artistGuard, /redirect\("\/auth\/sign-in"\)/);
  assert.match(artistGuard, /redirect\("\/account\/setup"\)/);
  assert.match(artistGuard, /redirect\("\/dashboard"\)/);
  assert.match(artistGuard, /\.select\("account_type, onboarding_completed"\)/);
  assert.match(artistGuard, /profile\.account_type !== "artist"/);
  assert.match(artistGuard, /Artist account required\./);
  assert.match(artistGuard, /artist action profile lookup failed/);
  assert.match(artistGuard, /artist action artist lookup failed/);
  assert.match(artistGuard, /Could not verify artist profile\./);
  assert.match(artistGuard, /\.from\("artists"\)/);
  assert.match(artistGuard, /\.eq\("user_id", user\.id\)/);
  assert.match(signIn, /window\.location\.origin/);
  assert.match(signIn, /signInWithPassword/);
  assert.match(signIn, /resetPasswordForEmail/);
  assert.match(signIn, /SIGN_IN_ERROR/);
  assert.match(signIn, /RESET_ERROR/);
  assert.match(signIn, /Could not sign in\. Check your email and password\./);
  assert.match(signIn, /Could not send password setup email\. Please try again\./);
  assert.doesNotMatch(signIn, /setErr\(error\.message\)/);
  assert.doesNotMatch(signIn, /setErr\(e instanceof Error \? e\.message/);
  assert.doesNotMatch(signIn, /process\.env/);
  assert.match(signUp, /ACCESS_ERROR/);
  assert.match(signUp, /fetch\("\/api\/subscribe"/);
  assert.match(signUp, /source: `early-access-\$\{accountType\}`/);
  assert.match(signUp, /consent: true/);
  assert.match(signUp, /No public\s+account has been activated yet/);
  assert.doesNotMatch(signUp, /getBrowserSupabase/);
  assert.doesNotMatch(signUp, /supabase\.auth\.signUp/);
  assert.doesNotMatch(signUp, /location\.origin/);
  assert.doesNotMatch(signUp, /setErr\(error\.message\)/);
  assert.doesNotMatch(signUp, /setErr\(e instanceof Error \? e\.message/);
  assert.doesNotMatch(signUp, /process\.env/);
  assert.match(onboardingMigration, /create or replace function public\.complete_account_onboarding/);
  assert.match(onboardingMigration, /security definer/);
  assert.match(onboardingMigration, /v_user_id uuid := auth\.uid\(\)/);
  assert.match(onboardingMigration, /grant execute on function public\.complete_account_onboarding/);
  assert.doesNotMatch(onboardingMigration, /\brole\s*=/);
  assert.doesNotMatch(onboardingMigration, /\brole,/);
  assert.match(accountTypeMigration, /where p\.account_type = 'admin'/);
  assert.match(accountTypeMigration, /check \(account_type in \('fan', 'artist'\)\)/);
  assert.doesNotMatch(accountTypeMigration, /account_type in \('fan', 'artist', 'admin'\)/);
  assert.match(accountSetup, /complete_account_onboarding/);
  assert.match(accountSetup, /account setup onboarding failed/);
  assert.match(accountSetup, /Could not complete account setup\./);
  assert.doesNotMatch(accountSetup, /getServiceSupabase/);
  assert.doesNotMatch(accountSetup, /throw new Error\(error\.message\)/);
  assert.match(noStore, /export const NO_STORE_HEADERS/);
  assert.match(noStore, /"Cache-Control": "private, no-store, max-age=0, must-revalidate"/);
  assert.match(noStore, /"Pragma": "no-cache"/);
  assert.match(noStore, /"Expires": "0"/);
  assert.match(noStore, /"X-Content-Type-Options": "nosniff"/);
  assert.match(noStore, /export function noStoreJson/);
  assert.match(noStore, /NextResponse\.json/);
  assert.match(setSession, /rejectCrossOriginRequest\(req\)/);
  assert.match(setSession, /setSessionSchema = z\.object/);
  assert.match(setSession, /access_token: z\.string\(\)\.min\(1\)\.max\(8_192\)/);
  assert.match(setSession, /refresh_token: z\.string\(\)\.min\(1\)\.max\(8_192\)/);
  assert.match(setSession, /export const runtime = "nodejs"/);
  assert.match(setSession, /export const dynamic = "force-dynamic"/);
  assert.match(setSession, /@\/lib\/api\/no-store/);
  assert.match(setSession, /noStoreJson/);
  assert.match(setSession, /auth set session failed/);
  assert.match(setSession, /Could not complete sign in\./);
  assert.doesNotMatch(setSession, /new NextResponse\(/);
  assert.doesNotMatch(setSession, /await req\.json\(\)\.catch\(\(\) => \(\{\}\)\);\s*if \(!access_token/);
  assert.doesNotMatch(setSession, /new NextResponse\(error\.message/);
  assert.match(onboard, /rejectCrossOriginRequest\(req\)/);
  assert.match(onboard, /onboardSchema = z\.object/);
  assert.match(onboard, /account_type: z\.enum\(\["fan", "artist"\]\)\.default\("fan"\)/);
  assert.match(onboard, /display_name: z\.string\(\)\.max\(80\)\.nullish\(\)/);
  assert.match(onboard, /export const runtime = "nodejs"/);
  assert.match(onboard, /export const dynamic = "force-dynamic"/);
  assert.match(onboard, /@\/lib\/api\/no-store/);
  assert.match(onboard, /noStoreJson/);
  assert.match(onboard, /complete_account_onboarding/);
  assert.match(onboard, /auth onboarding failed/);
  assert.match(onboard, /Could not complete account setup\./);
  assert.doesNotMatch(onboard, /getServiceSupabase/);
  assert.doesNotMatch(onboard, /new NextResponse\(/);
  assert.doesNotMatch(onboard, /new NextResponse\(error\.message/);
  assert.match(completeCallback, /export const runtime = "nodejs"/);
  assert.match(completeCallback, /export const dynamic = "force-dynamic"/);
  assert.match(completeCallback, /NO_STORE_HEADERS/);
  assert.match(completeCallback, /const \{ error \} = await supabase\.auth\.exchangeCodeForSession\(code\)/);
  assert.match(completeCallback, /auth callback code exchange failed/);
  assert.match(completeCallback, /auth\/sign-in\?error=callback/);
  assert.match(completeCallback, /function noStoreRedirect/);
  assert.match(signOut, /rejectCrossOriginRequest\(req\)/);
  assert.match(signOut, /export const runtime = "nodejs"/);
  assert.match(signOut, /export const dynamic = "force-dynamic"/);
  assert.match(signOut, /@\/lib\/api\/no-store/);
  assert.match(signOut, /return noStoreJson\(\{ ok: true \}\)/);
  assert.match(stripeConnectAccountLink, /rejectCrossOriginRequest\(req\)/);
  assert.match(stripeConnectAccountLink, /requireArtistAction/);
  assert.doesNotMatch(stripeConnectAccountLink, /supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(stripeConnectAccountLink, /\.from\("artists"\)/);
  assert.doesNotMatch(stripeConnectAccountLink, /getWritableServerSupabase/);
  assert.match(stripeConnectAccountLink, /checkDurableRateLimit/);
  assert.match(stripeConnectAccountLink, /stripe_connect:\$\{user\.id\}:account_link/);
  assert.match(stripeConnectAccountLink, /check_public_rate_limit/);
  assert.match(stripeConnectAccountLink, /fallback: "deny"/);
  assert.match(stripeConnectAccountLink, /@\/lib\/api\/no-store/);
  assert.match(stripeConnectAccountLink, /noStoreJson/);
  assert.match(stripeConnectAccountLink, /return noStoreJson\(\{ url: link\.url \}\)/);
  assert.match(stripeConnectAccountLink, /logger\.error/);
  assert.doesNotMatch(stripeConnectAccountLink, /NextResponse\.json\(\{ error: .*Error\.message/);
  assert.doesNotMatch(stripeConnectAccountLink, /NextResponse\.json\(\{ error: .*error\.message/);
  assert.match(stripeConnectRefresh, /rejectCrossOriginRequest\(req\)/);
  assert.match(stripeConnectRefresh, /requireArtistAction/);
  assert.doesNotMatch(stripeConnectRefresh, /supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(stripeConnectRefresh, /\.from\("artists"\)/);
  assert.doesNotMatch(stripeConnectRefresh, /getWritableServerSupabase/);
  assert.match(stripeConnectRefresh, /checkDurableRateLimit/);
  assert.match(stripeConnectRefresh, /stripe_connect:\$\{user\.id\}:refresh/);
  assert.match(stripeConnectRefresh, /check_public_rate_limit/);
  assert.match(stripeConnectRefresh, /fallback: "deny"/);
  assert.match(stripeConnectRefresh, /@\/lib\/api\/no-store/);
  assert.match(stripeConnectRefresh, /noStoreJson/);
  assert.match(stripeConnectRefresh, /return noStoreJson\(\{ ok: true, account: snapshot \}\)/);
  assert.match(stripeConnectRefresh, /logger\.error/);
  assert.doesNotMatch(stripeConnectRefresh, /NextResponse\.json\(\{ error: .*Error\.message/);
  assert.doesNotMatch(stripeConnectRefresh, /NextResponse\.json\(\{ error: .*error\.message/);
  assert.match(stripeConnectButton, /async function readStripeConnectResponse/);
  assert.match(stripeConnectButton, /catch \{/);
  assert.match(stripeConnectButton, /return \{\}/);
  assert.match(stripeConnectButton, /Could not start Stripe onboarding\./);
  assert.match(artistHeroUpload, /rejectCrossOriginRequest\(req\)/);
  assert.match(artistHeroUpload, /requireArtistAction/);
  assert.match(artistHeroUpload, /checkDurableRateLimit/);
  assert.match(artistHeroUpload, /artist_hero_upload:\$\{user\.id\}/);
  assert.match(artistHeroUpload, /check_public_rate_limit/);
  assert.match(artistHeroUpload, /fallback: "deny"/);
  assert.match(artistHeroUpload, /@\/lib\/api\/no-store/);
  assert.match(artistHeroUpload, /noStoreJson/);
  assert.match(artistHeroUpload, /validateImageBytes/);
  assert.match(artistHeroUpload, /validationError\.message\.startsWith\("Image "\)/);
  assert.match(artistHeroUpload, /randomUUID\(\)/);
  assert.match(artistHeroUpload, /supabase\.storage/);
  assert.doesNotMatch(artistHeroUpload, /Date\.now\(\)/);
  assert.doesNotMatch(artistHeroUpload, /auth\.getUser\(\)/);
  assert.doesNotMatch(artistHeroUpload, /getServiceSupabase/);
  assert.doesNotMatch(artistHeroUpload, /NextResponse\.json/);
  assert.doesNotMatch(artistHeroUpload, /NextResponse\.json\(\{ error: uploadErr\.message/);
  assert.doesNotMatch(artistHeroUpload, /NextResponse\.json\(\s*\{ error: artistErr\.message/);
  assert.match(artistStorageMigration, /storage_artist_images_owner_insert/);
  assert.match(artistStorageMigration, /bucket_id = 'artist-images'/);
  assert.match(artistStorageMigration, /public\.owns_artist\(\(\(storage\.foldername\(name\)\)\[2\]\)::uuid\)/);
  assert.match(artistStorageMigration, /artist_hero_upload/);
  assert.match(stripeConnectRateLimitMigration, /stripe_connect/);
});

test("Admin API mutation routes pass requests into the admin guard", () => {
  const adminRouteFiles = filesUnder("src/app/api/admin").filter((file) =>
    file.endsWith("route.ts")
  );
  const polaroidUpload = read("src/app/api/admin/polaroids/upload/route.ts");

  for (const file of adminRouteFiles) {
    const contents = read(file);
    assert.match(contents, /requireAdmin\(request\)/, file);
    assert.doesNotMatch(contents, /requireAdmin\(\)/, file);
    assert.doesNotMatch(contents, /console\.(error|warn|log)/, file);
  }

  assert.match(polaroidUpload, /requireAdmin\(request\)/);
  assert.match(polaroidUpload, /@\/lib\/api\/no-store/);
  assert.match(polaroidUpload, /noStoreJson/);
  assert.match(polaroidUpload, /validateImageBytes/);
  assert.match(polaroidUpload, /validationError\.message\.startsWith\("Image "\)/);
  assert.match(polaroidUpload, /logger\.error/);
  assert.match(polaroidUpload, /Could not upload backstage polaroid\./);
  assert.doesNotMatch(polaroidUpload, /NextResponse\.json/);
  assert.doesNotMatch(polaroidUpload, /message: error\.message/);
});

test("Mutating API routes explicitly opt into Node runtime and dynamic execution", () => {
  const apiRouteFiles = filesUnder("src/app/api").filter((file) => file.endsWith("route.ts"));

  for (const file of apiRouteFiles) {
    const contents = read(file);

    if (!/export async function (POST|PUT|PATCH|DELETE)\b/.test(contents)) {
      continue;
    }

    assert.match(contents, /export const runtime = "nodejs"/, file);
    assert.match(contents, /export const dynamic = "force-dynamic"/, file);
  }
});

test("Admin content mutation APIs do not expose raw database errors", () => {
  const adminContentRoutes = [
    "src/app/api/admin/artists/[id]/route.ts",
    "src/app/api/admin/artists/[id]/toggle-featured/route.ts",
    "src/app/api/admin/artists/[id]/toggle-public/route.ts",
    "src/app/api/admin/polaroids/route.ts",
    "src/app/api/admin/polaroids/[id]/route.ts",
    "src/app/api/admin/tour-dates/route.ts",
    "src/app/api/admin/tour-dates/[id]/route.ts",
  ];
  const adminArtistUpdate = read("src/app/api/admin/artists/[id]/route.ts");
  const adminArtistToggleFeatured = read("src/app/api/admin/artists/[id]/toggle-featured/route.ts");
  const adminArtistTogglePublic = read("src/app/api/admin/artists/[id]/toggle-public/route.ts");
  const adminPolaroidCreate = read("src/app/api/admin/polaroids/route.ts");
  const adminPolaroidDetail = read("src/app/api/admin/polaroids/[id]/route.ts");
  const tourDates = read("src/app/api/admin/tour-dates/route.ts");
  const tourDateDetail = read("src/app/api/admin/tour-dates/[id]/route.ts");
  const adminContentAudit = read("src/lib/admin/content-audit.ts");

  for (const file of adminContentRoutes) {
    const contents = read(file);
    assert.match(contents, /logger\.error/, file);
    assert.match(contents, /logAdminContentEvent/, file);
    assert.doesNotMatch(contents, /message:\s*error\.message/, file);
    assert.doesNotMatch(contents, /message:\s*getErrorMessage\(error\)/, file);
    assert.doesNotMatch(contents, /\{ success: false, message: error\.message \}/, file);
  }

  assert.match(adminContentAudit, /export async function logAdminContentEvent/);
  assert.match(adminContentAudit, /recordPlatformEvent/);
  assert.match(adminContentAudit, /scope: "admin_content"/);
  assert.match(adminContentAudit, /actorUserId: input\.actorUserId/);
  assert.match(adminContentAudit, /metadata: input\.metadata \?\? \{\}/);
  assert.match(adminContentAudit, /Admin content platform event failed/);
  assert.match(adminContentAudit, /throwOnFailure: true/);
  assert.match(adminContentAudit, /failurePublicMessage: "Could not audit admin content change\."/);
  assert.match(adminArtistUpdate, /artistUpdateSchema = z\.object/);
  assert.match(adminArtistUpdate, /display_name: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(120\)/);
  assert.match(adminArtistUpdate, /request\.json\(\)\.catch\(\(\) => \(\{\}\)\)/);
  assert.match(adminArtistUpdate, /Invalid artist details\./);
  assert.match(adminArtistUpdate, /admin_artist_updated/);
  assert.match(adminArtistUpdate, /noStoreJson/);
  assert.doesNotMatch(adminArtistUpdate, /NextResponse\.json/);
  assert.match(adminArtistToggleFeatured, /noStoreJson/);
  assert.match(adminArtistToggleFeatured, /admin_artist_featured_toggled/);
  assert.doesNotMatch(adminArtistToggleFeatured, /NextResponse\.json/);
  assert.match(adminArtistTogglePublic, /noStoreJson/);
  assert.match(adminArtistTogglePublic, /admin_artist_public_toggled/);
  assert.doesNotMatch(adminArtistTogglePublic, /NextResponse\.json/);
  assert.match(adminPolaroidCreate, /polaroidCreateSchema = z\.object/);
  assert.match(adminPolaroidCreate, /image_path: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(1_000\)/);
  assert.match(adminPolaroidCreate, /request\.json\(\)\.catch\(\(\) => \(\{\}\)\)/);
  assert.match(adminPolaroidCreate, /Invalid backstage polaroid details\./);
  assert.match(adminPolaroidCreate, /admin_polaroid_created/);
  assert.match(adminPolaroidCreate, /noStoreJson/);
  assert.doesNotMatch(adminPolaroidCreate, /NextResponse\.json/);
  assert.match(adminPolaroidDetail, /polaroidUpdateSchema = z\.object/);
  assert.match(adminPolaroidDetail, /image_path: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(1_000\)/);
  assert.match(adminPolaroidDetail, /request\.json\(\)\.catch\(\(\) => \(\{\}\)\)/);
  assert.match(adminPolaroidDetail, /Invalid backstage polaroid details\./);
  assert.match(adminPolaroidDetail, /admin_polaroid_updated/);
  assert.match(adminPolaroidDetail, /admin_polaroid_deleted/);
  assert.match(adminPolaroidDetail, /noStoreJson/);
  assert.doesNotMatch(adminPolaroidDetail, /NextResponse\.json/);
  assert.match(tourDates, /tourDateSchema = z\.object/);
  assert.match(tourDates, /artist: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(160\)/);
  assert.match(tourDates, /request\.json\(\)\.catch\(\(\) => \(\{\}\)\)/);
  assert.match(tourDates, /Invalid tour date details\./);
  assert.match(tourDates, /normaliseExternalUrl\(parsed\.data\.ticket_url\)/);
  assert.match(tourDates, /admin_tour_date_created/);
  assert.match(tourDates, /noStoreJson/);
  assert.doesNotMatch(tourDates, /NextResponse\.json/);
  assert.match(tourDateDetail, /tourDateUpdateSchema = z\.object/);
  assert.match(tourDateDetail, /artist: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(160\)/);
  assert.match(tourDateDetail, /request\.json\(\)\.catch\(\(\) => \(\{\}\)\)/);
  assert.match(tourDateDetail, /Invalid tour date details\./);
  assert.match(tourDateDetail, /normaliseExternalUrl\(parsed\.data\.ticket_url\)/);
  assert.match(tourDateDetail, /admin_tour_date_updated/);
  assert.match(tourDateDetail, /admin_tour_date_deleted/);
  assert.match(tourDateDetail, /noStoreJson/);
  assert.doesNotMatch(tourDateDetail, /NextResponse\.json/);
  assert.match(tourDates, /Valid Ticket URL is required/);
  assert.match(tourDateDetail, /Valid Ticket URL is required/);
});

test("Admin workflows avoid blocking browser alerts", () => {
  const adminFiles = [
    ...filesUnder("src/app/admin").filter((file) => /\.(ts|tsx)$/.test(file)),
    ...filesUnder("src/components/admin").filter((file) => /\.(ts|tsx)$/.test(file)),
  ];

  for (const file of adminFiles) {
    const contents = read(file);
    assert.doesNotMatch(contents, /alert\(/, file);
    assert.doesNotMatch(contents, /confirm\(/, file);
    assert.doesNotMatch(contents, /window\.location\.reload/, file);
  }
});

test("Client effects avoid dependency suppressions and clean up preview object URLs", () => {
  const sourceFiles = [
    ...filesUnder("src/app").filter((file) => /\.(ts|tsx)$/.test(file)),
    ...filesUnder("src/components").filter((file) => /\.(ts|tsx)$/.test(file)),
  ];
  const newProductForm = read("src/app/dashboard/products/new/NewProductFormClient.tsx");
  const miniCart = read("src/components/MiniCartDrawer.tsx");
  const authCallback = read("src/app/auth/callback/page.tsx");

  for (const file of sourceFiles) {
    const contents = read(file);
    assert.doesNotMatch(contents, /eslint-disable-next-line react-hooks\/exhaustive-deps/, file);
  }

  assert.match(newProductForm, /const previewUrlsRef = useRef\(new Set<string>\(\)\)/);
  assert.match(newProductForm, /function createPreviewUrl\(file: File\)/);
  assert.match(newProductForm, /previewUrlsRef\.current\.add\(url\)/);
  assert.match(newProductForm, /function revokePreviewUrl\(url\?: string \| null\)/);
  assert.match(newProductForm, /previewUrlsRef\.current\.delete\(url\)/);
  assert.match(newProductForm, /const previewUrls = previewUrlsRef\.current/);
  assert.match(newProductForm, /previewUrls\.forEach\(\(url\) =>/);
  assert.match(newProductForm, /previewUrls\.clear\(\)/);
  assert.match(miniCart, /previousPathnameRef/);
  assert.match(miniCart, /\[pathname, isOpen, close\]/);
  assert.match(authCallback, /Could not finish setting up your session\./);
  assert.match(authCallback, /Sign-in completed, but account setup needs attention\./);
  assert.match(authCallback, /\[router, search\]/);
  assert.doesNotMatch(authCallback, /await onboard\.text\(\)/);
  assert.doesNotMatch(authCallback, /throw new Error\(await r\.text\(\)\)/);
});

test("Application source avoids explicit any typing", () => {
  const sourceFiles = [
    ...filesUnder("src/app").filter((file) => /\.(ts|tsx)$/.test(file)),
    ...filesUnder("src/components").filter((file) => /\.(ts|tsx)$/.test(file)),
    ...filesUnder("src/lib").filter((file) => /\.(ts|tsx)$/.test(file)),
  ];

  for (const file of sourceFiles) {
    const contents = read(file);
    assert.doesNotMatch(contents, /(:\s*any\b|as\s+any\b|<any>)/, file);
  }
});

test("Persisted checkout and dashboard images use Next Image", () => {
  const checkoutSummary = read("src/app/checkout/CheckoutSummaryClient.tsx");
  const editProductPage = read("src/app/dashboard/products/[id]/edit/page.tsx");
  const newProductForm = read("src/app/dashboard/products/new/NewProductFormClient.tsx");
  const editProductForm = read("src/app/dashboard/products/[id]/edit/EditProductFormClient.tsx");

  assert.match(checkoutSummary, /import Image from "next\/image"/);
  assert.doesNotMatch(checkoutSummary, /@next\/next\/no-img-element/);
  assert.doesNotMatch(checkoutSummary, /<img/);
  assert.match(editProductPage, /import Image from "next\/image"/);
  assert.doesNotMatch(editProductPage, /@next\/next\/no-img-element/);
  assert.doesNotMatch(editProductPage, /<img/);
  assert.match(newProductForm, /import Image from "next\/image"/);
  assert.doesNotMatch(newProductForm, /@next\/next\/no-img-element/);
  assert.doesNotMatch(newProductForm, /<img/);
  assert.match(editProductForm, /import Image from "next\/image"/);
  assert.doesNotMatch(editProductForm, /@next\/next\/no-img-element/);
  assert.doesNotMatch(editProductForm, /<img/);
});

test("Image uploads validate file signatures before storage writes", () => {
  const uploads = read("src/lib/uploads.ts");
  const uploadFiles = [
    "src/app/api/artist-hero-upload/route.ts",
    "src/app/api/admin/polaroids/upload/route.ts",
    "src/app/dashboard/products/new/actions.ts",
    "src/app/dashboard/products/[id]/edit/actions.ts",
  ];

  assert.match(uploads, /validateImageBytes/);
  assert.match(uploads, /detectImageMimeType/);
  assert.match(uploads, /Image file type does not match its contents/);
  assert.match(uploads, /Image file contents must be a JPEG, PNG, or WebP/);
  assert.match(uploads, /image\/webp/);
  assert.match(uploads, /imageExtensionForMimeType/);
  assert.match(uploads, /safeImageUploadFilename/);
  assert.match(uploads, /export const MAX_IMAGE_BYTES = 8 \* 1024 \* 1024/);
  assert.match(uploads, /MAX_IMAGE_MULTIPART_BYTES = MAX_IMAGE_BYTES \+ 1024 \* 1024/);
  assert.match(uploads, /requestExceedsImageUploadLimit/);
  assert.match(uploads, /request\.headers\.get\("content-length"\)/);
  assert.match(uploads, /case "image\/jpeg":[\s\S]*?return "jpg"/);

  for (const file of uploadFiles) {
    const contents = read(file);
    assert.match(contents, /validateImageFile/);
    assert.match(contents, /validateImageBytes/);
    assert.match(contents, /contentType/);
    assert.match(contents, /(safeImageUploadFilename|imageExtensionForMimeType)/, file);
  }

  for (const file of [
    "src/app/api/artist-hero-upload/route.ts",
    "src/app/api/admin/polaroids/upload/route.ts",
  ]) {
    const contents = read(file);
    const sizeGuardIndex = contents.indexOf("requestExceedsImageUploadLimit");
    const formDataIndex = contents.indexOf(".formData()");

    assert.match(contents, /requestExceedsImageUploadLimit/);
    assert.match(contents, /Image upload is too large\./);
    assert.match(contents, /status: 413/);
    assert.ok(sizeGuardIndex > -1, `${file} is missing upload size preflight`);
    assert.ok(formDataIndex > -1, `${file} is missing formData parsing`);
    assert.ok(sizeGuardIndex < formDataIndex, `${file} must reject oversized uploads before parsing multipart bodies`);
  }
});

test("Public abuse controls use the durable Supabase rate limiter", () => {
  const rateLimit = read("src/lib/rate-limit.ts");
  const subscribe = read("src/app/api/subscribe/route.ts");
  const pageView = read("src/app/api/track/page-view/route.ts");
  const usePageView = read("src/lib/usePageView.ts");
  const contact = read("src/app/contact/page.tsx");
  const publicSubscribeMigration = read("supabase/migrations/202608230016_public_newsletter_subscribe_rpc.sql");
  const publicPageViewMigration = read("supabase/migrations/202608230021_public_page_view_tracking_rpc.sql");
  const publicPageViewAuthMigration = read("supabase/migrations/202608230022_page_view_tracking_auth_uid.sql");
  const publicContactMigration = read("supabase/migrations/202608230025_public_contact_submit_rpc.sql");

  assert.match(rateLimit, /checkDurableRateLimit/);
  assert.match(rateLimit, /check_public_rate_limit/);
  assert.match(rateLimit, /fallback\?: "local" \| "deny"/);
  assert.match(rateLimit, /options\.fallback === "deny"/);
  assert.match(rateLimit, /rateLimitLogContext/);
  assert.match(rateLimit, /key_prefix/);
  assert.match(rateLimit, /key_hash/);
  assert.doesNotMatch(rateLimit, /logger\.error\("durable rate limit failed", \{\s*key,/);
  assert.match(subscribe, /checkDurableRateLimit/);
  assert.match(subscribe, /rejectCrossOriginRequest\(req\)/);
  assert.match(subscribe, /fallback: "deny"/);
  assert.match(subscribe, /noStoreJson/);
  assert.match(subscribe, /req\.json\(\)\.catch\(\(\) => \(\{\}\)\)/);
  assert.match(subscribe, /getPublicServerSupabase/);
  assert.match(subscribe, /public_subscribe_newsletter/);
  assert.match(subscribe, /check_public_rate_limit/);
  assert.doesNotMatch(subscribe, /getServiceSupabase/);
  assert.doesNotMatch(subscribe, /NextResponse\.json/);
  assert.doesNotMatch(subscribe, /rpc\("subscribe_newsletter"/);
  assert.doesNotMatch(subscribe, /NextResponse\.json\(\{ error: error\.message/);
  assert.match(subscribe, /logger\.error/);
  assert.match(pageView, /checkDurableRateLimit/);
  assert.match(pageView, /export const runtime = "nodejs"/);
  assert.match(pageView, /export const dynamic = "force-dynamic"/);
  assert.match(pageView, /@\/lib\/api\/no-store/);
  assert.match(pageView, /noStoreJson/);
  assert.match(pageView, /rejectCrossOriginRequest\(req\)/);
  assert.match(pageView, /fallback: "deny"/);
  assert.match(pageView, /getServerSupabase/);
  assert.match(pageView, /`page_view:\$\{ip\}`/);
  assert.match(pageView, /check_public_rate_limit/);
  assert.match(pageView, /public_track_page_view/);
  assert.doesNotMatch(pageView, /getServiceSupabase/);
  assert.doesNotMatch(pageView, /p_user_id/);
  assert.match(usePageView, /try \{/);
  assert.match(usePageView, /localStorage\.getItem\("mt_session_id"\)/);
  assert.match(usePageView, /typeof crypto\.randomUUID === "function"/);
  assert.doesNotMatch(usePageView, /Math\.random/);
  assert.doesNotMatch(usePageView, /Date\.now\(\)/);
  assert.match(usePageView, /localStorage\.setItem\("mt_session_id", id\)/);
  assert.match(usePageView, /return null/);
  assert.match(usePageView, /\.catch\(\(\) =>/);
  assert.match(contact, /contactSchema/);
  assert.match(contact, /checkDurableRateLimit/);
  assert.match(contact, /fallback: "deny"/);
  assert.match(contact, /`contact:\$\{ip\}`/);
  assert.match(contact, /getPublicServerSupabase/);
  assert.match(contact, /check_public_rate_limit/);
  assert.match(contact, /public_submit_contact_message/);
  assert.match(contact, /contact message insert failed/);
  assert.match(contact, /subject_present: Boolean\(subject\)/);
  assert.match(contact, /message_length: message\.length/);
  assert.doesNotMatch(contact, /contact message insert failed[\s\S]*email,/);
  assert.doesNotMatch(contact, /getServiceSupabase/);
  assert.doesNotMatch(contact, /\.from\("contact_messages"\)/);
  assert.match(publicSubscribeMigration, /create or replace function public\.check_public_rate_limit/);
  assert.match(publicSubscribeMigration, /p_key !~ '\^\(newsletter\|contact\|page_view\):'/);
  assert.match(publicSubscribeMigration, /create or replace function public\.public_subscribe_newsletter/);
  assert.match(publicSubscribeMigration, /perform public\.subscribe_newsletter/);
  assert.match(publicSubscribeMigration, /security definer/);
  assert.match(publicSubscribeMigration, /grant execute on function public\.public_subscribe_newsletter/);
  assert.match(publicPageViewMigration, /create or replace function public\.public_track_page_view/);
  assert.match(publicPageViewMigration, /security definer/);
  assert.match(publicPageViewMigration, /insert into public\.page_views/);
  assert.match(publicPageViewMigration, /grant execute on function public\.public_track_page_view/);
  assert.match(publicPageViewAuthMigration, /auth\.uid\(\)/);
  assert.match(publicPageViewAuthMigration, /drop function if exists public\.public_track_page_view\(text, text, text, text, uuid\)/);
  assert.doesNotMatch(publicPageViewAuthMigration, /p_user_id/);
  assert.match(publicContactMigration, /create or replace function public\.public_submit_contact_message/);
  assert.match(publicContactMigration, /security definer/);
  assert.match(publicContactMigration, /insert into public\.contact_messages/);
  assert.match(publicContactMigration, /public_contact_message_submitted/);
  assert.match(publicContactMigration, /drop policy if exists contact_messages_insert_public/);
  assert.match(publicContactMigration, /grant execute on function public\.public_submit_contact_message/);
});

test("Public catalog APIs use shared Supabase and storage helpers", () => {
  const publicError = read("src/lib/api/public-error.ts");
  const storage = read("src/lib/storage.ts");
  const publicProductQuery = read("src/lib/catalog/public-product-query.ts");
  const publicCatalogContractMigration = read("supabase/migrations/202608230040_public_product_catalog_contract.sql");
  const catalogRouteFiles = [
    "src/app/api/artists/route.ts",
    "src/app/api/artists/featured/route.ts",
    "src/app/api/fan-shouts/route.ts",
    "src/app/api/featured/route.ts",
    "src/app/api/journal/route.ts",
    "src/app/api/polaroids/route.ts",
    "src/app/api/products/route.ts",
    "src/app/api/products/artist/route.ts",
    "src/app/api/products/category/route.ts",
    "src/app/api/products/editors/route.ts",
    "src/app/api/products/random/route.ts",
    "src/app/api/products/tees/route.ts",
  ];
  const publicProductRouteFiles = [
    "src/app/api/products/route.ts",
    "src/app/api/products/artist/route.ts",
    "src/app/api/products/category/route.ts",
    "src/app/api/products/editors/route.ts",
    "src/app/api/products/random/route.ts",
    "src/app/api/products/tees/route.ts",
  ];
  const publicProductPageFiles = [
    "src/app/artists/[id]/page.tsx",
    "src/app/category/[slug]/page.tsx",
    "src/app/editors/page.tsx",
    "src/app/embed/artist/[id]/page.tsx",
    "src/app/new/page.tsx",
    "src/app/product/[id]/page.tsx",
    "src/app/sitemap.ts",
  ];

  assert.match(publicError, /logger\.error/);
  assert.match(publicError, /public api query failed/);
  assert.match(publicError, /Could not load public catalog data/);
  assert.match(publicError, /export function publicApiJson/);
  assert.match(publicError, /Cache-Control/);
  assert.match(publicError, /public, s-maxage=\$\{cacheSeconds\}, stale-while-revalidate=/);
  assert.match(publicError, /headers\.set\("Vary", "Accept"\)/);
  assert.match(publicError, /headers\.set\("X-Content-Type-Options", "nosniff"\)/);
  assert.match(publicError, /@\/lib\/api\/no-store/);
  assert.match(publicError, /import \{ noStoreJson \} from "@\/lib\/api\/no-store"/);
  assert.match(publicError, /return noStoreJson\(\{ error: message \}, \{ status: 500 \}\)/);
  assert.match(storage, /encodeStoragePath/);
  assert.match(storage, /\.split\("\/"\)/);
  assert.match(storage, /\.join\("\/"\)/);
  assert.doesNotMatch(storage, /encodeURIComponent\(path\)/);
  assert.match(publicProductQuery, /export function publicCatalogProductQuery/);
  assert.match(publicProductQuery, /\.eq\("is_published", true\)/);
  assert.match(publicProductQuery, /\.eq\("production_status", "published"\)/);
  assert.match(publicProductQuery, /\.eq\("moderation_status", "approved"\)/);
  assert.match(publicCatalogContractMigration, /create or replace view public\.products_with_first_image/);
  assert.match(publicCatalogContractMigration, /security_invoker = true/);
  assert.match(publicCatalogContractMigration, /p\.production_status/);
  assert.match(publicCatalogContractMigration, /p\.moderation_status/);

  for (const file of catalogRouteFiles) {
    const contents = read(file);
    assert.match(contents, /getPublicServerSupabase/, file);
    assert.match(contents, /publicApiError/, file);
    assert.match(contents, /publicApiJson/, file);
    assert.doesNotMatch(contents, /createClient\(/, file);
    assert.doesNotMatch(contents, /NEXT_PUBLIC_SUPABASE_(URL|ANON_KEY)/, file);
    assert.doesNotMatch(contents, /storage\/v1\/object\/public/, file);
    assert.doesNotMatch(contents, /Supabase select failed/, file);
    assert.doesNotMatch(contents, /NextResponse\.json\(\{ error: error\.message/, file);
  }

  for (const file of publicProductRouteFiles) {
    const contents = read(file);
    assert.match(contents, /publicCatalogProductQuery/, file);
  }

  for (const file of publicProductPageFiles) {
    const contents = read(file);
    assert.match(contents, /publicCatalogProductQuery/, file);
  }

  const checkoutActions = read("src/app/checkout/actions.ts");
  assert.match(checkoutActions, /publicCatalogProductQuery/, "checkout must reject unavailable catalog products");
});

test("Catalog and account commerce pages do not render raw database errors", () => {
  const allArtists = read("src/components/shop/sections/AllArtists.tsx");
  const featuredArtists = read("src/components/FeaturedArtists.tsx");
  const pages = [
    {
      file: "src/app/artists/page.tsx",
      log: /Artists index failed to load artists/,
      stable: /Could not load artists right now\./,
    },
    {
      file: "src/app/editors/page.tsx",
      log: /Editors picks page failed to load products/,
      stable: /Could not load editor’s picks right now\./,
    },
    {
      file: "src/app/new/page.tsx",
      log: /New products page failed to load products/,
      stable: /Could not load new products right now\./,
    },
    {
      file: "src/app/category/[slug]/page.tsx",
      log: /Category page failed to load products/,
      stable: /Could not load this category right now\./,
    },
    {
      file: "src/app/dashboard/sales/page.tsx",
      log: /Artist sales page failed to load sales/,
      stable: /Could not load sales right now\./,
    },
    {
      file: "src/app/dashboard/products/page.tsx",
      log: /Dashboard products page failed to load products/,
      stable: /Could not load your products right now\./,
    },
    {
      file: "src/app/dashboard/cash-out/page.tsx",
      log: /Cash-out page failed to load unpaid items/,
      stable: /Could not load unpaid sales right now\./,
    },
    {
      file: "src/app/dashboard/cash-outs/page.tsx",
      log: /Cash-outs page failed to load cash outs/,
      stable: /Could not load payouts right now\./,
    },
    {
      file: "src/app/dashboard/images/page.tsx",
      log: /Dashboard images page failed to load product images/,
      stable: /Could not load your product images right now\./,
    },
    {
      file: "src/app/orders/page.tsx",
      log: /Customer orders page failed to load orders/,
      stable: /Could not load your orders right now\./,
    },
  ];

  for (const { file, log, stable } of pages) {
    const contents = read(file);
    assert.match(contents, /logger\.error/, file);
    assert.match(contents, log, file);
    assert.match(contents, stable, file);
    assert.doesNotMatch(contents, /Error loading [^\n]*\{[A-Za-z0-9_]+\.message\}/, file);
    assert.doesNotMatch(contents, /Error: \{[A-Za-z0-9_]+\.message\}/, file);
    assert.doesNotMatch(contents, /<AlertTriangle[\s\S]{0,240}\{[A-Za-z0-9_]+\.message\}/, file);
  }

  assert.match(allArtists, /setErr\("Could not load artists\."\)/);
  assert.doesNotMatch(allArtists, /setErr\(error instanceof Error \? error\.message/);
  assert.doesNotMatch(allArtists, /getErrorMessage/);
  assert.match(featuredArtists, /setErr\("Could not load featured artists\."\)/);
  assert.doesNotMatch(featuredArtists, /setErr\(getErrorMessage/);
  assert.doesNotMatch(featuredArtists, /getErrorMessage/);
});

test("Artist-only dashboard pages use the shared artist page guard", () => {
  const artistOnlyPages = [
    "src/app/dashboard/artist/page.tsx",
    "src/app/dashboard/images/page.tsx",
    "src/app/dashboard/sales/page.tsx",
    "src/app/dashboard/cash-out/page.tsx",
    "src/app/dashboard/cash-outs/page.tsx",
    "src/app/dashboard/products/page.tsx",
    "src/app/dashboard/products/new/page.tsx",
    "src/app/dashboard/products/designer/page.tsx",
    "src/app/dashboard/products/[id]/edit/page.tsx",
  ];

  for (const file of artistOnlyPages) {
    const contents = read(file);
    assert.match(contents, /import \{ requireArtistPage \} from "@\/lib\/auth\/artist"/, file);
    assert.match(contents, /await requireArtistPage\(\)/, file);
    assert.doesNotMatch(contents, /supabase\.auth\.getUser\(\)/, file);
  }

  const editPage = read("src/app/dashboard/products/[id]/edit/page.tsx");
  const artistPage = read("src/app/dashboard/artist/page.tsx");

  assert.match(editPage, /\.eq\("artist_id", artist\.id\)/);
  assert.match(artistPage, /\.eq\("id", artistSummary\.id\)/);
  assert.match(artistPage, /\.eq\("user_id", user\.id\)/);
});

test("Product catalog APIs share product card mapping", () => {
  const productRouteFiles = filesUnder("src/app/api/products").filter((file) =>
    file.endsWith("route.ts")
  );

  for (const file of productRouteFiles) {
    const contents = read(file);
    assert.match(contents, /mapCatalogProductCard/, file);
    assert.doesNotMatch(contents, /\.sort\(\s*\(?a,\s*b\)?\s*=>\s*\(a\?\./, file);
    assert.doesNotMatch(contents, /Untitled product[\s\S]*price_cents[\s\S]*merch-placeholder/, file);
  }

  const mapper = read("src/lib/catalog/product-card.ts");
  assert.match(mapper, /function sortBySortOrder/);
  assert.match(mapper, /publicImageUrl\(images\[0\]\?\.path\)/);
  assert.match(mapper, /fallbackBadge/);
});

test("Catalog randomization and designer IDs use platform crypto", () => {
  const randomRoute = read("src/app/api/products/random/route.ts");
  const randomHelper = read("src/lib/catalog/random.ts");
  const designer = read("src/app/dashboard/products/designer/DesignerClient.tsx");

  assert.match(randomRoute, /shuffleWithCrypto/);
  assert.doesNotMatch(randomRoute, /Math\.random/);
  assert.match(randomHelper, /randomInt/);
  assert.doesNotMatch(randomHelper, /Math\.random/);
  assert.match(designer, /crypto\.randomUUID/);
  assert.doesNotMatch(designer, /Math\.random/);
});

test("External new-tab links use noopener noreferrer", () => {
  const frontendFiles = [
    ...filesUnder("src/app").filter((file) => /\.(tsx)$/.test(file)),
    ...filesUnder("src/components").filter((file) => /\.(tsx)$/.test(file)),
  ];

  for (const file of frontendFiles) {
    const contents = read(file);
    const tags = contents.match(/<[^>]+target="_blank"[^>]*>/g) ?? [];

    for (const tag of tags) {
      assert.match(tag, /rel="noopener noreferrer"/, `${file} has an unsafe new-tab link: ${tag}`);
    }
  }
});

test("Supabase public URL and client construction stay centralized", () => {
  const appAndComponentFiles = [
    ...filesUnder("src/app").filter((file) => /\.(ts|tsx)$/.test(file)),
    ...filesUnder("src/components").filter((file) => /\.(ts|tsx)$/.test(file)),
  ];

  for (const file of appAndComponentFiles) {
    const contents = read(file);
    assert.doesNotMatch(contents, /storage\/v1\/object\/public/, file);
    assert.doesNotMatch(contents, /process\.env\.NEXT_PUBLIC_SUPABASE/, file);
    assert.doesNotMatch(contents, /createClient\(/, file);
  }

  const storage = read("src/lib/storage.ts");
  const publicServer = read("src/lib/supabase/public-server.ts");
  const service = read("src/lib/supabase/service.ts");

  assert.match(storage, /storage\/v1\/object\/public/);
  assert.match(publicServer, /createClient\(/);
  assert.match(service, /createClient\(/);
});

test("Production health endpoint checks runtime configuration and database reachability", () => {
  const health = read("src/app/api/health/route.ts");
  const operationalHealth = read("src/app/api/health/operations/route.ts");
  const maintenance = read("src/app/api/operations/maintenance/route.ts");
  const operationsSecret = read("src/lib/auth/operations-secret.ts");
  const clientIp = read("src/lib/api/client-ip.ts");

  assert.match(health, /STRIPE_WEBHOOK_SECRET/);
  assert.match(health, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(health, /POSTMARK_SERVER_TOKEN/);
  assert.match(health, /MOBILEMESSAGE_USERNAME/);
  assert.match(health, /PRINTIFY_API_TOKEN/);
  assert.match(health, /PRINTIFY_DEFAULT_BLUEPRINT_ID/);
  assert.match(health, /PRINTIFY_DEFAULT_PRINT_PROVIDER_ID/);
  assert.match(health, /PRINTIFY_DEFAULT_VARIANT_IDS/);
  assert.match(health, /OPERATIONAL_HEALTH_SECRET/);
  assert.match(health, /export const dynamic = "force-dynamic"/);
  assert.match(health, /serverEnv\.operationalHealthSecret/);
  assert.match(health, /supabase_database/);
  assert.match(health, /logger\.error/);
  assert.match(health, /Missing required runtime configuration\./);
  assert.match(health, /Database reachability check failed\./);
  assert.doesNotMatch(health, /message: error instanceof Error \? error\.message/);
  assert.doesNotMatch(health, /message: error\?\.message/);
  assert.match(health, /status: ok \? 200 : 503/);
  assert.match(health, /@\/lib\/api\/no-store/);
  assert.match(health, /noStoreJson/);
  assert.doesNotMatch(health, /NextResponse\.json/);
  assert.match(operationalHealth, /serverEnv\.operationalHealthSecret/);
  assert.match(operationalHealth, /operational health runtime configuration failed/);
  assert.match(operationalHealth, /Operational health secret is not configured\./);
  assert.match(operationalHealth, /hasValidOperationalSecret/);
  assert.match(operationalHealth, /getClientIp/);
  assert.match(operationalHealth, /checkDurableRateLimit/);
  assert.match(operationalHealth, /OPERATIONAL_HEALTH_RATE_LIMIT = 60/);
  assert.match(operationalHealth, /OPERATIONAL_HEALTH_RATE_WINDOW_MS = 60 \* 1000/);
  assert.match(operationalHealth, /`operations_health:\$\{ip\}`/);
  assert.match(operationalHealth, /"check_rate_limit"/);
  assert.match(operationalHealth, /fallback: "deny"/);
  assert.match(operationalHealth, /status: "rate_limited"/);
  assert.match(operationalHealth, /@\/lib\/api\/no-store/);
  assert.match(operationalHealth, /noStoreJson/);
  assert.doesNotMatch(operationalHealth, /NextResponse\.json/);
  assert.match(operationsSecret, /timingSafeEqual/);
  assert.match(operationsSecret, /x-merch-tent-ops-secret/);
  assert.match(operationsSecret, /authorization/);
  assert.match(operationsSecret, /\^Bearer\\s\+/);
  assert.match(clientIp, /x-forwarded-for/);
  assert.match(clientIp, /x-real-ip/);
  assert.match(clientIp, /cf-connecting-ip/);
  assert.match(operationalHealth, /orders_operational_exceptions/);
  assert.match(operationalHealth, /stripe_webhook_events/);
  assert.match(operationalHealth, /STALE_WEBHOOK_PROCESSING_MINUTES = 15/);
  assert.match(operationalHealth, /STALE_NOTIFICATION_PENDING_MINUTES = 15/);
  assert.match(operationalHealth, /STALE_PRINTIFY_PRODUCT_SYNC_MINUTES = 30/);
  assert.match(operationalHealth, /STALE_PRINTIFY_ORDER_SYNC_MINUTES = 30/);
  assert.match(operationalHealth, /STALE_PRODUCT_GENERATION_MINUTES = 30/);
  assert.match(operationalHealth, /stalePrintifyProductSyncCutoff/);
  assert.match(operationalHealth, /staleProductGenerationCutoff/);
  assert.match(operationalHealth, /failed_printify_product_syncs/);
  assert.match(operationalHealth, /stale_printify_product_syncs/);
  assert.match(operationalHealth, /stale_product_generations/);
  assert.match(operationalHealth, /SEVERE_PLATFORM_EVENT_WINDOW_HOURS = 24/);
  assert.match(operationalHealth, /severePlatformEventCutoff/);
  assert.match(operationalHealth, /recent_severe_platform_events/);
  assert.match(operationalHealth, /severe_platform_event_window_hours/);
  assert.match(operationalHealth, /failed_webhooks/);
  assert.match(operationalHealth, /stale_processing_webhooks/);
  assert.match(operationalHealth, /failed_notifications/);
  assert.match(operationalHealth, /stale_pending_notifications/);
  assert.match(operationalHealth, /failed_printify_order_syncs/);
  assert.match(operationalHealth, /stale_printify_order_syncs/);
  assert.match(operationalHealth, /stale_printify_order_sync_minutes/);
  assert.match(operationalHealth, /stale_product_generation_minutes/);
  assert.match(operationalHealth, /\.from\("products"\)/);
  assert.match(operationalHealth, /\.eq\("production_status", "generating"\)/);
  assert.match(operationalHealth, /\.lt\("created_at", staleProductGenerationCutoff\)/);
  assert.match(operationalHealth, /stalePrintifyOrderSyncCutoff/);
  assert.match(operationalHealth, /platform_events/);
  assert.match(operationalHealth, /\.in\("severity", \["error", "critical"\]\)/);
  assert.match(operationalHealth, /\.gte\("created_at", severePlatformEventCutoff\)/);
  assert.match(operationalHealth, /\.eq\("status", "processing"\)/);
  assert.match(operationalHealth, /\.lt\("processing_started_at", staleWebhookCutoff\)/);
  assert.match(operationalHealth, /\.eq\("status", "pending"\)/);
  assert.match(operationalHealth, /\.lt\("created_at", staleNotificationCutoff\)/);
  assert.match(operationalHealth, /thresholds/);
  assert.match(operationalHealth, /Operational health check query failed/);
  assert.match(operationalHealth, /Operational check query failed\./);
  assert.doesNotMatch(operationalHealth, /message:\s*error instanceof Error \? error\.message/);
  assert.doesNotMatch(operationalHealth, /message: result\.error\?\.message/);
  assert.match(operationalHealth, /notification_deliveries/);
  assert.match(operationalHealth, /fulfillment_operational_exceptions/);
  assert.match(operationalHealth, /printify_sync_events/);
  assert.match(operationalHealth, /product_designs/);
  assert.match(operationalHealth, /\.eq\("printify_status", "syncing"\)/);
  assert.match(operationalHealth, /\.lt\("updated_at", stalePrintifyProductSyncCutoff\)/);
  assert.match(operationalHealth, /printify_order_syncs/);
  assert.match(operationalHealth, /payout_operational_exceptions/);
  assert.match(operationalHealth, /stripe_financial_events/);
  assert.match(operationalHealth, /\.in\("review_status", \["open", "investigating"\]\)/);
  assert.match(operationalHealth, /open_stripe_financial_events/);
  assert.match(operationalHealth, /product_generation_operational_exceptions/);
  assert.match(operationalHealth, /merch_credit_operational_exceptions/);
  assert.match(operationalHealth, /merch_credit_balance_reconciliation_exceptions/);
  assert.match(operationalHealth, /attention_required/);
  assert.match(operationalHealth, /status: ok \? 200 : 503/);
  assert.match(maintenance, /@\/lib\/api\/no-store/);
  assert.match(maintenance, /noStoreJson/);
  assert.doesNotMatch(maintenance, /NextResponse\.json/);
});

test("Provider email configuration is centralized behind server env helpers", () => {
  const postmark = read("src/lib/postmark.ts");
  const testPostmark = read("src/app/api/test-postmark/route.ts");
  const serverEnv = read("src/lib/env.server.ts");

  assert.match(serverEnv, /optionalPostmarkServerToken/);
  assert.match(serverEnv, /postmarkCustomerTemplateAlias/);
  assert.match(postmark, /serverEnv\.optionalPostmarkServerToken/);
  assert.match(postmark, /type OrderEmailSendTask/);
  assert.match(postmark, /required: true/);
  assert.match(postmark, /required: false/);
  assert.match(postmark, /Promise\.allSettled/);
  assert.match(postmark, /Postmark customer email is not configured\./);
  assert.match(postmark, /Postmark customer order email failed\./);
  assert.match(postmark, /Postmark order email send failed\./);
  assert.doesNotMatch(postmark, /await Promise\.all\(sends\)/);
  assert.match(testPostmark, /serverEnv\.postmarkTestSecret/);
  assert.match(testPostmark, /export async function POST/);
  assert.match(testPostmark, /export const runtime = "nodejs"/);
  assert.match(testPostmark, /export const dynamic = "force-dynamic"/);
  assert.match(testPostmark, /@\/lib\/api\/no-store/);
  assert.match(testPostmark, /noStoreJson/);
  assert.match(testPostmark, /checkDurableRateLimit/);
  assert.match(testPostmark, /`postmark-test:\$\{ip\}`/);
  assert.match(testPostmark, /check_public_rate_limit/);
  assert.match(testPostmark, /fallback: "deny"/);
  assert.match(testPostmark, /Too many attempts\./);
  assert.match(testPostmark, /rejectCrossOriginRequest\(req\)/);
  assert.match(testPostmark, /headers\.get\("x-postmark-test-secret"\)/);
  assert.match(testPostmark, /process\.env\.NODE_ENV === "production"/);
  assert.doesNotMatch(testPostmark, /export async function GET/);
  assert.doesNotMatch(testPostmark, /searchParams\.get\("secret"\)/);
  assert.doesNotMatch(testPostmark, /detail:\s*getErrorMessage/);
  assert.doesNotMatch(postmark, /process\.env/);
  assert.doesNotMatch(testPostmark, /process\.env\.(POSTMARK|STORE_NAME|COMPANY_ADDRESS|MANAGE_ORDERS_URL)/);
});

test("SEO routes expose canonical metadata, robots, and a data-backed sitemap", () => {
  const layout = read("src/app/layout.tsx");
  const robots = read("src/app/robots.ts");
  const sitemap = read("src/app/sitemap.ts");

  assert.match(layout, /metadataBase: new URL\(publicEnv\.siteUrl\(\)\)/);
  assert.match(layout, /openGraph/);
  assert.match(robots, /sitemap: `\$\{siteUrl\}\/sitemap\.xml`/);
  assert.match(robots, /disallow: \[/);
  assert.match(sitemap, /getPublicServerSupabase/);
  assert.doesNotMatch(sitemap, /getServiceSupabase/);
  assert.match(sitemap, /from\("products"\)/);
  assert.match(sitemap, /publicCatalogProductQuery/);
  assert.match(sitemap, /from\("artists"\)/);
  assert.match(sitemap, /eq\("is_public", true\)/);
  assert.match(sitemap, /from\("journal"\)/);
  assert.match(sitemap, /eq\("status", "published"\)/);
});

test("Next.js config applies baseline production security headers", () => {
  const nextConfig = read("next.config.ts");

  assert.match(nextConfig, /Strict-Transport-Security/);
  assert.match(nextConfig, /max-age=63072000; includeSubDomains; preload/);
  assert.match(nextConfig, /X-Content-Type-Options/);
  assert.match(nextConfig, /nosniff/);
  assert.match(nextConfig, /X-Frame-Options/);
  assert.match(nextConfig, /DENY/);
  assert.match(nextConfig, /Referrer-Policy/);
  assert.match(nextConfig, /Permissions-Policy/);
  assert.match(nextConfig, /optionalUrlHostname/);
  assert.match(nextConfig, /Environment variable \$\{key\} must be a valid URL/);
  assert.match(nextConfig, /optionalUrlHostname\("NEXT_PUBLIC_SUPABASE_URL"\)/);
  assert.doesNotMatch(nextConfig, /new URL\(process\.env\.NEXT_PUBLIC_SUPABASE_URL/);
});

test("Production release checklist captures gates, operations checks, and live rehearsals", () => {
  const checklist = read("PRODUCTION_RELEASE_CHECKLIST.md");
  const packageJson = read("package.json");
  const smoke = read("scripts/production-smoke.mjs");
  const envCheck = read("scripts/validate-production-env.mjs");
  const runtimeEnv = read("src/lib/env.ts");
  const runbook = read("PRODUCTION_OPERATIONS_RUNBOOK.md");
  const recoveryDrill = read("PRODUCTION_RECOVERY_DRILL.md");
  const ci = read(".github/workflows/ci.yml");
  const readme = read("README.md");
  const envExample = read(".env.example");
  const gitignore = read(".gitignore");

  assert.match(checklist, /npm run release:check/);
  assert.match(checklist, /npm run verify/);
  assert.match(checklist, /npm run build/);
  assert.match(checklist, /npm run audit:prod/);
  assert.match(checklist, /npm run env:check:prod/);
  assert.match(checklist, /npm run db:lint:linked/);
  assert.match(checklist, /npm run smoke:prod/);
  assert.match(checklist, /public production hostname/);
  assert.match(packageJson, /"smoke:prod": "node scripts\/production-smoke\.mjs"/);
  assert.match(packageJson, /"env:check:prod": "node scripts\/validate-production-env\.mjs"/);
  assert.match(packageJson, /"release:check": "npm run verify && npm run audit:prod && npm run env:check:prod && npm run build"/);
  assert.match(readme, /Next\.js 16 App Router/);
  assert.match(readme, /PRINTIFY_API_TOKEN=/);
  assert.match(readme, /PRINTIFY_SHOP_ID=/);
  assert.match(readme, /PRINTIFY_DEFAULT_BLUEPRINT_ID=/);
  assert.match(readme, /PRINTIFY_DEFAULT_PRINT_PROVIDER_ID=/);
  assert.match(readme, /PRINTIFY_DEFAULT_VARIANT_IDS=/);
  assert.match(readme, /OPERATIONAL_HEALTH_SECRET=/);
  assert.match(readme, /npm run release:check/);
  assert.match(readme, /npm run verify/);
  assert.match(readme, /npm run audit:prod/);
  assert.match(readme, /npm run env:check:prod/);
  assert.doesNotMatch(readme, /NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(envExample, /NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY/);
  assert.match(gitignore, /^\.env\*$/m);
  assert.match(gitignore, /^!\.env\.example$/m);
  assert.doesNotMatch(readme, /Next\.js 15/);
  assert.match(ci, /Release check/);
  assert.match(ci, /npm run release:check/);
  assert.match(ci, /NEXT_PUBLIC_SITE_URL: https:\/\/ci\.merchtent\.app/);
  assert.match(ci, /NEXT_PUBLIC_SUPABASE_ANON_KEY: ci-anon-key-1234567890abcdef123456/);
  assert.match(ci, /SUPABASE_SERVICE_ROLE_KEY: ci-service-role-key-1234567890abcdef/);
  assert.match(ci, /STRIPE_SECRET_KEY: sk_test_ci_1234567890abcdef/);
  assert.match(ci, /STRIPE_WEBHOOK_SECRET: whsec_ci_1234567890abcdef/);
  assert.match(ci, /OPERATIONAL_HEALTH_SECRET: ci-operational-health-secret-32-chars/);
  assert.match(ci, /Require Supabase DB lint secrets on main/);
  assert.match(ci, /github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
  assert.match(ci, /SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF are required on main pushes/);
  assert.match(smoke, /SMOKE_BASE_URL/);
  assert.match(smoke, /\/api\/health/);
  assert.match(smoke, /\/api\/health\/operations/);
  assert.match(smoke, /\/api\/operations\/maintenance/);
  assert.match(smoke, /method: "POST"/);
  assert.match(smoke, /payload\.ok !== true \|\| payload\.status !== "ok" \|\| !Array\.isArray\(payload\.tasks\)/);
  assert.match(smoke, /payload\.audit_logged !== true/);
  assert.match(smoke, /operations maintenance did not confirm audit logging/);
  assert.match(smoke, /assertMaintenanceTasks/);
  assert.match(smoke, /expire_stale_merch_credit_reservations/);
  assert.match(smoke, /mark_stale_stripe_webhooks_failed/);
  assert.match(smoke, /mark_stale_notification_deliveries_failed/);
  assert.match(smoke, /mark_stale_printify_order_syncs_failed/);
  assert.match(smoke, /mark_stale_printify_product_syncs_failed/);
  assert.match(smoke, /operations maintenance response missing task/);
  assert.match(smoke, /tasksByName/);
  assert.match(smoke, /task\.ok !== true/);
  assert.match(smoke, /did not report ok/);
  assert.match(smoke, /Number\.isFinite\(task\.count\)/);
  assert.match(smoke, /returned invalid count/);
  assert.match(smoke, /Number\.isFinite\(task\.duration_ms\)/);
  assert.match(smoke, /returned invalid duration_ms/);
  assert.match(smoke, /\/api\/test-postmark/);
  assert.match(smoke, /dev-only Postmark endpoint unavailable/);
  assert.match(smoke, /assertStatus\(response, 404\)/);
  assert.match(smoke, /OPERATIONAL_HEALTH_SECRET/);
  assert.match(smoke, /\/sitemap\.xml/);
  assert.match(smoke, /assertSecurityHeaders/);
  assert.match(smoke, /assertNoStore/);
  assert.match(smoke, /cache-control/);
  assert.match(smoke, /no-store/);
  assert.match(smoke, /max-age=0/);
  assert.match(smoke, /pragma/);
  assert.match(smoke, /expires/);
  assert.match(smoke, /assertPublicApiCache/);
  assert.match(smoke, /s-maxage=60/);
  assert.match(smoke, /stale-while-revalidate=300/);
  assert.match(smoke, /public api vary/);
  assert.match(smoke, /x-content-type-options/);
  assert.match(smoke, /strict-transport-security/);
  assert.match(smoke, /x-content-type-options/);
  assert.match(smoke, /x-frame-options/);
  assert.match(smoke, /\/checkout/);
  assert.match(smoke, /\/cart/);
  assert.match(smoke, /\/new/);
  assert.match(envCheck, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(envCheck, /NEXT_PUBLIC_SITE_URL/);
  assert.match(envCheck, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(envCheck, /STRIPE_SECRET_KEY/);
  assert.match(envCheck, /STRIPE_WEBHOOK_SECRET/);
  assert.match(envCheck, /whsec_/);
  assert.match(envCheck, /POSTMARK_SERVER_TOKEN/);
  assert.match(envCheck, /MOBILEMESSAGE_USERNAME/);
  assert.match(envCheck, /PRINTIFY_API_TOKEN/);
  assert.match(envCheck, /PRINTIFY_DEFAULT_VARIANT_IDS/);
  assert.match(envCheck, /PRINTIFY_DEFAULT_TEE_VARIANT_IDS/);
  assert.match(envCheck, /OPERATIONAL_HEALTH_SECRET/);
  assert.match(envCheck, /NEXT_PUBLIC_SUPABASE_ANON_KEY", minLength: 32/);
  assert.match(envCheck, /SUPABASE_SERVICE_ROLE_KEY", minLength: 32/);
  assert.match(envCheck, /STRIPE_SECRET_KEY", prefix: "sk_", minLength: 16/);
  assert.match(envCheck, /STRIPE_WEBHOOK_SECRET", prefix: "whsec_", minLength: 16/);
  assert.match(envCheck, /POSTMARK_SERVER_TOKEN", minLength: 16/);
  assert.match(envCheck, /PRINTIFY_API_TOKEN", minLength: 16/);
  assert.match(envCheck, /at least \$\{rule\.minLength\} characters/);
  assert.match(envCheck, /isPlaceholderValue/);
  assert.match(envCheck, /must not use a placeholder or example value/);
  assert.match(envCheck, /must use https in production/);
  assert.match(envCheck, /isLocalOrPrivateHost/);
  assert.match(envCheck, /must be a public production hostname/);
  assert.match(envCheck, /isReservedDocumentationHost/);
  assert.match(envCheck, /must not use a reserved documentation hostname/);
  assert.match(envCheck, /isStrictInteger/);
  assert.match(envCheck, /\^\\d\+\$/);
  assert.doesNotMatch(envCheck, /Number\.parseInt\(value, 10\)/);
  assert.match(runtimeEnv, /parseStrictInteger/);
  assert.match(runtimeEnv, /Number\.isSafeInteger/);
  assert.match(runtimeEnv, /must be a comma-separated list of integers/);
  assert.doesNotMatch(runtimeEnv, /Number\.parseInt\(value, 10\)/);
  assert.match(checklist, /\/api\/health/);
  assert.match(checklist, /production URL environment variables use HTTPS/);
  assert.match(checklist, /\/api\/health\/operations/);
  assert.match(checklist, /POST \/api\/operations\/maintenance/);
  assert.match(runbook, /POST \/api\/operations\/maintenance/);
  assert.match(runbook, /npm run env:check:prod/);
  assert.match(runbook, /stale merch credit reservations/);
  assert.match(runbook, /stale Stripe webhook processing rows/);
  assert.match(checklist, /\/admin\/operations/);
  assert.match(checklist, /Stripe checkout test/);
  assert.match(checklist, /self-service product designer save/);
  assert.match(checklist, /Stripe Connect payout rehearsal/);
  assert.match(checklist, /Backup restore drill has been completed using `PRODUCTION_RECOVERY_DRILL\.md`/);
  assert.match(checklist, /Recovery drill evidence records RTO, RPO, backup timestamp, migration alignment, health output, smoke output, and follow-up owners/);
  assert.match(runbook, /PRODUCTION_RECOVERY_DRILL\.md/);
  assert.match(recoveryDrill, /Backup Scope/);
  assert.match(recoveryDrill, /Supabase Postgres data/);
  assert.match(recoveryDrill, /Supabase storage buckets/);
  assert.match(recoveryDrill, /Stripe, Printify, Postmark, and SMS state cannot be restored/);
  assert.match(recoveryDrill, /Pre-Drill Safety/);
  assert.match(recoveryDrill, /never directly over live production/);
  assert.match(recoveryDrill, /Restore Drill Procedure/);
  assert.match(recoveryDrill, /npm run env:check:prod/);
  assert.match(recoveryDrill, /npx supabase migration list/);
  assert.match(recoveryDrill, /npm run verify/);
  assert.match(recoveryDrill, /npm run build/);
  assert.match(recoveryDrill, /npm run smoke:prod/);
  assert.match(recoveryDrill, /Rollback Decision Path/);
  assert.match(recoveryDrill, /Migration Recovery Rules/);
  assert.match(recoveryDrill, /Recovery Validation Queries/);
  assert.match(recoveryDrill, /orders_operational_exceptions/);
  assert.match(recoveryDrill, /product_generation_operational_exceptions/);
  assert.match(recoveryDrill, /payout_operational_exceptions/);
  assert.match(recoveryDrill, /stripe_financial_events/);
  assert.match(recoveryDrill, /Drill Pass Criteria/);
});

test("Checkout validates fulfillment-grade customer and shipping fields", () => {
  const checkout = read("src/app/checkout/actions.ts");
  const checkoutForm = read("src/app/checkout/CheckoutFormClient.tsx");
  const checkoutSuccess = read("src/app/checkout/success/page.tsx");

  assert.match(checkout, /checkoutDetailsSchema/);
  assert.match(checkout, /first_name: z\.string\(\)\.min\(1\)/);
  assert.match(checkout, /line1: z\.string\(\)\.min\(3\)/);
  assert.match(checkout, /postal_code: z\.string\(\)\.min\(3\)/);
  assert.match(checkout, /country: z\.string\(\)\.trim\(\)\.regex\(\/\^\[A-Za-z\]\{2\}\$\/\)\.transform/);
  assert.match(checkout, /value\.toUpperCase\(\)/);
  assert.match(checkout, /phone_number_collection/);
  assert.match(checkout, /const checkoutAttemptIdSchema = z\.uuid\(\)/);
  assert.match(checkout, /checkout_attempt_id/);
  assert.match(checkout, /idempotencyKey: `checkout:\$\{user\.id\}:\$\{checkoutAttemptId\}`/);
  assert.match(checkout, /idempotencyKey: `checkout-session:\$\{user\?\.id \?\? "guest"\}:\$\{checkoutAttemptId\}`/);
  assert.match(checkout, /CHECKOUT_ATTEMPT_LIMIT = 12/);
  assert.match(checkout, /CHECKOUT_ATTEMPT_WINDOW_MS = 10 \* 60 \* 1000/);
  assert.match(checkout, /checkoutRateLimitKey/);
  assert.match(checkout, /checkDurableRateLimit/);
  assert.match(checkout, /check_public_rate_limit/);
  assert.match(checkout, /fallback: "deny"/);
  assert.match(checkout, /Too many checkout attempts\. Try again shortly\./);
  assert.match(checkoutForm, /pattern="\[A-Za-z\]\{2\}"/);
  assert.match(checkoutForm, /fd\.set\("checkout_attempt_id", crypto\.randomUUID\(\)\)/);
  assert.match(checkoutForm, /aria-label="Country code"/);
  assert.match(checkoutForm, /name="phone"[\s\S]*?required/);
  assert.match(checkoutForm, /DRAFT_LIMITS/);
  assert.match(checkoutForm, /normaliseDraft\(JSON\.parse\(raw\)\)/);
  assert.match(checkoutForm, /JSON\.stringify\(normaliseDraft\(d\)\)/);
  assert.match(checkoutForm, /country: savedDraft\.country \|\| emptyDraft\.country/);
  assert.doesNotMatch(checkoutForm, /JSON\.parse\(raw\) as Draft/);
  assert.match(checkoutForm, /Could not start checkout\. Please try again\./);
  assert.doesNotMatch(checkoutForm, /setErrorMsg\(err instanceof Error \? err\.message/);
  assert.doesNotMatch(checkoutSuccess, /eslint-disable-next-line react-hooks\/exhaustive-deps/);
  assert.match(checkoutSuccess, /\}, \[clear, close\]\)/);
  assert.match(checkout, /logger\.error/);
  assert.match(checkout, /checkout product lookup failed/);
  assert.match(checkout, /Could not validate the products in your cart/);
  assert.match(checkout, /checkout merch credit reservation failed/);
  assert.match(checkout, /Stripe checkout session creation failed/);
  assert.match(checkout, /failed to release merch credit reservation after checkout failure/);
  assert.match(checkout, /attachMerchCreditReservationToStripeSession/);
  assert.match(checkout, /stripe_checkout_session_attach_failed/);
  assert.match(checkout, /failed to release merch credit reservation after session attach failure/);
  assert.match(checkout, /stripe\.checkout\.sessions\.expire\(session\.id\)/);
  assert.match(checkout, /failed to expire Stripe checkout session after merch credit attach failure/);
  assert.match(checkout, /recordPlatformEvent/);
  assert.match(checkout, /merch_credit_reservation_attach_failed/);
  assert.match(checkout, /severity: "critical"/);
  assert.match(checkout, /Could not audit merch credit checkout failure\./);
  assert.doesNotMatch(checkout, /return \{ error: productsError\.message \}/);
  assert.doesNotMatch(checkout, /error instanceof Error\s*\?\s*error\.message\s*:\s*"Could not start Stripe checkout\."/);
});

test("Persisted cart state is normalized before rendering or checkout submission", () => {
  const storage = read("src/lib/cart/storage.ts");
  const provider = read("src/components/CartProvider.tsx");
  const checkout = read("src/app/checkout/actions.ts");

  assert.match(storage, /MAX_CART_ITEMS = 99/);
  assert.match(storage, /MAX_CART_QTY = 99/);
  assert.match(storage, /normaliseCartState/);
  assert.match(storage, /normaliseCartItem/);
  assert.match(storage, /cleanInteger\(raw\.qty, 1, MAX_CART_QTY\)/);
  assert.match(storage, /cleanString\(raw\.product_id, 100\)/);
  assert.match(storage, /normaliseCartState\(JSON\.parse\(raw\)\)/);
  assert.match(storage, /JSON\.stringify\(normaliseCartState\(state\)\)/);
  assert.doesNotMatch(storage, /return raw \? JSON\.parse\(raw\)/);
  assert.match(provider, /useState<CartState>\(\(\) => loadCart\(\)\)/);
  assert.match(checkout, /MAX_CHECKOUT_PRODUCT_LINES = 99/);
  assert.match(checkout, /STRIPE_WEBHOOK_LINE_ITEM_FETCH_LIMIT = 100/);
  assert.match(checkout, /const cartSchema = z\.array\(cartItemSchema\)\.min\(1\)\.max\(MAX_CHECKOUT_PRODUCT_LINES\)/);
  assert.match(checkout, /line_items\.length > STRIPE_WEBHOOK_LINE_ITEM_FETCH_LIMIT/);
  assert.match(checkout, /checkout line item count exceeds webhook fetch limit/);
  assert.match(checkout, /qty: z\.coerce\.number\(\)\.int\(\)\.min\(1\)\.max\(99\)/);
});

test("Customer order details expose an authenticated owner-scoped receipt", () => {
  const orderDetail = read("src/app/orders/[id]/page.tsx");
  const ordersPage = read("src/app/orders/page.tsx");
  const dashboard = read("src/app/dashboard/page.tsx");
  const receiptRoute = read("src/app/api/orders/[id]/receipt/route.ts");

  assert.match(ordersPage, /creditBalanceError/);
  assert.match(ordersPage, /Customer orders page failed to load merch credit balance/);
  assert.match(ordersPage, /Credit balance could not be loaded right now/);
  assert.doesNotMatch(ordersPage, /const \{ data: creditBalance \} = await supabase/);
  assert.match(dashboard, /balanceError/);
  assert.match(dashboard, /Fan dashboard failed to load merch credit balance/);
  assert.match(dashboard, /balanceUnavailable/);
  assert.match(dashboard, /Credit balance could not be loaded right now/);
  assert.match(orderDetail, /\/api\/orders\/\$\{order\.id\}\/receipt/);
  assert.doesNotMatch(orderDetail, /\/dashboard\/orders/);
  assert.match(orderDetail, /href="\/orders"/);
  assert.match(orderDetail, /customer order detail load failed/);
  assert.match(orderDetail, /Could not load this order\./);
  assert.match(orderDetail, /tracking_code, tracking_carrier, tracking_url/);
  assert.match(orderDetail, /tracking_carrier\?: string \| null/);
  assert.match(orderDetail, /typedOrder\.tracking_carrier/);
  assert.match(orderDetail, /normaliseExternalUrl\(typedOrder\.tracking_url\)/);
  assert.match(orderDetail, /type OrderStatusEvent/);
  assert.match(orderDetail, /\.from\("order_status_events"\)/);
  assert.match(orderDetail, /\.eq\("order_id", typedOrder\.id\)/);
  assert.match(orderDetail, /\.order\("created_at", \{ ascending: false \}\)/);
  assert.match(orderDetail, /\.limit\(25\)/);
  assert.match(orderDetail, /customer order status history load failed/);
  assert.match(orderDetail, /Status history/);
  assert.match(orderDetail, /Status history is unavailable right now\./);
  assert.match(orderDetail, /No status events recorded yet\./);
  assert.match(orderDetail, /event\.metadata\?\.carrier/);
  assert.match(orderDetail, /event\.metadata\?\.trackingNumber/);
  assert.doesNotMatch(orderDetail, /href=\{typedOrder\.tracking_url\}/);
  assert.doesNotMatch(orderDetail, /Error loading order: \$\{error\.message\}/);
  assert.match(receiptRoute, /export async function GET/);
  assert.match(receiptRoute, /supabase\.auth\.getUser\(\)/);
  assert.match(receiptRoute, /\.eq\("user_id", user\.id\)/);
  assert.match(receiptRoute, /NO_STORE_HEADERS, noStoreJson/);
  assert.match(receiptRoute, /return noStoreJson\(\{ error: "Sign in required\." \}/);
  assert.match(receiptRoute, /return noStoreJson\(\s*\{ error: error \? "Could not load this receipt\." : "Order not found\." \}/);
  assert.match(receiptRoute, /customer order receipt load failed/);
  assert.match(receiptRoute, /recordPlatformEvent/);
  assert.match(receiptRoute, /customer_receipt_viewed/);
  assert.match(receiptRoute, /Customer receipt access audit failed/);
  assert.match(receiptRoute, /actorUserId: user\.id/);
  assert.match(receiptRoute, /orderId: typedOrder\.id/);
  assert.match(receiptRoute, /tracking_code: string \| null/);
  assert.match(receiptRoute, /tracking_carrier: string \| null/);
  assert.match(receiptRoute, /tracking_url: string \| null/);
  assert.match(receiptRoute, /tracking_code, tracking_carrier, tracking_url/);
  assert.match(receiptRoute, /const trackingRows = \[/);
  assert.match(receiptRoute, /order\.tracking_carrier/);
  assert.match(receiptRoute, /order\.tracking_code/);
  assert.match(receiptRoute, /order\.tracking_url/);
  assert.match(receiptRoute, /Fulfilment/);
  assert.match(receiptRoute, /has_tracking/);
  assert.match(receiptRoute, /tracking_carrier: typedOrder\.tracking_carrier/);
  assert.match(receiptRoute, /Could not load this receipt\./);
  assert.doesNotMatch(receiptRoute, /\{ error: error\?\.message/);
  assert.doesNotMatch(receiptRoute, /NextResponse\.json\(\{ error: "Sign in required\." \}/);
  assert.match(receiptRoute, /Content-Disposition/);
  assert.match(receiptRoute, /receiptFilename/);
  assert.match(receiptRoute, /NO_STORE_HEADERS/);
  assert.match(receiptRoute, /\.\.\.NO_STORE_HEADERS/);
  assert.match(receiptRoute, /Content-Security-Policy/);
  assert.match(receiptRoute, /default-src 'none'/);
  assert.match(receiptRoute, /createReceiptCspNonce/);
  assert.match(receiptRoute, /randomBytes\(16\)\.toString\("base64"\)/);
  assert.match(receiptRoute, /receiptCsp\(nonce\)/);
  assert.match(receiptRoute, /style-src 'nonce-\$\{nonce\}'/);
  assert.match(receiptRoute, /<style nonce="\$\{escapeHtml\(nonce\)\}">/);
  assert.doesNotMatch(receiptRoute, /unsafe-inline/);
  assert.match(receiptRoute, /frame-ancestors 'none'/);
  assert.match(receiptRoute, /X-Robots-Tag/);
  assert.match(receiptRoute, /noindex, noarchive/);
  assert.match(receiptRoute, /escapeHtml/);
});

test("Artist dashboard actions do not expose raw database errors", () => {
  const artistActions = read("src/app/dashboard/artist/actions.ts");

  assert.match(artistActions, /updateArtistProfile/);
  assert.match(artistActions, /requireArtistAction/);
  assert.match(artistActions, /logger\.error/);
  assert.match(artistActions, /artist profile update failed/);
  assert.match(artistActions, /Could not verify artist ownership\./);
  assert.match(artistActions, /Could not update artist profile\./);
  assert.match(artistActions, /payload\.artistId !== artist\.id/);
  assert.match(artistActions, /\.eq\("id", artist\.id\)/);
  assert.match(artistActions, /\.eq\("user_id", user\.id\)/);
  assert.doesNotMatch(artistActions, /supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(artistActions, /return \{ error: fetchErr\.message \}/);
  assert.doesNotMatch(artistActions, /return \{ error: updateErr\.message \}/);
});

test("External artist and polaroid links are normalized before storage or exposure", () => {
  const urls = read("src/lib/urls.ts");
  const artistActions = read("src/app/dashboard/artist/actions.ts");
  const adminArtistsPage = read("src/app/admin/artists/page.tsx");
  const adminArtist = read("src/app/api/admin/artists/[id]/route.ts");
  const adminPolaroidCreate = read("src/app/api/admin/polaroids/route.ts");
  const adminPolaroidUpdate = read("src/app/api/admin/polaroids/[id]/route.ts");
  const publicPolaroids = read("src/app/api/polaroids/route.ts");

  assert.match(urls, /export function normaliseExternalUrl/);
  assert.match(urls, /new URL\(candidate\)/);
  assert.match(urls, /`https:\/\/\$\{trimmed\}`/);
  assert.match(urls, /"http:"/);
  assert.match(urls, /"https:"/);
  assert.match(urls, /return null/);
  assert.match(artistActions, /normaliseExternalUrl\(payload\.facebook_url\)/);
  assert.match(artistActions, /normaliseExternalUrl\(payload\.instagram_url\)/);
  assert.match(artistActions, /normaliseExternalUrl\(payload\.website_url\)/);
  assert.match(adminArtistsPage, /href=\{`\/artists\/\$\{artist\.slug\}`\}/);
  assert.doesNotMatch(adminArtistsPage, /href=\{`\/\$\{artist\.slug\}`\}/);
  assert.match(adminArtist, /normaliseExternalUrl\(instagram_url\)/);
  assert.match(adminArtist, /normaliseExternalUrl\(website_url\)/);
  assert.doesNotMatch(adminArtist, /instagram_url:\s*instagram_url\?\.trim\(\) \|\| null/);
  assert.match(adminPolaroidCreate, /instagram_url: normaliseExternalUrl\(instagram_url\)/);
  assert.match(adminPolaroidUpdate, /instagram_url: normaliseExternalUrl\(instagram_url\)/);
  assert.match(publicPolaroids, /link: normaliseExternalUrl\(p\.instagram_url\)/);
});

test("Manual product creation publishes only after required assets and audit events", () => {
  const manualAction = read("src/app/dashboard/products/new/actions.ts");
  const manualPage = read("src/app/dashboard/products/new/page.tsx");

  assert.match(manualPage, /import \{ requireArtistPage \} from "@\/lib\/auth\/artist"/);
  assert.match(manualPage, /export default async function NewProductPage/);
  assert.match(manualPage, /await requireArtistPage\(\)/);
  assert.match(manualAction, /createProductAction/);
  assert.match(manualAction, /requireArtistAction/);
  assert.doesNotMatch(manualAction, /supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(manualAction, /\.from\("artists"\)/);
  assert.match(manualAction, /checkDurableRateLimit/);
  assert.match(manualAction, /MANUAL_PRODUCT_CREATE_LIMIT = 12/);
  assert.match(manualAction, /manual_product_create:\$\{artistId\}:\$\{user\.id\}/);
  assert.match(manualAction, /check_public_rate_limit/);
  assert.match(manualAction, /fallback: "deny"/);
  assert.match(manualAction, /Too many manual product creation attempts\. Try again later\./);
  assert.match(manualAction, /is_published: false/);
  assert.match(manualAction, /production_status: "generating"/);
  assert.match(manualAction, /moderation_status: "draft"/);
  assert.match(manualAction, /markManualProductCreationFailed/);
  assert.match(manualAction, /production_status: "failed"/);
  assert.match(manualAction, /manual product creation failed/);
  assert.match(manualAction, /failManualProductStep/);
  assert.match(manualAction, /manual product insert failed/);
  assert.match(manualAction, /throw new Error\("Manual product creation failed\."\)/);
  assert.match(manualAction, /Product creation failed\. Please try again\./);
  assert.match(manualAction, /product_generation_events/);
  assert.match(manualAction, /logManualProductPlatformEvent/);
  assert.match(manualAction, /recordPlatformEvent/);
  assert.match(manualAction, /scope: "product_generation"/);
  assert.match(manualAction, /manual_product_generation_failed/);
  assert.match(manualAction, /manual_product_published/);
  assert.match(manualAction, /manual_product_saved/);
  assert.match(manualAction, /manual product platform event insert failed/);
  assert.match(manualAction, /throwOnFailure: true/);
  assert.match(manualAction, /Could not audit manual product generation\./);
  assert.match(manualAction, /renderer: "manual-upload"/);
  assert.match(manualAction, /generationEventError/);
  assert.match(manualAction, /manual product color insert failed/);
  assert.match(manualAction, /\.from\("products"\)\s*[\s\S]*?\.update\(\{\s*[\s\S]*?is_published: publish/);
  assert.match(manualAction, /moderation_status: publish \? "pending_review" : "draft"/);
  assert.match(manualAction, /Awaiting operator review after artist manual product publish\./);
  assert.match(manualAction, /Manual product assets uploaded, published, and queued for moderation review\./);
  assert.match(manualAction, /Product creation failed\. The product was saved as unpublished for review\./);
  assert.doesNotMatch(manualAction, /throw new Error\(message\)/);
  assert.doesNotMatch(manualAction, /throw new Error\([A-Za-z0-9_]+\.message\)/);
  assert.doesNotMatch(manualAction, /logger\.warn\("manual product color insert failed"/);
});

test("Product edits validate readiness before publishing", () => {
  const editAction = read("src/app/dashboard/products/[id]/edit/actions.ts");
  const editPage = read("src/app/dashboard/products/[id]/edit/page.tsx");
  const productsPage = read("src/app/dashboard/products/page.tsx");
  const readinessIndex = editAction.indexOf("assertProductReadyToPublish(productId)");
  const productUpdateIndex = editAction.lastIndexOf('.from("products")');

  assert.match(editPage, /import \{ requireArtistPage \} from "@\/lib\/auth\/artist"/);
  assert.match(editPage, /const \{ supabase, artist \} = await requireArtistPage\(\)/);
  assert.match(editPage, /id, artist_id, title, description, price_cents, currency, is_published, slug, category/);
  assert.match(editPage, /id, artist_id, title, description, price_cents, currency, is_published, slug/);
  assert.match(editPage, /\.eq\("artist_id", artist\.id\)/);
  assert.doesNotMatch(editPage, /supabase\.auth\.getUser\(\)/);
  assert.match(editAction, /requireArtistAction/);
  assert.doesNotMatch(editAction, /supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(editAction, /artistError/);
  assert.doesNotMatch(editAction, /\.from\("artists"\)/);
  assert.match(editAction, /checkDurableRateLimit/);
  assert.match(editAction, /PRODUCT_EDIT_LIMIT = 30/);
  assert.match(editAction, /product_edit:\$\{artist\.id\}:\$\{productId\}/);
  assert.match(editAction, /check_public_rate_limit/);
  assert.match(editAction, /fallback: "deny"/);
  assert.match(editAction, /Too many product edit attempts\. Try again later\./);
  assert.match(editAction, /productError/);
  assert.match(editAction, /failProductUpdate/);
  assert.match(editAction, /logger\.error/);
  assert.match(editAction, /Could not update product\./);
  assert.match(editAction, /assertProductReadyToPublish/);
  assert.match(editAction, /id, artist_id, production_status/);
  assert.match(editAction, /Product generation must be completed before publishing\./);
  assert.match(editAction, /A primary product image is required before publishing\./);
  assert.match(editAction, /primaryImageError/);
  assert.match(editAction, /dashboard product publish design readiness lookup failed/);
  assert.match(editAction, /\.from\("product_designs"\)/);
  assert.match(editAction, /\.eq\("provider", "merch_tent"\)/);
  assert.match(editAction, /Designer products must have validated print assets before publishing\./);
  assert.match(editAction, /production_status: publish \? "published" : prod\.production_status/);
  assert.match(editAction, /moderation_status: publish \? "pending_review" : "draft"/);
  assert.match(editAction, /Awaiting operator review after artist product edit publish\./);
  assert.match(editAction, /Product edited, publish readiness verified, and queued for moderation review\./);
  assert.match(editAction, /if \(publish\) \{\s*await assertProductReadyToPublish\(productId\);/);
  assert.doesNotMatch(editAction, /throw new Error\([A-Za-z0-9_]+\.message\)/);
  assert.match(productsPage, /\.from\("products"\)/);
  assert.match(productsPage, /\.select\("id, production_status, moderation_status, readiness_notes"\)/);
  assert.match(productsPage, /Dashboard products page failed to load product lifecycle metadata/);
  assert.match(productsPage, /type ProductLifecycle/);
  assert.match(productsPage, /LifecyclePill/);
  assert.match(productsPage, /productionTone/);
  assert.match(productsPage, /moderationTone/);
  assert.match(productsPage, /lifecycle\?\.readiness_notes/);
  assert.match(productsPage, /lifecycleByProductId/);
  assert.match(productsPage, /production_status/);
  assert.match(productsPage, /moderation_status/);
  assert.ok(readinessIndex > -1, "missing readiness check");
  assert.ok(productUpdateIndex > -1, "missing product update");
  assert.ok(readinessIndex < productUpdateIndex, "readiness must be checked before product publish update");
});

test("Admin product moderation is explicit, audited, and revalidated", () => {
  const adminProductPage = read("src/app/admin/products/[id]/page.tsx");
  const adminProductsPage = read("src/app/admin/products/page.tsx");
  const moderationActions = read("src/app/admin/products/[id]/actions.ts");
  const moderationButtons = read("src/app/admin/products/[id]/ProductModerationActions.tsx");

  assert.match(adminProductPage, /ProductModerationActions/);
  assert.match(adminProductPage, /moderation_status/);
  assert.match(adminProductPage, /Moderation Notes/);
  assert.doesNotMatch(adminProductPage, /Toggle Featured/);
  assert.doesNotMatch(adminProductPage, /Toggle Published/);
  assert.match(adminProductsPage, /Pending Review/);
  assert.match(adminProductsPage, /moderation_status === "pending_review"/);
  assert.match(adminProductsPage, /moderation_status\)\.replaceAll\("_", " "\)\.toUpperCase\(\)/);

  assert.match(moderationActions, /requireAdminAction/);
  assert.match(moderationActions, /getServiceSupabase/);
  assert.match(moderationActions, /export async function moderateProduct/);
  assert.match(moderationActions, /type ModerationStatus = "approved" \| "blocked"/);
  assert.match(moderationActions, /is_published, production_status, moderation_status/);
  assert.match(moderationActions, /status === "approved"/);
  assert.match(moderationActions, /typedProduct\.is_published !== true/);
  assert.match(moderationActions, /typedProduct\.production_status !== "published"/);
  assert.match(moderationActions, /Only published, production-ready products can be approved\./);
  assert.match(moderationActions, /moderation_status: "approved"/);
  assert.match(moderationActions, /moderation_status: "blocked"/);
  assert.match(moderationActions, /is_published: false/);
  assert.match(moderationActions, /moderation_reviewed_at: reviewedAt/);
  assert.match(moderationActions, /moderation_reviewed_by: user\.id/);
  assert.match(moderationActions, /recordPlatformEvent/);
  assert.match(moderationActions, /scope: "product_moderation"/);
  assert.match(moderationActions, /product_moderation_approved/);
  assert.match(moderationActions, /product_moderation_blocked/);
  assert.match(moderationActions, /production_status: typedProduct\.production_status/);
  assert.match(moderationActions, /Admin product moderation update failed/);
  assert.match(moderationActions, /Could not update product moderation status\./);
  assert.match(moderationActions, /Could not audit product moderation update\./);
  assert.match(moderationActions, /revalidatePath\(`\/admin\/products\/\$\{typedProduct\.id\}`\)/);
  assert.match(moderationActions, /revalidatePath\("\/admin\/operations"\)/);
  assert.doesNotMatch(moderationActions, /throw new Error\([A-Za-z0-9_]+\.message\)/);

  assert.match(moderationButtons, /useTransition/);
  assert.match(moderationButtons, /useToast/);
  assert.match(moderationButtons, /moderateProduct\(productId, status, notes\)/);
  assert.match(moderationButtons, /Optional moderation note/);
  assert.match(moderationButtons, /Approve/);
  assert.match(moderationButtons, /Block/);
});

test("Designer saves include validation status and generation audit events", () => {
  const designerAction = read("src/app/dashboard/products/designer/actions.ts");
  const designerPage = read("src/app/dashboard/products/designer/page.tsx");
  const renderer = read("src/lib/products/server-print-renderer.ts");
  const repair = read("src/lib/products/generation-repair.ts");
  const uploads = read("src/lib/uploads.ts");
  const productContractMigration = read("supabase/migrations/202608230034_product_generation_contract_constraints.sql");

  assert.match(uploads, /BASE64_PATTERN/);
  assert.match(designerPage, /import \{ requireArtistPage \} from "@\/lib\/auth\/artist"/);
  assert.match(designerPage, /export default async function ProductDesignerPage/);
  assert.match(designerPage, /await requireArtistPage\(\)/);
  assert.match(uploads, /decodeStrictBase64ImagePayload/);
  assert.match(uploads, /Image data must be valid base64/);
  assert.match(designerAction, /designPayloadSchema/);
  assert.match(designerAction, /requireArtistAction/);
  assert.doesNotMatch(designerAction, /supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(designerAction, /\.from\("artists"\)/);
  assert.match(designerAction, /checkDurableRateLimit/);
  assert.match(designerAction, /DESIGNER_PRODUCT_CREATE_LIMIT = 8/);
  assert.match(designerAction, /designer_product_create:\$\{artist\.id\}:\$\{user\.id\}/);
  assert.match(designerAction, /check_public_rate_limit/);
  assert.match(designerAction, /fallback: "deny"/);
  assert.match(designerAction, /Too many designer product generation attempts\. Try again later\./);
  assert.match(designerAction, /renderServerPrintAsset/);
  assert.match(designerAction, /const hasBackDesign = design\.layers\.some\(\(layer\) => layer\.side === "back"\)/);
  assert.match(designerAction, /const canonicalBackPrintAsset = hasBackDesign/);
  assert.doesNotMatch(designerAction, /const backPrintAsset = readString\(formData, "back_print_asset"\)/);
  assert.match(designerAction, /is_published: false/);
  assert.match(designerAction, /production_status: "generating"/);
  assert.match(designerAction, /moderation_status: "draft"/);
  assert.match(designerAction, /markDesignedProductGenerationFailed/);
  assert.match(designerAction, /logDesignerGenerationPlatformEvent/);
  assert.match(designerAction, /recordPlatformEvent/);
  assert.match(designerAction, /scope: "product_generation"/);
  assert.match(designerAction, /supabase,/);
  assert.match(designerAction, /production_status: "failed"/);
  assert.match(designerAction, /status: "failed"/);
  assert.match(designerAction, /designed_product_generation_failed/);
  assert.match(designerAction, /designed_product_published/);
  assert.match(designerAction, /designed_product_saved/);
  assert.match(designerAction, /designed product platform event insert failed/);
  assert.match(designerAction, /throwOnFailure: true/);
  assert.match(designerAction, /Could not audit designer product generation\./);
  assert.match(designerAction, /Product generation failed\. The product was saved as unpublished for review\./);
  assert.match(designerAction, /designed product generation failed/);
  assert.match(designerAction, /failDesignerGeneration/);
  assert.match(designerAction, /designed product insert failed/);
  assert.match(designerAction, /designed product mockup upload failed/);
  assert.match(designerAction, /designed product print asset upload failed/);
  assert.match(designerAction, /designed product layer asset upload failed/);
  assert.match(designerAction, /designed product color insert failed/);
  assert.match(designerAction, /designed product design insert failed/);
  assert.match(designerAction, /designed product generation event insert failed/);
  assert.match(designerAction, /designed product publish status update failed/);
  assert.match(designerAction, /validation_status: "validated"/);
  assert.match(designerAction, /product_generation_events/);
  assert.match(designerAction, /generationEventError/);
  assert.match(designerAction, /\.from\("products"\)\s*[\s\S]*?\.update\(\{\s*[\s\S]*?is_published: publish/);
  assert.match(designerAction, /moderation_status: publish \? "pending_review" : "draft"/);
  assert.match(designerAction, /Awaiting operator review after artist self-service designer publish\./);
  assert.match(designerAction, /Designer V1 payload validated, published, and queued for moderation review\./);
  assert.match(designerAction, /design_hash/);
  assert.match(designerAction, /decodeStrictBase64ImagePayload/);
  assert.match(designerAction, /const buffer = decodeStrictBase64ImagePayload\(match\[2\]\)/);
  assert.match(designerAction, /validateImageBytes/);
  assert.match(designerAction, /validateImageBytes\(buffer, contentType\)/);
  assert.doesNotMatch(designerAction, /throw new Error\([A-Za-z0-9_]+Error\.message\)/);
  assert.doesNotMatch(designerAction, /if \(colorError\) throw new Error\(colorError\.message\)/);
  assert.match(renderer, /from "sharp"/);
  assert.match(renderer, /loadImageSource/);
  assert.match(renderer, /\.storage\s*[\s\S]*?\.from\("product-images"\)\s*[\s\S]*?\.download\(value\)/);
  assert.match(renderer, /server_canonical_render|renderServerPrintAsset/);
  assert.match(renderer, /decodeStrictBase64ImagePayload/);
  assert.match(renderer, /const buffer = decodeStrictBase64ImagePayload\(match\[2\]\)/);
  assert.match(renderer, /validateImageBytes/);
  assert.match(renderer, /MAX_LAYER_SOURCE_BYTES/);
  assert.match(renderer, /validateImageBytes\(buffer, contentType\)/);
  assert.match(renderer, /Stored image layer asset download failed/);
  assert.match(renderer, /Stored image layer asset size validation failed/);
  assert.match(renderer, /Stored image layer asset signature validation failed/);
  assert.match(renderer, /validateImageBytes\(buffer, data\.type \|\| ""\)/);
  assert.doesNotMatch(renderer, /error\?\.message \?\? "Stored image layer asset could not be loaded\."/);
  assert.match(repair, /repairProductGenerationAssets/);
  assert.match(repair, /failProductGenerationRepair/);
  assert.match(repair, /Could not repair product generation assets\./);
  assert.match(repair, /Product generation repair design lookup failed/);
  assert.match(repair, /Product generation repair print asset upload failed/);
  assert.match(repair, /assertDesignerPayload\(typedDesign\.design_data\)/);
  assert.match(repair, /renderServerPrintAsset\(designPayload, "front"\)/);
  assert.match(repair, /product_generation_assets_repaired/);
  assert.match(repair, /product_generation_events/);
  assert.match(repair, /existingPrimaryImageError/);
  assert.match(repair, /generationEventError/);
  assert.match(repair, /Product generation repair event insert failed/);
  assert.match(repair, /recordPlatformEvent/);
  assert.match(repair, /scope: "product_generation"/);
  assert.match(repair, /Product generation repair platform event failed/);
  assert.match(repair, /Product assets repaired, but repair event recording failed\./);
  assert.match(repair, /storefront_mockup_reference/);
  assert.doesNotMatch(repair, /throw new Error\([A-Za-z0-9_]+\.message\)/);
  assert.doesNotMatch(repair, /throw new Error\(designError\?\.message/);
  assert.match(productContractMigration, /products_production_status_contract_check/);
  assert.match(productContractMigration, /'manual'/);
  assert.match(productContractMigration, /'generating'/);
  assert.match(productContractMigration, /'generated'/);
  assert.match(productContractMigration, /'published'/);
  assert.match(productContractMigration, /'failed'/);
  assert.match(productContractMigration, /products_published_status_contract_check/);
  assert.match(productContractMigration, /is_published = false/);
  assert.match(productContractMigration, /product_designs_validation_status_contract_check/);
  assert.match(productContractMigration, /'pending'/);
  assert.match(productContractMigration, /'validated'/);
  assert.match(productContractMigration, /product_designs_design_hash_contract_check/);
  assert.match(productContractMigration, /\^\[a-f0-9\]\{64\}\$/);
  assert.match(productContractMigration, /product_designs_print_asset_hash_contract_check/);
  assert.match(productContractMigration, /not valid/);
});

test("Printify fulfillment supports on-demand product sync from saved designs", () => {
  const productSync = read("src/lib/printify/product-sync.ts");
  const fulfillment = read("src/lib/printify/fulfillment.ts");
  const printifyClient = read("src/lib/printify/client.ts");
  const envServer = read("src/lib/env.server.ts");
  const envExample = read(".env.example");
  const dashboardAction = read("src/app/dashboard/products/printify-actions.ts");
  const adminFulfillmentActions = read("src/app/admin/fulfillment/actions.ts");
  const adminFulfillmentButtons = read("src/app/admin/fulfillment/FulfillmentJobActions.tsx");
  const checklist = read("PRODUCTION_RELEASE_CHECKLIST.md");

  assert.match(printifyClient, /PRINTIFY_REQUEST_TIMEOUT_MS = 30_000/);
  assert.match(printifyClient, /AbortSignal\.timeout\(PRINTIFY_REQUEST_TIMEOUT_MS\)/);
  assert.match(printifyClient, /logger\.error/);
  assert.match(printifyClient, /Printify request failed before response/);
  assert.match(printifyClient, /parsePrintifyResponse/);
  assert.match(printifyClient, /Printify request failed\./);
  assert.match(productSync, /export async function syncProductToPrintify/);
  assert.match(productSync, /logger\.error/);
  assert.match(productSync, /failPrintifySync/);
  assert.match(productSync, /Could not sync product to Printify\./);
  assert.match(productSync, /Printify sync product lookup failed/);
  assert.match(productSync, /Printify sync design lookup failed/);
  assert.match(productSync, /Printify variant mapping write failed/);
  assert.match(productSync, /Printify product sync failed/);
  assert.match(productSync, /writePrintifySyncEvent/);
  assert.match(productSync, /Printify sync event write failed/);
  assert.match(productSync, /syncingUpdateError/);
  assert.match(productSync, /PRINTIFY_PRODUCT_SYNC_IN_FLIGHT_MINUTES = 30/);
  assert.match(productSync, /isStalePrintifyProductSync/);
  assert.match(productSync, /syncClaimCutoff/);
  assert.match(productSync, /printify_status\.neq\.syncing,updated_at\.lt/);
  assert.match(productSync, /duplicate product creation skipped/);
  assert.match(productSync, /Product is already syncing to Printify\./);
  assert.match(productSync, /Printify sync claim failed/);
  assert.match(productSync, /typedDesign\.printify_product_id && typedDesign\.printify_status === "synced"/);
  assert.match(productSync, /Printify product sync has an incomplete local mapping/);
  assert.match(productSync, /Printify product was created, but local sync state is incomplete\./);
  assert.match(productSync, /let createdPrintifyProductId: string \| null = null/);
  assert.match(productSync, /createdPrintifyProductId = printifyProduct\.id/);
  assert.match(productSync, /const \{ data: createdUpdate, error: createdUpdateError \}/);
  assert.match(productSync, /\.select\("id"\)\s*[\s\S]*?\.maybeSingle\(\)/);
  assert.match(productSync, /createdUpdateError \|\| !createdUpdate/);
  assert.match(productSync, /Printify product created, but external id persistence failed/);
  assert.match(productSync, /failedPatch\.printify_product_id = createdPrintifyProductId/);
  assert.match(productSync, /syncedUpdateError/);
  assert.match(productSync, /failedUpdateError/);
  assert.doesNotMatch(productSync, /throw productError/);
  assert.doesNotMatch(productSync, /throw designError/);
  assert.doesNotMatch(productSync, /throw error;/);
  assert.doesNotMatch(productSync, /variant mapping failed: \$\{variantsError\.message\}/);
  assert.match(productSync, /printifyDefaultBlueprintId/);
  assert.match(productSync, /printifyDefaultPrintProviderId/);
  assert.match(productSync, /printifyDefaultVariantIds/);
  assert.match(envServer, /PRINTIFY_DEFAULT_TEE_BLUEPRINT_ID/);
  assert.match(envServer, /PRINTIFY_DEFAULT_TEE_PRINT_PROVIDER_ID/);
  assert.match(envServer, /PRINTIFY_DEFAULT_TEE_VARIANT_IDS/);
  assert.match(envExample, /PRINTIFY_DEFAULT_BLUEPRINT_ID=/);
  assert.match(envExample, /PRINTIFY_DEFAULT_PRINT_PROVIDER_ID=/);
  assert.match(envExample, /PRINTIFY_DEFAULT_VARIANT_IDS=/);
  assert.match(productSync, /printify_sync_events/);
  assert.match(dashboardAction, /syncProductToPrintify/);
  assert.match(dashboardAction, /requireArtistAction/);
  assert.match(dashboardAction, /logger\.error/);
  assert.match(dashboardAction, /artist Printify sync failed/);
  assert.match(dashboardAction, /Could not sync product to Printify\./);
  assert.doesNotMatch(dashboardAction, /supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(dashboardAction, /throw artistError/);
  assert.doesNotMatch(dashboardAction, /createPrintifyProduct/);
  assert.match(fulfillment, /syncProductToPrintify/);
  assert.match(fulfillment, /submitPrintifyOrder/);
  assert.match(fulfillment, /failPrintifyFulfillment/);
  assert.match(fulfillment, /failClaimedPrintifyFulfillment/);
  assert.match(fulfillment, /await recordFailedSync\(publicMessage\)/);
  assert.match(fulfillment, /Printify fulfillment product sync failed/);
  assert.match(fulfillment, /Could not sync Printify product for fulfillment\./);
  assert.match(fulfillment, /Could not prepare Printify fulfillment\./);
  assert.match(fulfillment, /Printify fulfillment existing sync lookup failed/);
  assert.match(fulfillment, /Printify fulfillment order items lookup failed/);
  assert.match(fulfillment, /Printify fulfillment product designs lookup failed/);
  assert.match(fulfillment, /Printify fulfillment variant mapping lookup failed/);
  assert.match(fulfillment, /Could not submit Printify order\./);
  assert.match(fulfillment, /upsertPrintifyOrderSync/);
  assert.match(fulfillment, /Printify order sync write failed/);
  assert.match(fulfillment, /existingSyncError/);
  assert.match(fulfillment, /PRINTIFY_ORDER_SYNC_IN_FLIGHT_MINUTES = 30/);
  assert.match(fulfillment, /isStalePrintifyOrderSync/);
  assert.match(fulfillment, /existingSync\?\.status === "started"/);
  assert.match(fulfillment, /duplicate submission skipped/);
  assert.match(fulfillment, /claimPrintifyOrderSync/);
  assert.match(fulfillment, /POSTGRES_UNIQUE_VIOLATION = "23505"/);
  assert.match(fulfillment, /Printify order sync claim lost to concurrent worker/);
  assert.match(fulfillment, /Printify order sync claim skipped after concurrent state change/);
  assert.match(fulfillment, /Could not claim Printify order sync\./);
  assert.match(fulfillment, /const claimed = await claimPrintifyOrderSync/);
  assert.match(fulfillment, /if \(!claimed\) return/);
  assert.match(fulfillment, /\.neq\("status", "succeeded"\)/);
  assert.match(fulfillment, /status\.neq\.started,attempted_at\.lt/);
  assert.match(fulfillment, /designsError/);
  assert.match(fulfillment, /syncedDesignsError/);
  assert.match(fulfillment, /variantsError/);
  assert.match(fulfillment, /printify_order_syncs/);
  assert.match(fulfillment, /fulfillment_on_demand/);
  assert.doesNotMatch(fulfillment, /Order has no synced Printify products[\s\S]*return;/);
  assert.doesNotMatch(fulfillment, /throw existingSyncError/);
  assert.doesNotMatch(fulfillment, /throw orderError/);
  assert.doesNotMatch(fulfillment, /throw itemsError/);
  assert.doesNotMatch(fulfillment, /throw designsError/);
  assert.doesNotMatch(fulfillment, /throw syncedDesignsError/);
  assert.doesNotMatch(fulfillment, /throw variantsError/);
  assert.doesNotMatch(fulfillment, /throw error;/);
  assert.match(adminFulfillmentActions, /submitFulfillmentJobToPrintify/);
  assert.match(adminFulfillmentActions, /attemptPrintifyFulfillmentForOrder/);
  assert.match(adminFulfillmentActions, /ALLOWED_STATUSES = new Set\(\["pending", "in_progress", "completed", "failed", "cancelled"\]\)/);
  assert.match(adminFulfillmentActions, /export async function updateFulfillmentJobStatus/);
  assert.match(adminFulfillmentActions, /currentJobError/);
  assert.match(adminFulfillmentActions, /Admin fulfillment status lookup failed/);
  assert.match(adminFulfillmentActions, /Could not load fulfillment job\./);
  assert.match(adminFulfillmentActions, /Fulfillment job not found\./);
  assert.match(adminFulfillmentActions, /Fulfillment job is already closed\./);
  assert.match(adminFulfillmentActions, /patch\.started_at = null/);
  assert.match(adminFulfillmentActions, /patch\.completed_at = null/);
  assert.match(adminFulfillmentActions, /patch\.failed_at = null/);
  assert.match(adminFulfillmentActions, /patch\.cancelled_at = null/);
  assert.match(adminFulfillmentActions, /\.select\("id"\)/);
  assert.match(adminFulfillmentActions, /No fulfillment job was updated/);
  assert.match(adminFulfillmentActions, /fromStatus: currentJob\.status/);
  assert.match(adminFulfillmentActions, /orderId: currentJob\.order_id/);
  assert.match(adminFulfillmentActions, /status: "completed"/);
  assert.match(adminFulfillmentActions, /completed_at: completedAt/);
  assert.match(adminFulfillmentActions, /status: "failed"/);
  assert.match(adminFulfillmentActions, /failed_at: failedAt/);
  assert.match(adminFulfillmentActions, /admin_printify_order_submitted/);
  assert.match(adminFulfillmentActions, /admin_printify_order_failed/);
  assert.match(adminFulfillmentButtons, /status !== "completed" && status !== "cancelled"/);
  assert.match(adminFulfillmentButtons, /Submit Printify/);
  assert.match(adminFulfillmentButtons, /submitFulfillmentJobToPrintify/);
  assert.match(adminFulfillmentButtons, /failed/);
  assert.match(adminFulfillmentButtons, /Submit Printify/);
  assert.match(checklist, /Printify default blueprint id/);
});
