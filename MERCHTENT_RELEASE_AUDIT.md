# MerchTent Release Audit

Audit date: 2026-08-19  
Scope: repository inspection, migrations/config review, build/type/lint verification, dependency audit, and prior Supabase advisor state observed in this thread.  
Constraint: no implementation changes were made.

## Executive Summary

MerchTent is a functional Next.js commerce application with a public storefront, artist dashboard, manual product creation, a first-pass product designer, Stripe Checkout, Supabase Auth/Postgres/Storage, admin tools, order views, transactional email/SMS hooks, and recently hardened RLS migrations.

The platform is not yet a true zero-touch self-service SaaS for artists. A fan can browse and buy published products, and an artist can sign up and create products, but the full intended loop is incomplete: artists cannot connect Stripe, real payouts are not automated, fulfilment/Printify is not integrated, product templates and variants are not provider-backed, and order processing relies heavily on webhook-side synchronous work plus manual admin intervention.

Current release posture: suitable for controlled beta with hands-on operator support. Not suitable for broad public self-service onboarding until Stripe Connect, fulfilment state, production-grade product templates, and webhook reliability are addressed.

## Evidence Reviewed

- App structure under `src/app`, `src/components`, `src/lib`, `supabase/migrations`, `.github/workflows/ci.yml`, `package.json`, `next.config.ts`, and `README.md`.
- Product flows in `src/app/dashboard/products/new/actions.ts`, `src/app/dashboard/products/designer/*`, `src/app/product/[id]/page.tsx`, and product API routes.
- Checkout and order flows in `src/app/checkout/actions.ts`, `src/app/api/stripe/webhook/route.ts`, `src/app/orders/*`, and admin order pages.
- Artist auth/onboarding in `src/app/auth/sign-up/page.tsx`, `src/app/auth/onboard/route.ts`, and `src/app/dashboard/page.tsx`.
- RLS and DB hardening migrations in `supabase/migrations/202606230001_production_hardening.sql`, `202607040001_product_designs.sql`, `202607040002_rls_policy_hardening.sql`, and `202607040003_policy_helper_invoker.sql`.
- Current Stripe Connect documentation:
  - https://docs.stripe.com/connect
  - https://docs.stripe.com/connect/marketplace/tasks/onboard
  - https://docs.stripe.com/connect/separate-charges-and-transfers
  - https://docs.stripe.com/connect/destination-charges
  - https://docs.stripe.com/connect/marketplace/tasks/refunds-disputes

## Verification Results

- `node .\node_modules\typescript\bin\tsc --noEmit`: passed.
- `node .\node_modules\eslint\bin\eslint.js src`: passed with 157 warnings.
- `node .\node_modules\next\dist\bin\next build --turbopack`: passed.
- `npm audit --omit=dev`: failed with 9 production vulnerabilities reported: 7 high and 2 moderate.

## Current User Journey Status

| Journey | Status | Evidence | Notes |
|---|---:|---|---|
| Artist discovers site | Partial | `src/app/start/page.tsx`, homepage sections | Marketing/onboarding copy exists, but the signup experience still reads like early access in places. |
| Artist signs up | Partial | `src/app/auth/sign-up/page.tsx`, `src/app/auth/callback/page.tsx`, `src/app/auth/onboard/route.ts` | Magic-link signup creates an artist row. No full onboarding wizard, readiness checklist, Stripe step, fulfilment selection, or compliance acknowledgement. |
| Artist creates profile | Partial | `src/app/dashboard/artist/page.tsx`, `EditArtistHeroForm.tsx`, `src/app/api/artist-hero-upload/route.ts` | Artist profile editing exists. Hero upload exists. Some manual path UI remains. |
| Artist connects payout account | Missing | No Stripe Connect account/link/transfer code found | Dashboard has cash-out UI, but no real payout rail. |
| Artist creates manual product | Partial | `src/app/dashboard/products/new/actions.ts` | Works for basic products/images/colours. Missing variants, inventory/provider mapping, cost/margin rules, fulfilment data, template constraints. |
| Artist designs product visually | Partial | `src/app/dashboard/products/designer/DesignerClient.tsx`, `actions.ts`, `product_designs` migration | MVP canvas saves rendered mockups and design JSON. It is not tied to real garment templates, provider print areas, variants, or production print files. |
| Artist publishes product | Partial | Product actions and dashboard product list | `is_published` exists. No readiness gate ensuring payout, fulfilment mapping, template validity, image quality, or policy compliance. |
| Fan browses products/artists | Complete for beta | Public routes and product API routes | Storefront and listing routes exist. SEO/metadata is basic. |
| Fan checks out | Partial | `src/app/checkout/actions.ts` | Stripe Checkout uses DB prices, which is good. No Connect routing, tax strategy, voucher validation implementation, pending order record, stock check, or multi-artist transfer plan. |
| Order is recorded | Partial | `src/app/api/stripe/webhook/route.ts` | Webhook inserts orders/items and sends emails/SMS. No event ledger, retry queue, background worker, or robust failure handling. |
| Order is fulfilled | Manual | `src/app/admin/orders/*`, `OrderStatusUpdater.tsx` | Admin can update statuses/tracking. No Printify/order routing integration. |
| Artist gets paid | Manual/placeholder | `src/app/dashboard/cash-out/*`, RPC `create_artist_cash_out` | Internal cash-out ledger only. No Stripe Connect transfer or payout status. |
| Admin operates platform | Partial | `src/app/admin/*`, admin API routes | Useful controls exist. Missing operational queue, exception handling, reconciliation, audit logs, and monitoring. |

