# Merch Tent Production Readiness Audit

Audit date: 2026-08-23  
Scope: Next.js app, Supabase migrations/RLS, Stripe checkout/webhook flow, product designer/generation flow, account/credits flow, CI/deployability, dependency audit, and operational readiness.  
Constraint: audit only. No implementation changes were made.

## Executive Summary

Merch Tent is now deployable from a build perspective and has moved beyond a prototype: the app has a public storefront, artist/fan accounts, artist product management, a browser-based product designer, Stripe Checkout, Stripe Connect onboarding scaffolding, internal fulfillment jobs, customer order views, merch credits, admin tools, Supabase RLS hardening, and CI for typecheck/lint/build.

The current production risk is not basic compilation. The production risk is operational correctness under money-moving workflows. Paid order creation, order item insertion, merch credit awarding, notification sending, and fulfillment queuing are still split across multiple non-transactional steps in `src/app/api/stripe/webhook/route.ts`. A partial failure can create a paid order without complete downstream records and then make later Stripe retries believe the order is already processed.

The product designer is a strong MVP direction, but it is not yet a trustworthy production print pipeline. `src/app/dashboard/products/designer/actions.ts` stores client-generated mockups and print assets, meaning the server cannot prove that printable files match the saved design JSON. For a marketplace where artists create unlimited products and products go live immediately, this needs a server-side renderer, deterministic validation, asset provenance, moderation, and a recovery workflow.

Overall release posture: suitable for a controlled beta with operator oversight. Not yet suitable for broad self-service production launch without hardening order idempotency, product-generation provenance, fulfillment recovery, observability, admin audit trails, and tests.

## Architecture Scorecard

| Area | Score | Assessment |
|---|---:|---|
| Architecture | 6/10 | Clear App Router structure and pragmatic Supabase usage. Critical business logic remains route/server-action heavy instead of isolated domain services. |
| Security | 6/10 | RLS is materially improved and admin helpers exist. Remaining risks include weak auditability, direct service-role client creation in some routes, public storage strategy, and no durable rate limit. |
| Scalability | 5/10 | Fine for beta traffic. Non-transactional order/product workflows, no background worker, no durable queue, and process-local rate limiting limit scale. |
| Maintainability | 5/10 | Code is readable, but lint shows 154 warnings, many `any` types, repeated Supabase mapping, direct env access, and route-level business logic. |
| Performance | 6/10 | Production build passes. Public pages are dynamic and many raw `<img>` warnings remain; image/storage URL handling is inconsistent. |
| Developer Experience | 6/10 | CI exists and local build/typecheck pass. No automated test suite or Supabase DB lint workflow is currently passing. |
| Operational Readiness | 4/10 | Webhook ledger and fulfillment jobs exist, but alerting, structured logs, retry dashboards, audit logs, reconciliation, backup drills, and runbooks are missing. |
| Product Readiness | 5/10 | Fan/artist split and designer are promising. Credits redemption, fulfillment workflow depth, moderation, and production design guarantees are incomplete. |

## Verification Results

| Check | Result | Notes |
|---|---|---|
| `node .\node_modules\typescript\bin\tsc --noEmit` | Passed | No TypeScript errors. |
| `node .\node_modules\eslint\bin\eslint.js src` | Passed with warnings | 154 warnings, including `any`, raw `<img>`, missing `alt`, setState-in-effect, unused imports, and navigation warnings. |
| `node .\node_modules\next\dist\bin\next build --turbopack` | Passed | Next.js 16.3.2 production build completed successfully. |
| `npm audit --omit=dev` | Passed | 0 production vulnerabilities reported. |
| `npx supabase migration list` | Passed | Local and remote migrations match through `202608230003`. |
| `npx supabase db lint` | Not completed | Local Supabase DB was not running at `127.0.0.1:54322`. |

## Critical Findings

### C1. Stripe webhook can permanently skip incomplete paid orders

