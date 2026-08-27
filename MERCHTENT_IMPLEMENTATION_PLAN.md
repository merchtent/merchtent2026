# MerchTent Implementation Plan

Planning date: 2026-08-19  
Scope: practical roadmap to move MerchTent from controlled beta to self-service artist marketplace.  
Constraint: this document is planning only. No implementation changes were made.

## Phase 1: Production Stability

Goal: make the current app safe enough for controlled beta traffic while reducing avoidable release risk.

### 1. Resolve production dependency vulnerabilities

Business justification: Ecommerce trust depends on known vulnerabilities being addressed before launch.  
Technical justification: `npm audit --omit=dev` reports 9 production vulnerabilities, including high severity advisories affecting `next`, `axios`, `form-data`, `nanoid`, `postcss`, `sharp`, and `ws`.  
Estimated effort: S  
Risk if not addressed: Public launch carries avoidable security and compliance risk.  
Likely files affected: `package.json`, `package-lock.json`.  
Dependencies: Verify compatible Next/React/Supabase/Stripe versions.  
Acceptance criteria: `npm audit --omit=dev` has no high or critical production vulnerabilities, typecheck/lint/build pass.

### 2. Add environment validation and `.env.example`

Business justification: Reduces deployment mistakes and makes onboarding new developers/operators faster.  
Technical justification: `README.md` lists env vars, but no `.env.example` was observed and runtime code accesses required env vars directly.  
Estimated effort: S  
Risk if not addressed: Missing or wrong secrets cause runtime failures in checkout, Supabase, webhooks, Postmark, and SMS.  
Likely files affected: `.env.example`, `src/lib/env.ts`, `src/app/*`, `src/lib/*`.  
Dependencies: Decide required vs optional services for beta.  
Acceptance criteria: App fails fast with clear messages for missing required env vars; example env documents all keys without secrets.

### 3. Reduce release-critical lint warnings

Business justification: Noisy builds hide real problems and lower engineering confidence.  
Technical justification: ESLint currently reports 157 warnings, including `any`, unused variables, raw `<img>`, missing `alt`, and navigation issues.  
Estimated effort: M  
Risk if not addressed: Important warnings are ignored, accessibility/performance bugs persist, and future CI hardening becomes harder.  
Likely files affected: `src/app/api/stripe/webhook/route.ts`, `src/app/checkout/*`, `src/app/dashboard/*`, `src/app/admin/*`, public product/artist pages.  
Dependencies: Supabase type generation recommended.  
Acceptance criteria: Warnings in checkout, webhook, auth, dashboard, admin, and public product pages are eliminated or intentionally documented.

### 4. Add basic smoke tests

Business justification: Prevents breakage in core revenue flows.  
Technical justification: CI has typecheck/lint/build only; no test suite was found.  
Estimated effort: M  
Risk if not addressed: Sign-up, product creation, checkout, and webhook regressions may reach production unnoticed.  
Likely files affected: `package.json`, `tests/e2e/*`, CI workflow.  
Dependencies: Test credentials, test Supabase project or local Supabase, Stripe test mode.  
Acceptance criteria: CI runs at least homepage, signup/auth redirect, product page, cart/checkout form, dashboard access, and admin auth smoke tests.

### 5. Add webhook event ledger

Business justification: Orders are revenue events; they must be auditable and recoverable.  
Technical justification: `src/app/api/stripe/webhook/route.ts` catches many failures and still returns 200, which can suppress Stripe retries.  
Estimated effort: M  
Risk if not addressed: Paid orders, emails, SMS, fulfilment tasks, or payouts may be missed silently.  
Likely files affected: `supabase/migrations/*`, `src/app/api/stripe/webhook/route.ts`, `src/lib/payments/*`.  
Dependencies: Order processing state model.  
Acceptance criteria: Every Stripe event is persisted with event ID, type, received time, processing status, attempts, and error; duplicate events are idempotent.

### 6. Replace in-memory rate limiting for public write endpoints

Business justification: Protects signup/newsletter/tracking/contact-style endpoints from abuse.  
Technical justification: `src/lib/rate-limit.ts` uses a process-local `Map`, which is not reliable across serverless instances.  
Estimated effort: S/M  
Risk if not addressed: Rate limits reset per instance and can be bypassed under real traffic.  
Likely files affected: `src/lib/rate-limit.ts`, `src/app/api/subscribe/route.ts`, `src/app/api/track/page-view/route.ts`.  
Dependencies: Choose Redis, Supabase counter table, or hosting-provider rate limit.  
Acceptance criteria: Public write endpoints enforce durable per-IP or per-identity limits across instances.

