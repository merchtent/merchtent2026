# Operational drills

Run both drills before launch and at least every 90 days. Do not create a passed
evidence record until the validations were performed against a non-production
environment and the linked evidence can be reviewed.

## Backup restore

1. Record the current production migration version and a timestamped row-count
   snapshot for products, orders and artists. Do not export customer fields into
   the repository.
2. Restore the latest Supabase backup into an isolated recovery project.
3. Apply any migrations newer than the restored backup.
4. point a temporary Vercel preview at the recovery project using test Stripe,
   test email and non-submitting supplier credentials.
5. Run `npm run db:lint:linked`, `npm run release:check` and
   `SMOKE_BASE_URL=<recovery-url> npm run smoke:prod`.
6. Confirm authentication, catalogue reads and an end-to-end test checkout.
7. Record actual RTO and observed RPO in a new evidence JSON file.

## Supplier outage

1. Use isolated UAT credentials and disable or invalidate its supplier token.
2. Complete a Stripe test checkout for a supplier-on-demand product.
3. Confirm the paid order is retained, fulfillment is marked failed or pending,
   the customer is not charged twice, and the operational exception is visible.
4. Restore the supplier credential and retry from the admin workflow.
5. Confirm exactly one supplier order is created and notifications remain
   idempotent.
6. Record timings, screenshots or logs, and any follow-up owner in a new evidence
   JSON file.

Duplicate `evidence/drill.example.json` for each completed drill, use a unique
filename, and run `npm run ops:drills:check`. Evidence URLs should point to a
restricted ticket or document rather than customer data.