Observation: `src/app/api/stripe/webhook/route.ts:271-395` inserts the `orders` row first, then inserts `order_items`. If order creation succeeds and a later step fails, the webhook returns 500. On retry, `src/app/api/stripe/webhook/route.ts:235-244` sees an existing order by `stripe_session_id` and marks the new event processed without verifying that items, credits, notifications, and fulfillment exist.

Business impact: A customer can pay, but the platform may show an incomplete order, miss artist earnings, miss fulfillment, and lose operational visibility. This is the highest-risk production issue because it involves real customer money.

Recommended action: Move order creation into an idempotent database RPC/transaction or build a recovery-safe processor that upserts the order, verifies expected line items, verifies credit ledger, verifies fulfillment job, and only marks the webhook processed when all critical invariants are satisfied.

### C2. Product designer trusts client-generated production assets

Observation: `src/app/dashboard/products/designer/actions.ts:196-199` receives `front_render`, `back_render`, `front_print_asset`, and `back_print_asset` from the browser. `src/app/dashboard/products/designer/actions.ts:229-296` uploads those assets and saves `product_designs` without a server-side render or hash-bound verification that the final printable asset matches `design_data`.

Business impact: A listing can go live with mockups or print files that diverge from the saved design. This creates fulfillment errors, customer disputes, artist support issues, and potentially malicious/tampered print assets.

Recommended action: Treat browser renders as previews only. Generate canonical mockups and production print files server-side from saved design JSON and original assets. Store checksums, renderer version, validation status, dimensions, and a publish gate.

### C3. Fulfillment queuing failure is logged but does not fail or retry the paid order workflow

Observation: `src/app/api/stripe/webhook/route.ts:614-620` calls `queueMerchTentFulfillment(orderId)` but catches failures and continues. The webhook is marked processed at `src/app/api/stripe/webhook/route.ts:628`.

Business impact: A paid order can exist with no `fulfillment_jobs` row and no automatic retry. Operators may not know an order needs production.

Recommended action: Make fulfillment job creation a critical invariant for paid physical goods. Either create it in the same transaction as the order or record a retryable failure state that appears in an operations dashboard and alert.

## High Priority Findings

### H1. Merch credit balance updates are not atomic

Observation: `src/app/api/stripe/webhook/route.ts:145-181` upserts the balance, inserts a ledger row, reads the current balance, then writes the new balance.

Business impact: Balance drift is possible under retries, concurrent events, manual adjustments, or future redemption logic. Credits are a customer-facing liability once they have redemption value.

Recommended action: Create a database RPC that inserts the ledger row and increments/decrements balances atomically in one transaction. Add reconciliation queries comparing ledger totals to balances.

### H2. Checkout does not require complete fulfillment-grade shipping details

Observation: `src/app/checkout/actions.ts:35-57` only requires email and cart validity. Shipping fields are copied into Stripe metadata at `src/app/checkout/actions.ts:130-143`, but the server action does not validate required address fields before payment.

Business impact: Customers can potentially pay for physical products with missing or unusable shipping details, creating manual support and fulfillment delays.

Recommended action: Validate name, address line 1, city, state, postal code, country, and phone rules server-side. Prefer Stripe Checkout shipping address collection where possible, then persist the normalized Stripe shipping object.

### H3. Order numbers are not production-friendly

Observation: `src/app/api/stripe/webhook/route.ts:21-22` formats `MT-${String(id).padStart(6, "0")}`. Since `orders.id` is a UUID in migrations, this produces long UUID-based order numbers rather than a short support-friendly reference.

Business impact: Customer support, SMS/email, picking, packing, and reconciliation become harder.

Recommended action: Add a dedicated short unique order reference, generated in the database or via a sequence-safe function.

### H4. Admin and order actions lack durable audit logs

Observation: Admin order status changes in `src/app/api/admin/orders/[id]/status/route.ts:52-61` update `orders` directly. Fulfillment job changes in `src/app/admin/fulfillment/actions.ts:31-39` update `fulfillment_jobs` directly. No `admin_audit_events`, `order_status_events`, or `fulfillment_events` table is present in migrations.

Business impact: Operators cannot reliably answer who changed an order, when, why, and from what prior state. This is a due-diligence gap for refunds, disputes, missed shipments, and support.