### 7. Clarify beta launch mode in product copy

Business justification: Artists need to understand whether they are applying, joining a beta, or fully self-serving.  
Technical justification: Signup and dashboard paths exist, but `src/app/auth/sign-up/page.tsx` still contains early-access style messaging.  
Estimated effort: S  
Risk if not addressed: Confused onboarding, support burden, and mismatched expectations.  
Likely files affected: `src/app/auth/sign-up/page.tsx`, `src/app/start/page.tsx`, dashboard copy.  
Dependencies: Decide launch mode.  
Acceptance criteria: Signup copy consistently reflects controlled beta or public self-service.

## Phase 2: Security & Reliability

Goal: add marketplace-grade money movement, authorization confidence, event reliability, and operational observability.

### 8. Implement Stripe Connect account onboarding

Business justification: Artist payouts are core to the marketplace promise.  
Technical justification: No Connect account, account link, onboarding status, or Connect webhook code exists today. Stripe hosted onboarding reduces KYC/bank-data handling.  
Estimated effort: M/L  
Risk if not addressed: Artists cannot self-serve payouts; platform remains manual and trust-limited.  
Likely files affected: `supabase/migrations/*`, `src/app/dashboard/*`, `src/app/api/stripe/*`, `src/lib/payments/*`.  
Dependencies: Stripe Connect platform setup, country/currency policy, terms updates.  
Acceptance criteria: Artist can create/connect a Stripe account, complete hosted onboarding, and dashboard shows accurate `charges_enabled`, `payouts_enabled`, and `details_submitted` status.

### 9. Add artist earnings and transfer ledger

Business justification: Accurate earnings, payout timing, refunds, and disputes require item-level accounting.  
Technical justification: Current cash-out RPC creates internal pending rows but no external money movement or Stripe transfer IDs.  
Estimated effort: L  
Risk if not addressed: Payouts cannot be reconciled and refund/dispute handling becomes manual and error-prone.  
Likely files affected: `supabase/migrations/*`, `src/app/dashboard/cash-out/*`, `src/app/dashboard/cash-outs/*`, `src/lib/payments/*`.  
Dependencies: Connect account onboarding and order item earnings calculation.  
Acceptance criteria: Each order item has an earning calculation; transfers store Stripe IDs, status, idempotency key, amount, currency, and reversal/refund linkage.

### 10. Choose and implement Stripe charge architecture

Business justification: The platform must know whether it supports multi-artist carts and how money is split.  
Technical justification: Current checkout supports arbitrary cart contents. Stripe separate charges and transfers align with multi-party marketplaces; destination charges fit simpler single-connected-account checkouts.  
Estimated effort: M  
Risk if not addressed: Payment architecture may need rework after launch, especially for multi-artist orders.  
Likely files affected: `src/app/checkout/actions.ts`, `src/app/api/stripe/webhook/route.ts`, payment domain modules.  
Dependencies: Product/cart policy and Connect onboarding.  
Acceptance criteria: Documented decision exists; checkout metadata, order ledger, and transfer logic match that decision.

### 11. Add refund, dispute, and transfer reversal workflows

Business justification: Refunds and disputes directly affect cash, support, and artist trust.  
Technical justification: No refund/dispute webhook handling or transfer reversal model was found. Stripe documents that platforms can be debited for disputes under marketplace charge models.  
Estimated effort: M/L  
Risk if not addressed: Manual finance reconciliation and possible payout losses.  
Likely files affected: `src/app/api/stripe/webhook/route.ts`, `supabase/migrations/*`, admin order pages, payment modules.  
Dependencies: Transfer ledger and payout policy.  
Acceptance criteria: Refund/dispute events are persisted, linked to orders/items/transfers, and visible to admins with required action states.

### 12. Add operational monitoring and alerting

Business justification: Operators need to know when money, orders, emails, fulfilment, or payouts fail.  
Technical justification: No Sentry/PostHog/log drain/alerting integration was found. README says to monitor failures but implementation is absent.  
Estimated effort: M  
Risk if not addressed: Failures are discovered by customers or artists first.  
Likely files affected: `src/lib/observability/*`, API routes, webhook route, CI/deploy env.  
Dependencies: Choose Sentry, hosting logs, PostHog, or equivalent.  
Acceptance criteria: Alerts exist for webhook errors, checkout failures, email/SMS failures, fulfilment failures, and payout/transfer failures.

### 13. Add audit logs for privileged actions