## Architecture Scorecard

| Area | Score | Rationale |
|---|---:|---|
| Architecture | 6/10 | Clear App Router structure and pragmatic Supabase usage. Domain boundaries are still route-led, with payments, fulfilment, products, and notifications not separated into durable services. |
| Security | 6/10 | RLS hardening is much improved, file upload controls exist, and admin checks are centralized. Current gaps include dependency advisories, in-memory rate limits, secret rotation risk, webhook failure handling, and missing Connect security model. |
| Scalability | 4/10 | Fine for beta traffic. Weak for marketplace scale because webhook processing is synchronous, no queues exist, payout/fulfilment are manual, and product templates/variants are not normalized. |
| Maintainability | 5/10 | Code is readable and buildable, but many `any` warnings, duplicated API mapping patterns, route-level business logic, and missing generated Supabase types will slow growth. |
| Performance | 5/10 | Production build passes. Shared first-load JS is about 239 kB, many routes use raw `<img>`, and no caching strategy is documented for hot product/category APIs. |
| Developer Experience | 5/10 | CI exists for typecheck/lint/build. No test suite, no `.env.example` observed, no local seeded DB workflow, and ESLint warnings are not treated as actionable debt. |
| Operational Readiness | 3/10 | Missing monitoring, alerting, event ledgers, retry queues, backup drills, fulfilment reconciliation, Stripe Connect reconciliation, and incident runbooks. |
| Self-Service Readiness | 4/10 | Signup, artist dashboard, product creation, and designer MVP exist. Payouts, fulfilment, provider templates, onboarding gates, and production design pipeline are missing. |

## Release Blockers

### 1. Stripe Connect is absent

Observation: The codebase uses Stripe Checkout in `src/app/checkout/actions.ts` and a webhook in `src/app/api/stripe/webhook/route.ts`, but no `stripe_account`, account link, onboarding status, transfer, application fee, or Connect webhook code was found.

Business impact: Artists cannot be paid automatically. This blocks the core self-service marketplace promise.

Recommendation: Implement Connect onboarding and a transfer ledger before public artist onboarding. For multi-artist carts, Stripe's separate charges and transfers model is the likely fit: customer pays the platform, item-level earnings are tracked, and transfers are made to connected accounts after fulfilment/hold period. If the product scope is forced to single-artist carts, destination charges can be considered instead.

### 2. Fulfilment and Printify integration are missing

Observation: `product_designs.provider` defaults to `printify`, but no Printify API client, provider product IDs, variant IDs, print provider IDs, order submission flow, or fulfilment webhook/status mapping were found.

Business impact: The product can sell items that require manual fulfilment. At small scale this is manageable; at self-service scale it becomes the main failure point.

Recommendation: Add a provider-backed product template model before widening artist onboarding.

### 3. Product designer is an MVP, not a production print pipeline

Observation: `src/app/dashboard/products/designer/DesignerClient.tsx` draws stylized garments on canvas, supports basic image/text layers, and exports flattened mockup PNGs. `src/app/dashboard/products/designer/actions.ts` saves layer assets and JSON to `product_designs`.

Business impact: Artists can create listings, but the resulting data is not sufficient to guarantee printable artwork, provider-compatible coordinates, safe zones, variants, or order-time production files.

