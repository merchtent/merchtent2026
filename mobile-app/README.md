# Merch Tent mobile

This is a React Native app with native screens for Android and iPhone. It does not embed the website in a WebView. It shares the website's Supabase accounts, database, product catalogue, and a new authenticated product creation API.

## Implemented

- Email/password sign-in using existing Merch Tent accounts.
- Artist product list and detail editing, plus camera/gallery photo selection and manual product draft or review submission.
- Native shop catalogue and product detail, fan credit balance/activity, order list, and account screen.
- Product creation and editing use `POST /api/mobile/products` and `PATCH /api/mobile/products/:id` on the Next.js backend. The backend checks the bearer token, artist account, ownership, rate limits, and image contents before writing. Submitted products use the existing `pending_review` state.

## Run on Android

1. Copy `.env.example` to `.env` and set the live HTTPS website URL and the **public** Supabase URL and anon key from the website's environment. Never put the service role key here.
2. Install dependencies with `npm install`, then use `npx expo install --fix` to align native package versions with the installed Expo SDK.
3. Run `npx expo start --android`, or use an EAS development build on a physical Android device.
4. Deploy the website's new `/api/mobile/products` route before trying product creation from the phone.

The website build and the mobile app are separate projects. The root `tsconfig.json` excludes `mobile-app`, so each has its own typecheck.

## Remaining before a public release

- The shop catalogue and product detail screens are native; choosing options and checkout opens the existing website. Native cart, checkout, full product designer, image editing, onboarding, password reset, and notifications still need dedicated mobile flows.
- The photo creator currently makes a **manual product**. It does not turn a backstage photo into a print-ready tee. Live Drop needs a mobile designer, print quality checks, fulfilment setup, and a fast approval path.
- Set final app artwork, package identifiers, signing, privacy disclosures, and store metadata. Test auth, upload, review, orders, credits, and checkout on real devices.