Business justification: Admin actions around artists, products, orders, payouts, and fulfilment need traceability.  
Technical justification: Admin APIs are guarded by `requireAdmin`, but no audit table was found.  
Estimated effort: M  
Risk if not addressed: Hard to investigate mistakes, disputes, or unauthorized changes.  
Likely files affected: `supabase/migrations/*`, `src/app/api/admin/*`, admin pages.  
Dependencies: Actor identity model.  
Acceptance criteria: Key admin actions write immutable audit rows with actor, target, action, before/after summary, and timestamp.

### 14. Generate and use Supabase TypeScript types

Business justification: Reduces bugs as schema grows for Connect, fulfilment, and designer templates.  
Technical justification: Many route/page files use `any`, likely because app-level DB types are absent.  
Estimated effort: S/M  
Risk if not addressed: Schema drift and runtime-only errors increase.  
Likely files affected: `src/lib/supabase/types.ts`, Supabase CLI config, data access code.  
Dependencies: Access to linked Supabase project or local schema.  
Acceptance criteria: Supabase-generated types are committed and used in core data access paths.

## Phase 3: Scalability

Goal: move from manually curated merch shop to provider-backed self-service product creation and fulfilment.

### 15. Add provider-backed product template schema

Business justification: Artists need simple, reliable product creation without manual operator setup.  
Technical justification: Current product model lacks provider product IDs, variant IDs, sizes, costs, print areas, and availability.  
Estimated effort: L  
Risk if not addressed: Product creation remains manual and inconsistent; margins and fulfilment cannot be trusted.  
Likely files affected: `supabase/migrations/*`, product dashboard routes, admin product pages.  
Dependencies: Select first provider/product family.  
Acceptance criteria: At least one active template includes provider IDs, variants, colors, sizes, cost, currency, and print areas.

### 16. Upgrade the product designer to constrained template editing

Business justification: Artists should be able to create printable products without platform help.  
Technical justification: Current designer saves a mockup and JSON, but does not enforce provider print requirements.  
Estimated effort: L  
Risk if not addressed: Designs may be impossible to fulfil or may print poorly.  
Likely files affected: `src/app/dashboard/products/designer/*`, new designer components, product template tables.  
Dependencies: Product template schema.  
Acceptance criteria: Designer loads template print areas, enforces safe zones, stores original assets, stores coordinates in template space, generates mockups, and blocks publishing invalid designs.

### 17. Add production file generation

Business justification: Fulfilment providers need print-ready assets, not just storefront mockups.  
Technical justification: Current action stores flattened mockup PNGs and replaced layer asset paths. No order-time print file generation exists.  
Estimated effort: M/L  
Risk if not addressed: Fulfilment remains manual or error-prone.  
Likely files affected: `src/lib/design-rendering/*`, designer save action, order processing jobs, storage policies.  
Dependencies: Template coordinate system and asset constraints.  
Acceptance criteria: For each print area, the system can generate provider-ready files with expected dimensions, format, transparency, and storage references.

### 18. Integrate Printify or selected fulfilment provider

Business justification: Self-service selling requires automated order routing.  
Technical justification: Only `provider: "printify"` appears in `product_designs`; no API integration exists.  
Estimated effort: L  
Risk if not addressed: Every order requires manual fulfilment.  
Likely files affected: `src/lib/fulfilment/*`, webhook/jobs, admin orders, Supabase migrations.  
Dependencies: Provider API credentials, template mapping, production files.  
Acceptance criteria: Paid/approved order items create provider orders, store provider order IDs/statuses, and sync tracking/status updates.

### 19. Add background job processing

Business justification: Payment webhooks should be fast and reliable while slower work retries independently.  
Technical justification: Email, SMS, order item processing, and future fulfilment currently sit in webhook flow or would naturally land there.  
Estimated effort: M/L  
Risk if not addressed: Timeouts and transient failures cause lost work or slow checkout post-processing.  
Likely files affected: `src/lib/jobs/*`, webhook route, migrations, deployment config.  
Dependencies: Choose job mechanism: Supabase queues/pg_cron, Inngest, QStash, Trigger.dev, or platform cron.  
Acceptance criteria: Notification, fulfilment, transfer, and reconciliation tasks are persisted, retried, and observable.

### 20. Add catalogue pagination and cache strategy

Business justification: Storefront performance affects conversion as product count grows.  
Technical justification: Product APIs and pages rely on direct queries and repeated mapping; public pages are dynamic without a documented cache/revalidation plan.  
Estimated effort: M  
Risk if not addressed: Slow category/product listing pages and unnecessary DB load.  
Likely files affected: `src/app/api/products/*`, `src/app/category/*`, `src/app/new/page.tsx`, `src/app/editors/page.tsx`.  
Dependencies: Product volume and freshness needs.  
Acceptance criteria: Public catalogue routes paginate, have indexes, and use an explicit caching/revalidation policy.