Recommendation: Keep the current designer as a prototype path, then replace the core editor surface with a constrained template-based designer. Prefer `react-konva`/Konva for V1 because it is React-friendly, supports canvas export, layer transforms, touch interactions, and constrained coordinate systems without the overhead of a general infinite whiteboard.

### 4. Order webhook processing is not production-reliable

Observation: `src/app/api/stripe/webhook/route.ts` processes `checkout.session.completed`, inserts order rows, inserts order items, sends Postmark emails, sends SMS, catches most exceptions, and still returns 200 to Stripe after signature/type checks.

Business impact: A transient DB/email/SMS failure can be logged but not retried by Stripe, creating silent operational misses.

Recommendation: Add a `stripe_webhook_events` table, persist event receipt first, process idempotently, and move email/SMS/fulfilment into retryable jobs.

### 5. Dependency audit has high vulnerabilities

Observation: `npm audit --omit=dev` reports 9 production vulnerabilities, including advisories for `next`, `axios`, `form-data`, `nanoid`, `postcss`, `sharp`, and `ws`.

Business impact: This is a release governance blocker for a production-intended ecommerce app.

Recommendation: Upgrade dependencies and rerun audit before public launch.

## High Priority Findings

### Onboarding does not express a complete self-service path

Observation: `src/app/auth/sign-up/page.tsx` handles magic-link signup and `src/app/auth/onboard/route.ts` creates an artist with `display_name`, but no structured wizard exists for store name, payout, tax/compliance, fulfilment readiness, or first product launch.

Recommendation: Add an onboarding state machine and dashboard checklist: profile, payout connected, first template selected, product designed, product published.

### Cash-out UI implies real bank payouts but only records internal ledger rows

Observation: `src/app/dashboard/cash-out/server-actions.ts` calls `create_artist_cash_out`; the migration inserts `cash_outs` and marks order items `cashed_out`. No external payment occurs.

Recommendation: Rename current cash-out behavior internally as "earnings request" until Connect exists, or hide it behind a payout-connected gate. Future implementation should create Stripe transfers and store transfer IDs/statuses.

### Product data model is too thin for provider-backed merch

Observation: `products`, `product_images`, `product_colors`, and `product_designs` support listings and images. They do not model provider templates, variants, sizes, base cost, margin, print areas, production assets, provider variant IDs, or artwork validation.

Recommendation: Add normalized product template and fulfilment mapping tables before integrating Printify.

### API and business logic are route-heavy

Observation: Checkout, webhook, product creation, and designer save logic live directly in route/server-action files.

Recommendation: Introduce small domain modules for payments, orders, products, fulfilment, notifications, and artist onboarding. Keep route handlers thin.

### Testing coverage is below production expectations

Observation: No Jest/Vitest/Playwright/Cypress test files or scripts were found. CI only runs typecheck, lint, and build.

Recommendation: Add e2e coverage for signup, product creation, checkout test mode, webhook idempotency, admin order status updates, and RLS access patterns.

### Lint warnings are too noisy

Observation: ESLint reports 157 warnings. Common categories are `no-explicit-any`, unused variables, raw `<img>`, missing `alt`, and Next `<Link>` guidance.

Recommendation: Establish a warning budget and reduce warnings in release-critical paths first: checkout, webhook, dashboard, admin, product pages.

## Medium Priority Findings

### SEO and metadata are basic

Observation: Global metadata exists in `src/app/layout.tsx`, and product code includes commented metadata generation in `src/app/product/[id]/page.tsx`.

Recommendation: Add dynamic metadata for products, artists, categories, Open Graph images, canonical URLs, and structured product data.

### Analytics are narrow

Observation: `src/lib/usePageView.ts` and `src/app/api/track/page-view/route.ts` track page views. No funnel/product events were found.

Recommendation: Track signup start/completion, artist onboarding steps, product design saved, product published, add-to-cart, checkout started, payment completed, fulfilment status, and payout lifecycle.

### Rate limiting is not durable

Observation: `src/lib/rate-limit.ts` uses a process-local `Map`.

Recommendation: Use a shared store such as Upstash Redis, Supabase-backed counters, or platform edge rate limiting for production-facing endpoints.

### Order numbers and status model need hardening

Observation: `formatOrderNumber` pads a UUID/string, which does not create human-friendly sequential order numbers. Statuses are strings without a documented state machine.