Recommended action: Add append-only audit/event tables for order status, fulfillment status, admin content changes, payouts, credits, and webhook processing decisions.

### H5. Observability is mostly console logging

Observation: `rg` found console logging across checkout, webhook, SMS, Postmark, admin routes, and storefront components. Examples include `src/app/api/stripe/webhook/route.ts:230`, `src/lib/sms.ts:33`, `src/app/api/track/page-view/route.ts:54`, and `src/components/shop/sections/FeaturedArtist.tsx:77`.

Business impact: Production issues will be hard to triage. Console logs are not enough for payment failures, failed fulfillment, SMS/email failures, artist payout problems, or product generation incidents.

Recommended action: Add structured logging with request IDs, event IDs, order IDs, artist IDs, and severity. Add Sentry or equivalent error tracking, log drains, and alerts for failed webhook events, unqueued fulfillment, failed transfers, and product generation failures.

### H6. Product creation is non-transactional and can leave partial products/assets

Observation: `src/app/dashboard/products/designer/actions.ts:211-298` inserts the product, uploads images, inserts images, uploads print assets, replaces layer assets, inserts colors, and inserts design rows as separate steps. Manual product creation has similar risk in `src/app/dashboard/products/new/actions.ts`.

Business impact: Artists can end up with products missing images, colors, designs, or print assets. Storage can accumulate orphaned files.

Recommended action: Use a DB transaction/RPC for metadata rows and a staging/finalization model for storage assets. Add cleanup jobs for orphaned products/assets and a product readiness state.

### H7. Account role and account type are conflated

Observation: `src/app/account/setup/actions.ts:31-39` writes both `role: accountType` and `account_type: accountType`. Admin checks rely on `profiles.role === "admin"` in `src/lib/auth/admin.ts:23-25`.

Business impact: Business account type and security role are different concepts. Conflating them increases future risk when adding staff accounts, artist teams, fan upgrades, and admin workflows.

Recommended action: Keep `role` strictly for security roles such as `admin`, `staff`, or `user`; keep `account_type` for `fan`/`artist`. Add migration cleanup and authorization tests.

### H8. No automated tests cover critical commerce flows

Observation: `package.json` has `dev`, `build`, `start`, `lint`, `typecheck`, and `verify`, but no unit/integration/e2e test scripts. CI in `.github/workflows/ci.yml` runs install, typecheck, lint, and build only.

Business impact: The highest-risk flows can regress silently: checkout, webhook idempotency, RLS, product generation, fulfillment, credits, Stripe Connect, and admin order handling.

Recommended action: Add tests in this order: webhook idempotency/partial failure, checkout validation, RLS access, designer save validation, fan/artist onboarding, admin order status transitions, fulfillment queue recovery, and credits reconciliation.

## Medium Priority Findings

### M1. Rate limiting is process-local

Observation: `src/lib/rate-limit.ts:6-22` uses an in-memory `Map`. It is used by newsletter and page-view tracking but not as a platform-wide control.

Business impact: Limits reset per server instance and deployment. Abuse protection is weak under serverless or multi-instance deployment.

Recommended action: Use a durable/shared rate limiter such as Redis, Supabase counters, or provider edge controls. Apply it to auth-adjacent routes, uploads, checkout attempts, newsletter, contact, analytics, and designer saves.

### M2. Service-role Supabase clients are created inconsistently

Observation: `src/lib/supabase/service.ts` centralizes service-role client creation, but `src/app/api/track/page-view/route.ts:7-11` and `src/app/api/artist-hero-upload/route.ts:49-61` create service clients directly from `process.env`.

Business impact: Secret handling, auth settings, logging, and future key rotation become inconsistent.

Recommended action: Route all service-role access through `getServiceSupabase()` and keep service-role operations small, named, and audited.

### M3. Direct environment access remains scattered

Observation: Direct `process.env` access exists in checkout, Postmark, public image URL helpers, API routes, and config. `src/app/checkout/actions.ts:8` constructs Stripe from `process.env.STRIPE_SECRET_KEY!`; `next.config.ts:11` hard-codes one Supabase hostname.

