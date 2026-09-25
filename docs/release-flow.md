# UAT and production release flow

## Environments

| Environment | Git branch | Domain | Vercel target |
| --- | --- | --- | --- |
| UAT | `uat` | `https://uat.merchtent.com.au` | Preview branch domain |
| Production | `main` | `https://www.merchtent.com.au` | Production |

The `main` branch remains Vercel's production branch. The persistent `uat`
branch is assigned its own domain and preview environment variables.

## Normal workflow

1. Create a feature branch from `uat`.
2. Open a pull request into `uat` and wait for CI and the Vercel preview.
3. Merge the feature into `uat` to update `uat.merchtent.com.au`.
4. Complete UAT using the checklist below.
5. Open a pull request from `uat` into `main`.
6. Merge only after approval and required checks pass. Vercel then deploys the
   exact tested commit to production.
7. Verify the production deployment and its operational health endpoint.

Pull requests into `main` fail the promotion-policy check unless their source
branch is `uat`. GitHub branch protection must also require pull requests and
the CI checks so direct pushes cannot bypass the policy.

## UAT checklist

- Key storefront, product, cart and checkout pages load.
- Artist sign-in and dashboard workflows operate correctly.
- Product creation, artwork placement and mockups behave as expected.
- Test-mode payment and order flows complete without touching live payments.
- Email, SMS, Printify and webhook integrations use approved UAT credentials.
- Database migrations have been tested against the UAT Supabase project.
- No unexpected browser, Vercel function or Sentry errors are present.

## Environment isolation

UAT must use Vercel variables scoped to the `uat` preview branch. At minimum,
set `NEXT_PUBLIC_SITE_URL=https://uat.merchtent.com.au` and use non-production
Stripe credentials. A separate Supabase project is preferred so UAT products,
orders and destructive tests cannot alter production data.

Production values remain scoped only to Vercel's Production environment. Never
copy secrets into the repository or expose server-side values through
`NEXT_PUBLIC_` variables.