Recommendation: Add a durable order sequence or short public reference and define valid order state transitions.

### Environment and deployment contracts are incomplete

Observation: README documents required env vars, but `.env.local` exists in the workspace and no `.env.example` was observed.

Recommendation: Add schema-validated environment config, an example env file, staging/prod separation, and documented secret rotation.

## Low Priority Findings

- Replace remaining raw `<img>` usage where image optimization and accessibility matter.
- Clean unused imports/components to reduce cognitive load.
- Standardize category, currency, status, and provider values with enums or checked constraints.
- Add admin activity/audit logs for content, payout, product, and order changes.
- Add richer empty states and operational guidance inside admin dashboards.
- Add export/reporting views for artists and platform operators.

## Manual Intervention Register

| Area | Manual Today | Risk | Recommendation |
|---|---|---|---|
| Artist acceptance | Early-access copy and partial signup flow | Confusing launch posture | Replace with explicit beta/public onboarding mode. |
| Payout setup | No connected account | Artists cannot self-serve earnings | Add Stripe Connect onboarding. |
| Product setup | Manual product images/prices/categories | Inconsistent listings and margins | Add template-backed product creation. |
| Designer output | Mockup PNG plus JSON only | Not provider-printable enough | Save template coordinates and production artwork. |
| Fulfilment | Admin status/tracking updates | Scaling bottleneck and missed orders | Integrate Printify or a chosen fulfilment provider. |
| Notifications | Sent inline in webhook | Silent misses if webhook work fails | Queue and retry notifications. |
| Refunds/disputes | No clear workflow | Financial reconciliation risk | Add Stripe refund/dispute handling and transfer reversals. |
| Reconciliation | No transfer/provider ledgers | Hard to debug revenue/COGS/payouts | Add ledgers for payments, transfers, provider orders. |

## Security Findings

### Strengths

- RLS is explicitly enabled for public tables in `supabase/migrations/202607040002_rls_policy_hardening.sql`.
- Owner/admin policies exist for artists, products, product images, product colors, product designs, orders, and cash-outs.
- `product_designs` has a trigger validating `artist_id` matches the product's artist.
- Storage policies constrain artist product image writes to product-owned folders.
- Upload validation limits image MIME types and size for product/admin image flows.
- Public APIs generally use anon clients where possible; admin API routes use `requireAdmin`.

### Gaps

- Production dependency vulnerabilities are unresolved.
- In-memory rate limiting is not sufficient across serverless instances.
- No persisted audit log for admin/product/order/payout actions.
- No webhook event ledger or idempotent processing queue.
- Local `.env.local` contains live-looking secrets in the workspace. Treat any shared/local leaked values as compromised before production.
- `create_artist_cash_out` remains an authenticated security-definer RPC by design. It validates ownership, but future payout logic should move external money movement to server-owned payment code with a ledger and idempotency key.
- SVG upload is not supported, which is currently safer. If SVG is required later, it needs sanitization/conversion before storage or rendering.

## Performance Findings

- Production build passes.
- Shared first-load JS is about 239 kB, which is high for a commerce storefront.
- Many pages are dynamic server-rendered. This is acceptable for authenticated/admin pages, but public product/category routes should have an explicit caching/revalidation strategy.
- Raw `<img>` usage appears in public and admin components, causing Next image optimization and accessibility warnings.
- Product list routes repeat mapping patterns and may benefit from DB views/RPCs with pagination and consistent indexes as catalogue size grows.

## Product Designer Recommendation

Recommended V1 direction: constrained, template-first designer using `react-konva`/Konva.

Why not tldraw for V1: tldraw is excellent for collaborative infinite whiteboards, but MerchTent needs a constrained product customizer with safe zones, provider template coordinates, predictable export, and strict layer validation. A whiteboard-style surface adds flexibility where the product needs guardrails.

Why not Fabric.js as the first choice: Fabric is powerful and mature for canvas editing, but it tends to create a more editor-specific serialization/integration layer. It remains viable if the team already prefers it, but React integration and future UI state tend to be simpler with Konva in this app.

Recommended designer data model:

- `product_templates`: provider, provider_product_id, kind, title, active flag, base cost, default currency.
- `product_template_variants`: template_id, provider_variant_id, size, color, SKU, cost, availability.
- `print_areas`: template_id, side, coordinate system, x, y, width, height, safe zone, dpi requirements.
- `design_assets`: artist_id, storage path, MIME type, dimensions, checksum, original filename.
- `product_designs`: product_id, template_id, version, design JSON, validation status.
- `product_design_layers`: optional normalized layer rows if reporting/searching becomes important.
- `rendered_mockups`: product_id/design_id, side, color, preview path.
- `production_files`: design_id/order_item_id, side, print-ready path, provider submission status.

V1 designer scope:

- Choose one or two product templates only.
- Front print area first; back print can follow once order routing works.
- Upload PNG/JPEG/WebP, add text if needed, transform within safe area, preview, set price, publish.
- Store original assets separately from generated mockups.
- Validate all layers fit within print area before publishing.
- Defer arbitrary SVG, advanced typography, bulk variants, embroidery, collaboration, and full template marketplace.

## Stripe Connect Recommendation

Recommended V1 direction: Stripe Connect hosted onboarding plus separate charges and transfers.

Rationale:

- Current checkout can contain products from multiple artists. Separate charges and transfers allow the platform to collect one customer payment, split item-level earnings, and transfer after fulfilment/hold period.
- Hosted onboarding keeps bank/KYC details out of MerchTent and uses Stripe's account link flow.
- Destination charges can be revisited only if carts are restricted to one artist or checkout is split by artist.

Minimum data model:

- Add Connect fields to `artists`: `stripe_account_id`, onboarding status, charges enabled, payouts enabled, details submitted, disabled reason, last synced.
- Add `payment_events`/`stripe_webhook_events` for idempotent event receipt.
- Add `artist_earnings` or `order_item_earnings` rows for item-level earnings.
- Add `artist_transfers`: artist_id, order_id/order_item_id, Stripe transfer ID, amount, currency, status, idempotency key, reversal/refund links.
- Add `refunds`/`disputes` tracking with transfer reversal state.

Operational policy:

- Do not transfer funds on checkout completion.
- Transfer after fulfilment, after a configurable hold, or after admin approval for beta.
- Block product publishing or payout requests when Connect account is not payout-ready.
- Store and display a clear artist payout status in the dashboard.

## DevOps and Operations Findings

- CI exists and runs install, typecheck, lint, and build.
- No test execution exists because no test suite was found.
- No deployment config for Vercel/Supabase environments was observed beyond README env docs.
- No staging/prod migration gate was observed.
- No Sentry/PostHog/log drain integration was found.
- No queue/background worker was found for webhook follow-up work.
- No backup/restore runbook or Supabase PITR/backup policy was observed.

## Minimum Viable Release

For a controlled public beta with 10 artists:

1. Resolve production dependency audit findings.
2. Add Stripe Connect onboarding and payout-ready status.
3. Add a payout/transfer ledger, even if transfers are manually triggered at first.
4. Add one provider-backed product template with sizes/colors/costs and print area.
5. Upgrade the designer to enforce template print areas and save production-ready design data.
6. Gate product publishing on payout readiness, valid template, valid artwork, price/margin, and fulfilment mapping.
7. Persist Stripe webhook events and retry order creation/notification/fulfilment work.
8. Add basic fulfilment workflow: manual admin submission is acceptable for beta if tracked explicitly.
9. Add e2e smoke tests for signup, design product, publish, checkout test mode, webhook, and admin fulfilment.
10. Add monitoring/alerts for checkout failures, webhook failures, email/SMS failures, payout failures, and fulfilment failures.

## Strategic Recommendations

### Next 1-2 months

- Ship self-service onboarding and Connect readiness.
- Convert product creation from free-form manual entry to template-backed creation.
- Harden checkout/webhook/order lifecycle.
- Add minimal tests and monitoring.

### Next 3-6 months

- Integrate Printify or the selected fulfilment provider end to end.
- Add automated mockup generation and production file generation.
- Add reconciliation dashboards for Stripe, provider orders, artist earnings, refunds, and disputes.
- Improve SEO, product analytics, and artist conversion funnels.

### Next 12-24 months

- Build MerchTent as a provider-agnostic merch operating system: templates, products, fulfilment providers, payment ledgers, artist growth tools, and operational reporting.
- Support multi-provider fulfilment with routing rules by product, region, margin, and availability.
- Add artist lifecycle features: campaigns, drops, bundles, presales, tour-linked merch, fan CRM, and merch performance analytics.
- Add stronger compliance and finance operations: tax exports, refund/dispute automation, payout statements, and audit trails.