Business impact: Environment mistakes will surface at runtime and deployments are tied to one Supabase project hostname.

Recommended action: Expand `src/lib/env.ts` and `src/lib/env.server.ts` usage. Derive image remote host from `NEXT_PUBLIC_SUPABASE_URL` at config time or document environment-specific config.

### M4. Public storage strategy exposes product design assets

Observation: Product mockups, print assets, and layer assets are stored in the public `product-images` bucket by `src/app/dashboard/products/designer/actions.ts:124-129`, `150-155`, and `260-267`.

Business impact: Artist artwork and production assets are easy to scrape. This may be acceptable for storefront mockups, but less appropriate for production print files.

Recommended action: Split public mockups from private source/print assets. Use signed URLs for production assets and restrict operational access.

### M5. Product designer payload validation is shallow

Observation: `normaliseDesignPayload` in `src/app/dashboard/products/designer/actions.ts:102-115` validates version, template key, canvas presence, and canvas size, but not layer count, bounds, dimensions, opacity, text length, font allow-list, source dimensions, or print-area constraints.

Business impact: Malformed or abusive designs can be saved, creating rendering failures, storage bloat, or fulfillment surprises.

Recommended action: Use a deep Zod schema for the design payload. Enforce max layer count, string lengths, allowed fonts/colors, image dimensions, transform bounds, and template print-safe areas.

### M6. Fulfillment workflow is too shallow for production operations

Observation: `supabase/migrations/202608230002_merch_tent_fulfillment_jobs.sql` defines `pending`, `in_progress`, `completed`, and `cancelled`, but no event history, SLA timestamps, provider references, shipment packages, issue reasons, retries, or assignment workflow.

Business impact: Operators cannot manage exceptions, partial shipments, reprints, failed production, or provider escalation cleanly.

Recommended action: Add fulfillment events, issue states, assignment, SLA views, provider order references, shipment tracking history, and admin filters for failed/stale jobs.

### M7. Credits redemption is promised but not implemented

Observation: `src/app/dashboard/page.tsx` and `src/app/orders/page.tsx` show progress toward a free tee and say redemption is enabled later. There is no redemption checkout logic or liability reporting.

Business impact: Customers may expect a benefit that cannot be redeemed. Once launched, this becomes a finance and support obligation.

Recommended action: Either hide redemption language until implemented or add a controlled redemption workflow with atomic ledger debits, voucher application, and liability reporting.

### M8. Lint warnings hide meaningful quality issues

Observation: ESLint reports 154 warnings. High-value examples include missing `alt` text in review imagery, raw `<img>` in public pages, `any` in admin/order/product pages, unused variables, and React setState-in-effect warnings.

Business impact: Warnings become background noise and real regressions are harder to spot.

Recommended action: Set a warning budget and ratchet it down. Prioritize checkout, product, order, admin, and public LCP pages.

## Low Priority Findings

- Replace remaining hard-coded copy that says early access if the launch posture changes.
- Standardize spelling of fulfillment/fulfilment in code and UI.
- Add generated Supabase database types to reduce `any` usage and query-shape mistakes.
- Add canonical URLs, dynamic product/artist metadata, Open Graph images, and structured product data.
- Add product slug collision handling in designer/manual creation.
- Add stale draft cleanup for abandoned designer uploads and checkout drafts.
- Add admin exports for orders, payouts, credits, and fulfillment.

## Current App Flow Log

### Account Flow

1. User chooses fan or artist in `src/app/auth/sign-up/page.tsx`.
2. Supabase magic link redirects through `src/app/auth/callback/complete/route.ts`.
3. User completes setup in `src/app/account/setup/actions.ts`.
4. Dashboard branches into fan or artist mode in `src/app/dashboard/page.tsx`.

Risk notes: role/account type are mixed; onboarding is minimal; there is no team/member model; fan-to-artist upgrade path is not formalized.

### Product Designer Flow

