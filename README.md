# Merch Tent

Merch Tent is a Next.js commerce platform for artist merchandise, storefront browsing, artist dashboards, admin fulfilment, Stripe checkout, email notifications, SMS notifications, and artist cash-outs.

## Tech Stack

- Next.js 16 App Router
- React 19
- Supabase Auth, Postgres, Storage, and RPC
- Stripe Checkout and webhooks
- Postmark transactional email
- Tailwind CSS 4

## Local Setup

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Environment

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
POSTMARK_SERVER_TOKEN=
POSTMARK_FROM=
POSTMARK_ADMIN_TO=
POSTMARK_TEST_SECRET=
MOBILEMESSAGE_USERNAME=
MOBILEMESSAGE_PASSWORD=
PRINTIFY_API_TOKEN=
PRINTIFY_SHOP_ID=
PRINTIFY_DEFAULT_BLUEPRINT_ID=
PRINTIFY_DEFAULT_PRINT_PROVIDER_ID=
PRINTIFY_DEFAULT_VARIANT_IDS=
OPERATIONAL_HEALTH_SECRET=
```

Do not commit `.env*` files.

## Verification

```bash
npm run typecheck
npm run lint
npm run test
npm run audit:prod
npm run env:check:prod
npm run build
```

`npm run verify` runs typecheck, lint, and production invariant tests. `npm run release:check` runs verify, production dependency audit, production environment validation, and the Next.js production build. `npm run env:check:prod` validates required production configuration before deployment.

## Database

Supabase migrations live in `supabase/migrations`.

Apply and review migrations before production deployment. The production hardening migration adds:

- order/tracking indexes
- product lookup indexes
- customer order RLS policy
- artist payout RLS policies
- transactional `create_artist_cash_out` RPC

## Critical Workflows

- Checkout must price cart items from trusted database product rows, not browser cart values.
- Customer order pages must filter by authenticated `user_id`.
- Admin APIs must use `requireAdmin()` from `src/lib/auth/admin.ts`.
- Product and artist image uploads must pass `validateImageFile()`.
- Cash-outs must go through `create_artist_cash_out`.

## Deployment Notes

- Run `npm run build` before deploy.
- Configure Stripe webhooks to call `/api/stripe/webhook`.
- Keep `/api/test-postmark` unavailable in production; it returns 404 when `NODE_ENV=production`.
- Monitor Stripe webhook failures, Postmark failures, SMS failures, and cash-out RPC errors.