## Phase 4: Product Growth

Goal: turn the operationally stable marketplace into a growth product for artists and fans.

### 21. Build complete artist onboarding wizard

Business justification: Self-service conversion depends on guiding artists to their first live product.  
Technical justification: Current onboarding only creates an artist row from `display_name`.  
Estimated effort: M/L  
Risk if not addressed: Artists drop off or need support to publish.  
Likely files affected: `src/app/auth/*`, `src/app/dashboard/*`, artist tables/migrations.  
Dependencies: Connect onboarding and product templates.  
Acceptance criteria: Artist sees steps for profile, payout, template, design, publish, and each step has durable completion state.

### 22. Add product readiness gate

Business justification: Prevents broken or unfulfillable products from going live.  
Technical justification: `is_published` is currently a direct boolean on product creation/edit flows.  
Estimated effort: M  
Risk if not addressed: Artists can publish products without payout readiness, provider mapping, valid design data, or valid images.  
Likely files affected: product creation/edit actions, designer action, dashboard product UI.  
Dependencies: Connect status and template validation.  
Acceptance criteria: Publish action checks payout readiness, template mapping, valid production assets, margin, price, and required metadata.

### 23. Add product and artist analytics

Business justification: Artists need proof of value and guidance on what sells.  
Technical justification: Only page view tracking was found; no event funnel model exists.  
Estimated effort: M  
Risk if not addressed: Artists and operators cannot measure conversion or diagnose drop-off.  
Likely files affected: analytics API, dashboard sales pages, product pages, cart/checkout actions.  
Dependencies: Event taxonomy.  
Acceptance criteria: Dashboard shows views, add-to-cart, checkout starts, purchases, conversion rate, revenue, and payout-ready earnings.

### 24. Improve SEO and social previews

Business justification: Artist merch depends on shareability and search/social discovery.  
Technical justification: Global metadata exists, but dynamic product/artist/category metadata is limited or commented out.  
Estimated effort: M  
Risk if not addressed: Poor link previews and lower organic discovery.  
Likely files affected: `src/app/layout.tsx`, `src/app/product/[id]/page.tsx`, `src/app/artists/[id]/page.tsx`, category pages.  
Dependencies: Stable public URLs and image assets.  
Acceptance criteria: Products/artists have dynamic title, description, canonical URL, Open Graph image, and product structured data where applicable.

### 25. Add artist growth tools

Business justification: Once core selling works, artists need reasons to keep using MerchTent.  
Technical justification: Existing app has products, sales, images, and basic dashboard foundations.  
Estimated effort: L  
Risk if not addressed: Platform remains a basic storefront rather than a sticky artist commerce tool.  
Likely files affected: dashboard pages, analytics, product model.  
Dependencies: Stable product/order/payout foundation.  
Acceptance criteria: Artists can run drops, bundles, discount campaigns, tour-linked products, and shareable merch pages.

### 26. Add finance and operations reporting

Business justification: Scaling a marketplace requires clear gross sales, fees, costs, artist earnings, refunds, transfers, and provider spend.  
Technical justification: Current dashboard reports simple sales and payout-ready totals but no full reconciliation model.  
Estimated effort: L  
Risk if not addressed: Finance operations become spreadsheet-driven and error-prone.  
Likely files affected: admin reports, earnings/transfer/provider ledgers, export routes.  
Dependencies: Connect and fulfilment ledgers.  
Acceptance criteria: Admin can reconcile Stripe payments, application fees, provider costs, artist earnings, refunds, disputes, and transfers by period.

## Suggested MVP Cut Line

For a 10-artist beta, ship:

1. Dependency audit clean.
2. Env validation and staging/prod setup.
3. Stripe Connect onboarding and payout-ready status.
4. Item-level earnings ledger.
5. One provider-backed tee template with fixed size/color variants.
6. Constrained designer for that template.
7. Product publish readiness gate.
8. Webhook event ledger and retryable notification/fulfilment jobs.
9. Manual fulfilment allowed only if tracked in admin with explicit status.
10. Smoke tests and monitoring for signup, design, checkout, webhook, fulfilment, and payout paths.

Defer:

- Multi-provider catalogue.
- Advanced editor features.
- SVG upload.
- Bulk product generation.
- Fully automated refunds/disputes.
- Complex artist CRM.
- Public app marketplace integrations.

