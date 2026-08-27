# Merch Tent Production Operations Runbook

Last updated: 2026-08-23

## Health Checks

- `GET /api/health` verifies required runtime configuration and Supabase database reachability.
- Health includes Supabase, Stripe, Postmark, SMS, and Printify configuration checks.
- Expected healthy response: HTTP 200 with `"ok": true`.
- Expected degraded response: HTTP 503 with one or more failed checks.
- `GET /api/health/operations` requires `Authorization: Bearer <OPERATIONAL_HEALTH_SECRET>` or `x-merch-tent-ops-secret`.
- Operational health returns HTTP 503 when order, webhook, notification, fulfillment, payout, product generation, or merch credit exceptions need attention.
- `POST /api/operations/maintenance` requires the same operational secret and runs bounded housekeeping for stale merch credit reservations, stale Stripe webhook processing rows, stale pending notification deliveries, stale Printify product sync attempts, stale Printify order sync attempts, and stale product generations.

Recommended monitors:

- Ping `/api/health` every 1-5 minutes.
- Ping `/api/health/operations` every 5-15 minutes with the operational health secret.
- Run `POST /api/operations/maintenance` every 5-15 minutes with the operational health secret.
- Alert immediately on two consecutive HTTP 503 responses.
- Alert immediately on any `/api/health/operations` HTTP 503 response.
- Alert on any 5xx spike from `/api/stripe/webhook`, `/checkout`, `/api/stripe/connect/*`, or `/api/track/page-view`.

## Daily Operator Checklist

1. Open `/admin/operations`.
2. Confirm `Order exceptions` is zero.
3. Confirm `Webhook issues` is zero.
4. Confirm `Notification issues` is zero.
5. Confirm `Fulfillment SLA` is zero.
6. Confirm `Payout issues` is zero.
7. Confirm `Product generation` is zero.
8. Confirm `Dashboard query errors` is zero.
9. Confirm scheduled maintenance is clearing stale pending notification deliveries, stale Printify product sync attempts, stale Printify order sync attempts, and stale product generations or surfacing failures.
10. Review recent `critical`, `error`, and `warning` platform events.
11. Open `/admin/fulfillment` and check for stale `pending` or `in_progress` jobs.
12. Review `/dashboard/cash-outs` transfer failures if artists have requested payouts.
13. Confirm any sensitive CSV export creates an `admin_export` platform event before the file is returned.

## Order Exception Handling

Source of truth:

- `orders_operational_exceptions`
- `stripe_webhook_events`
- `order_status_events`
- `fulfillment_jobs`
- `fulfillment_job_events`
- `notification_deliveries`

If a paid order appears in `orders_operational_exceptions`:

1. Open the order from `/admin/operations`.
2. Check whether order items are missing or fulfillment is missing.
3. Check related `stripe_webhook_events` for `failed` or stuck `processing` events.
4. If Stripe confirms payment but local records are incomplete, replay the Stripe webhook from the Stripe dashboard after fixing the underlying error.
5. Do not manually mark the webhook processed unless order, items, credits, and fulfillment are all present.

## Stripe Webhook Expectations

`checkout.session.completed` must result in:

- One `orders` row with a unique `stripe_session_id`.
- One or more `order_items` rows with Stripe line item IDs.
- A stable `order_number`.
- A `fulfillment_jobs` row for the order.
- A merch credit ledger entry for signed-in fan orders.
- A `stripe_webhook_events` row marked `processed`.
- Notification delivery rows for email/SMS attempts.

Failure policy:

- Critical order processing failures should return HTTP 500 to Stripe so the event can be retried.
- Email/SMS failures should not block order processing, but must create notification delivery failures and platform warning events.

Financial attention webhooks:

- `charge.refunded`, `charge.dispute.*`, and `payment_intent.payment_failed` are recorded in `stripe_financial_events` and as platform events instead of being silently ignored.
- Disputes are `critical`; refunds and payment failures are `error`.
- If these appear in `/admin/operations` financial review, review Stripe, the linked order, fulfillment state, customer communication, and any artist payout exposure.
- Mark the event `investigating` when ownership is assigned, then `resolved` only after the Stripe record, local order, fulfillment state, customer communication, merch credits, and artist payout exposure have been reconciled.
- Use `/api/admin/stripe-financial-events/export` for refund, dispute, payment-failure, and month-end financial review evidence.

## Product Generation Expectations

Designer saves must result in:

- A `products` row.
- Storefront mockups in `product-images`.
- Server-rendered canonical print assets.
- A `product_designs` row with `validation_status = validated`.
- `design_hash` and print asset hashes.
- A `product_generation_events` row.

If product generation fails:

1. Confirm the artist owns the product.
2. Check layer validation errors.
3. Check product image storage uploads.
4. Check `product_generation_events`.
5. Keep the product unpublished until canonical print assets exist.

Published product exceptions:

- `product_generation_operational_exceptions` must be empty before release.
- A published product should have a Merch Tent design, `validation_status = validated`, a storefront mockup, a canonical front print asset, and moderation state that is not blocked.
- Published self-service products in `pending_review` should be reviewed before broad promotion.
- If a product appears in this view, review moderation state, unpublish it, or regenerate the design assets before promoting the release.

## Fulfillment Workflow

Expected statuses:

- `pending`
- `in_progress`
- `completed`
- `cancelled`

Rules:

- A paid physical order should not be considered operationally ready without a fulfillment job.
- Every fulfillment status change should create a `fulfillment_job_events` row.
- Shipping status changes should create an `order_status_events` row.

## Credits Reconciliation

Credits are customer-facing value. Reconcile regularly:

- Ledger total by user should match `merch_credit_balances.points_balance + redeemed_points`.
- One `order_earned` ledger entry should exist per eligible signed-in order.
- Redemptions must be implemented as ledger debits before public redemption is enabled.
- Public redemption must call `redeem_merch_credits` with an idempotency key. Never mutate `merch_credit_balances` directly from application code.
- Use `/api/admin/merch-credits/export` for periodic liability snapshots covering current balances, active reserved points, available redemption units, and reconciliation exceptions.

## Payout Exception Handling

Source of truth:

- `artist_transfers`
- `cash_outs`
- `payout_operational_exceptions`
- `platform_events` with `scope = payouts`

If a payout appears in `payout_operational_exceptions`:

1. Check whether the cash out is missing a transfer, linked to a `failed` transfer, stale `processing`, stale `pending`, or has a cash-out/transfer state mismatch.
2. Review `failure_code`, `failure_message`, and the Stripe transfer id when present.
3. Confirm the artist has `payouts_enabled` and `details_submitted` in Stripe Connect.
4. Retry from the artist payout screen only after the underlying Stripe account issue is resolved.
5. Do not manually mark a cash out paid unless the Stripe transfer has succeeded and the transfer ledger is reconciled.

## Incident Severity

- Critical: paid order missing items, missing fulfillment job, Stripe webhook repeatedly failing, payout transfer failure involving real funds.
- High: product published without validated canonical print assets, repeated notification failures, admin unable to process fulfillment.
- Medium: analytics failure, stale fulfillment job, non-critical product image issue.
- Low: public content or presentation issue with no order/payment impact.

## Release Gates

Before deploying:

- `npm run verify`
- `npm run build`
- `npm audit --omit=dev`
- `npm run env:check:prod`
- `npx supabase migration list`
- `npm run db:lint:linked` when logged into the linked Supabase project
- `OPERATIONAL_HEALTH_SECRET=<secret> SMOKE_BASE_URL=<production-url> npm run smoke:prod`
- Confirm pending migrations have been applied with `npx supabase db push`.
- Complete the backup, restore, rollback, and migration recovery checks in `PRODUCTION_RECOVERY_DRILL.md` for launch and after material database, storage, fulfillment, or payment workflow changes.

Local note:

- `npx supabase db lint` without `--linked` requires Docker/local Supabase to be running.
