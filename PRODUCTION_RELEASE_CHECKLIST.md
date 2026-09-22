# Merch Tent Production Release Checklist

Use this checklist before promoting a release.

## Automated Gates

- [ ] `npm run release:check`
- [ ] `npm run verify`
- [ ] `npm run build`
- [ ] `npm run audit:prod`
- [ ] `npm run env:check:prod`
- [ ] The `production-environment` GitHub Actions job passes on `main` using the actual deployment secret set. CI fixture values and local `.env.local` validation are not production certification.
- [ ] `npm run db:lint:linked`
- [ ] `SMOKE_BASE_URL=https://your-production-domain npm run smoke:prod` validates public pages, catalog APIs, health, sitemap, and baseline security headers.
- [ ] `npx supabase migration list` shows local and remote migrations aligned.
- [ ] `npm run ops:drills:check` confirms current passed evidence for backup/restore and supplier-outage drills.

## Runtime Configuration

- [ ] `/api/health` returns HTTP 200.
- [ ] Supabase URL, anon key, and service role key are configured.
- [ ] All production URL environment variables use HTTPS.
- [ ] `NEXT_PUBLIC_SITE_URL` points to the public production hostname, not localhost or a private network address.
- [ ] `OPERATIONAL_HEALTH_SECRET` is configured with a high-entropy value of at least 32 characters.
- [ ] Stripe secret key and webhook secret are configured.
- [ ] Postmark sender, token, support email, and admin recipient are configured. `POSTMARK_FROM` and `POSTMARK_SUPPORT_EMAIL` are `support@merchtent.com.au`.
- [ ] Supabase Auth SMTP is configured through Postmark from `support@merchtent.com.au` using `npm run auth:smtp:postmark`, so signup confirmation, password reset, and email-change confirmation do not use Supabase's built-in email sender.
- [ ] SMS provider credentials are configured.
- [ ] Printify token and shop id are configured.
- [ ] Printify default blueprint id, print provider id, and variant ids are configured for on-demand fulfillment.

## Operational Dashboards

- [ ] `/admin/operations` has zero order exceptions.
- [ ] `/admin/operations` has zero fulfillment SLA exceptions.
- [ ] `/admin/operations` has zero payout exceptions.
- [ ] `/admin/operations` has zero unresolved Stripe financial review events.
- [ ] `/admin/operations` has zero product generation exceptions.
- [ ] `/admin/operations` has zero dashboard query errors.
- [ ] Stripe financial review CSV export downloads from `/api/admin/stripe-financial-events/export`.
- [ ] Sensitive CSV exports create `admin_export` platform events before files are returned.
- [ ] Secret-protected `/api/health/operations` returns HTTP 200 in the target environment.
- [ ] Secret-protected `POST /api/operations/maintenance` is scheduled every 5-15 minutes and its last run returned HTTP 200, including stale credit, webhook, notification, Printify product sync, Printify order sync, and product generation cleanup tasks.
- [ ] Recent platform events contain no unresolved `critical`, `error`, or repeated `warning` events.

## Live Rehearsals

- [ ] Complete a Stripe checkout test and confirm the order, items, credits, webhook ledger, notifications, and fulfillment job are created.
- [ ] Complete a self-service product designer save and confirm storefront mockups, canonical print assets, hashes, and generation events are present.
- [ ] Complete a fulfillment status update and confirm order/fulfillment audit events are written.
- [ ] Complete a Stripe Connect onboarding refresh for an artist account.
- [ ] Complete a Stripe Connect payout rehearsal and confirm transfer ledger and platform events are correct.
- [ ] Trigger or replay a Stripe refund/dispute/payment-failure test event and confirm `stripe_financial_events`, `/admin/operations`, and `/api/health/operations` require review until resolved.

## Recovery & Monitoring

- [ ] Production log drain or alerting sink is configured.
- [ ] `/api/health` is monitored every 1-5 minutes.
- [ ] `/api/health/operations` is monitored with `OPERATIONAL_HEALTH_SECRET` every 5-15 minutes.
- [ ] `POST /api/operations/maintenance` is monitored with `OPERATIONAL_HEALTH_SECRET` every 5-15 minutes.
- [ ] Alerts exist for Stripe webhook 5xxs, checkout 5xxs, and health-check degradation.
- [ ] Sentry DSNs, org, project, release auth token, and environment are configured; a controlled test exception appears with the release and environment tags.
- [ ] Sentry issue alerts notify the named on-call destination immediately for new fatal/error issues and repeated checkout, webhook, fulfilment, or payout failures.
- [ ] Backup restore drill has been completed using `PRODUCTION_RECOVERY_DRILL.md`.
- [ ] Supplier outage drill has been completed using `PRODUCTION_RECOVERY_DRILL.md`, including queued-order reconciliation and recovery evidence.
- [ ] Rollback process and migration recovery path are documented for the deployment target using `PRODUCTION_RECOVERY_DRILL.md`.
- [ ] Recovery drill evidence records RTO, RPO, backup timestamp, migration alignment, health output, smoke output, and follow-up owners.
- [ ] Drill evidence is saved as JSON under `operations/drills/evidence` and passes `npm run ops:drills:check`.