1. Artist opens `/dashboard/products/designer`.
2. Browser canvas creates design JSON plus rendered mockup/print assets.
3. `createDesignedProductAction` validates basic input and owner artist.
4. Product row is inserted.
5. Mockups, print assets, and layer assets are uploaded.
6. Product images, color, and `product_designs` rows are inserted.
7. Product can be published immediately.

Risk notes: no transaction, shallow design validation, browser-generated print assets, no server canonical render, no moderation, no readiness gate, no asset cleanup workflow.

### Checkout and Order Flow

1. `src/app/checkout/actions.ts` validates cart item shape and loads current product prices.
2. Stripe Checkout session is created with product metadata and shipping fields in metadata.
3. Stripe calls `src/app/api/stripe/webhook/route.ts`.
4. Webhook ledger row is started.
5. Order row is inserted.
6. Order items are inserted.
7. Merch credits are awarded.
8. Email and SMS are attempted.
9. Fulfillment job is queued.
10. Webhook ledger is marked processed.

Risk notes: order creation is not atomic; retry logic can skip incomplete orders; fulfillment queuing is non-critical; notifications are inline; shipping details are not fully validated; no order event history exists.

### Fulfillment Flow

1. Paid orders should create `fulfillment_jobs`.
2. Admin uses `/admin/fulfillment`.
3. Admin status changes use `src/app/admin/fulfillment/actions.ts`.
4. Order shipment status/tracking can be updated through `src/app/api/admin/orders/[id]/status/route.ts`.

Risk notes: no event log, no alerts, no failed/stale queue dashboard, no production asset checklist, no provider submission, no reprint/refund linkage.

## Security Findings

### Strengths

- RLS is enabled across core public tables in `supabase/migrations/202607040002_rls_policy_hardening.sql`.
- Ownership helpers `public.is_admin()` and `public.owns_artist(uuid)` are used broadly in policies.
- Product storage policies constrain product image writes by folder ownership.
- Admin routes generally use centralized `requireAdmin()` from `src/lib/auth/admin.ts`.
- Stripe webhook signature verification is present in `src/app/api/stripe/webhook/route.ts:194-203`.
- Upload validation restricts image types and size in `src/lib/uploads.ts`.
- Production dependency audit currently reports 0 vulnerabilities.

### Risks

- No durable audit log for admin actions, order changes, fulfillment changes, credits, or payouts.
- No centralized security event logging for auth failures, upload failures, admin denial, or suspicious activity.
- Process-local rate limiting is insufficient for production.
- Browser-generated print assets can be tampered with before storage.
- Public product storage may expose artist source/print assets.
- Direct service-role client creation appears in multiple routes.
- `src/lib/sms.ts:33` logs full SMS provider response, which may include message metadata or recipient details.
- `src/app/api/test-postmark/route.ts` exists. It blocks production by `NODE_ENV`, but should still be restricted and monitored in non-production environments.

## Database and RLS Findings

### Strengths

- Migration history is synchronized between local and remote through `202608230003`.
- RLS policies exist for artists, products, product images, product colors, product designs, orders, order items, cash outs, transfer ledgers, fulfillment jobs, credit balances, and credit ledger.
- `product_designs` has a trigger enforcing product/artist consistency.
- Unique constraints exist for Stripe webhook events, artist transfers, fulfillment job per order, and one earned-credit ledger per order.

### Gaps

- Critical order creation is not performed by a DB transaction/RPC.
- Credit ledger and balance updates are not atomic.
- No order status event table exists.
- No admin audit table exists.
- No fulfillment event table exists.
- No product generation job/event table exists.
- `db lint` was not completed because local Supabase was not running.
- RLS policies should be tested with real anon/authenticated/artist/admin sessions, not only reviewed as SQL.

## Performance Findings

