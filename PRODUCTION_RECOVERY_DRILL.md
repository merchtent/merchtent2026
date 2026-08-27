# Merch Tent Production Recovery Drill

Last updated: 2026-08-23

Use this document before launch and after material database, storage, fulfillment, or payment workflow changes. The goal is to prove that Merch Tent can recover without guessing during a production incident.

## Required Evidence

Record each drill in the release notes or incident log with:

- Drill date and operator.
- Deployment environment and git commit.
- Supabase project ref.
- Backup timestamp used for restore.
- Latest local migration id.
- Latest remote migration id from `npx supabase migration list`.
- Target RTO and actual recovery time.
- Target RPO and observed data-loss window.
- Links or pasted output for health checks, smoke tests, and migration alignment.
- Any failed step, manual repair, or follow-up ticket.

## Backup Scope

Validate that the recovery plan covers:

- Supabase Postgres data.
- Supabase storage buckets used for product mockups, canonical print assets, artist uploads, and product images.
- Production environment variables and secrets outside source control.
- Stripe dashboard state for checkout sessions, charges, disputes, refunds, Connect accounts, and transfers.
- Printify order state for orders that have already been pushed for fulfillment.
- Postmark and SMS provider delivery evidence.

Observation: Stripe, Printify, Postmark, and SMS state cannot be restored from the Merch Tent database. Treat those providers as external source-of-truth systems during reconciliation.

## Pre-Drill Safety

- Run the drill against staging or a temporary Supabase project, never directly over live production.
- Confirm the restore target is not connected to the public production application.
- Disable live webhook forwarding to the restore target unless the test explicitly requires replay.
- Capture the current migration list before restore.
- Confirm a named owner has authority to approve any production rollback or data repair.

## Restore Drill Procedure

1. Create or select a non-production Supabase restore target.
2. Restore the chosen database backup into that target using the hosting provider's approved restore process.
3. Restore or mirror the required storage buckets for product mockups, product images, artist uploads, and canonical print assets.
4. Configure staging environment variables to point at the restored Supabase target and non-live provider credentials.
5. Run `npm run env:check:prod` with production-shaped staging values.
6. Run `npx supabase migration list` and confirm local and remote migrations are aligned.
7. Run `npm run verify`.
8. Run `npm run build`.
9. Run `SMOKE_BASE_URL=<staging-url> OPERATIONAL_HEALTH_SECRET=<secret> npm run smoke:prod`.
10. Open `/admin/operations` and confirm order, webhook, notification, fulfillment, payout, product generation, merch credit, and dashboard query exceptions are understood.
11. Sample restored records for at least one paid order, one artist product, one product design, one product image, one fulfillment job, one merch credit ledger entry, and one platform event.
12. Record the drill evidence and unresolved follow-up items.

## Rollback Decision Path

Use application rollback when:

- The new deployment causes runtime failures but the database schema remains backward compatible.
- Health checks or smoke tests fail after deploy and no irreversible data writes have occurred.

Use migration recovery when:

- A migration introduced a schema, policy, index, or function problem that cannot be fixed by application rollback alone.
- `npx supabase migration list` differs between the expected release and the linked project.

Use data repair when:

- Stripe confirms payment but local order, item, credit, notification, or fulfillment records are incomplete.
- Printify has accepted an order but local fulfillment state is missing or stale.
- Merch credit balances and ledger entries diverge.
- Artist transfers or cash outs diverge from Stripe Connect transfer state.

## Migration Recovery Rules

- Prefer a forward fix migration over destructive manual edits.
- Do not drop columns, tables, policies, or functions in production without an approved rollback record and verified backup.
- Before applying a repair migration, capture affected row counts and the current migration list.
- After applying a repair migration, rerun `npm run verify`, `npm run build`, `npm run env:check:prod`, `npx supabase migration list`, and the production smoke test against the target environment.
- Record any manual SQL run outside migrations as incident evidence.

## Recovery Validation Queries

At minimum, validate these operational surfaces after restore or recovery:

- `/api/health` returns HTTP 200.
- `/api/health/operations` returns HTTP 200 with the operational secret or identifies known exceptions.
- `orders_operational_exceptions` has no unexplained paid-order failures.
- `product_generation_operational_exceptions` has no unexplained published product failures.
- `payout_operational_exceptions` has no unexplained money-movement failures.
- `stripe_financial_events` has no open or investigating records that lack an owner.
- Recent `platform_events` contain no unresolved critical, error, or repeated warning events.

## Drill Pass Criteria

A drill passes only when:

- Database and storage restore completed into a safe non-production target.
- Migration state is aligned or the difference is documented.
- Environment validation, verify, build, and smoke tests pass.
- External provider reconciliation gaps are documented.
- RTO and RPO are measured.
- Follow-up actions have named owners.

If any pass criteria fails, the release is not operationally ready.