- Production build succeeds under Next.js 16.3.2 with Turbopack.
- Public image optimization remains inconsistent: ESLint still reports raw `<img>` usage in public and admin surfaces.
- `next.config.ts` only allows a hard-coded Supabase image host, which is brittle across environments.
- Public storefront/category/product routes are dynamic; caching and revalidation strategy should be explicit.
- Product API routes repeat similar Supabase mapping logic and should gain pagination, limits, and consistent indexes before large catalog growth.
- Page-view tracking writes directly per request; production analytics should batch, sample, or move to a dedicated analytics system if traffic grows.

## Developer Experience Findings

- CI exists and covers install, typecheck, lint, and build.
- No automated tests currently run.
- Lint warnings are high enough to reduce signal.
- No generated Supabase DB types are evident.
- Env validation exists but is not used consistently.
- Supabase local `db lint` is not part of a passing workflow.
- Domain logic is embedded in route handlers/server actions, which makes unit testing and recovery logic harder.

## Technical Debt Register

| Description | Impact | Recommended Action | Estimated Priority |
|---|---|---|---|
| Non-transactional Stripe order workflow | Paid orders can become incomplete | DB RPC/idempotent processor | Critical |
| Client-trusted designer assets | Print/mockup mismatch and tampering risk | Server-side renderer and validation | Critical |
| Fulfillment queuing non-critical | Paid orders may not enter production | Critical invariant or retry queue | Critical |
| Credits balance read/write | Balance drift risk | Atomic ledger RPC | High |
| No audit event tables | Poor support/compliance/debugging | Add append-only event logs | High |
| No tests | High regression risk | Add critical-path unit/integration/e2e tests | High |
| Role/account type conflation | Future auth mistakes | Separate security role from business type | High |
| In-memory rate limit | Weak abuse protection | Durable rate limiter | Medium |
| Direct env/service clients | Deployment inconsistency | Centralize env and service client usage | Medium |
| Lint warning backlog | Lower maintainability | Warning budget and cleanup | Medium |
| Public print asset storage | IP/content exposure | Private production asset bucket | Medium |
| No product readiness state | Invalid products can publish | Add validation/publish gates | Medium |

## Quick Wins

- Remove client `console.log` calls and sensitive SMS provider response logging.
- Use `getServiceSupabase()` in routes that currently create service-role clients directly.
- Validate checkout shipping fields before creating a Stripe session.
- Add a dashboard/admin filter for paid orders missing fulfillment jobs.
- Add a SQL reconciliation query for orders without items, orders without fulfillment jobs, and credit balance mismatches.
- Add `.env.example` checks to CI or a startup health route.
- Hide or soften merch credit redemption language until redemption exists.
- Add slug collision handling for product creation.
- Replace the most visible raw `<img>` usage on public product/artist pages.
- Add a warning budget to CI after cleaning the first batch.

## Strategic Recommendations

### Next 30 Days: Stability Before Scale

1. Rebuild Stripe webhook processing around idempotent, recovery-safe invariants.
2. Add order, fulfillment, credit, payout, and admin audit events.
3. Add alerting for failed Stripe webhook events, paid orders without items, paid orders without fulfillment jobs, failed notifications, and failed transfers.
4. Add tests for checkout, webhook partial failure, fulfillment creation, and RLS access.

### Next 60 Days: Trusted Product Generation

1. Convert designer output to server-rendered canonical mockups and production print files.
2. Add product readiness states: draft, generated, validated, published, blocked.
3. Store original assets, mockups, and production files separately.
4. Add deep schema validation and template print-area enforcement.
5. Add moderation/abuse handling for uploaded artwork and text.

### Next 90 Days: Marketplace Operations

1. Finish Stripe Connect payout readiness, transfer reconciliation, refunds/disputes, and payout statements.
2. Expand fulfillment jobs into a full operations queue with events, issue states, assignment, SLA, and provider references.
3. Implement merch credit redemption with atomic debits and liability reporting.
4. Add admin dashboards for exceptions, reconciliation, and operational health.

### 12-24 Month Direction

Build Merch Tent as a provider-agnostic merch operating system: template-backed product creation, server-side mockup/print generation, order orchestration, fulfillment routing, artist payout ledgers, fan credits, campaign/drop tooling, CRM-style fan insights, and strong auditability across every money-moving and product-producing action.

