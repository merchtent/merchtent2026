# Merch Tent marketing, SEO and advertising audit

Audit date: 19 September 2026
Scope: current local Next.js implementation, rendered desktop/mobile homepage, public-route metadata, structured data, crawl controls, first-party analytics and advertising readiness. This is a pre-launch implementation audit, not a Search Console, Merchant Center, ad-account or production Core Web Vitals audit.

## Implementation update — 19 September 2026

The ten remediation items from this audit have now been implemented in the application code:

- Unverified countdowns, stock quantities, testimonials, ratings, social posts, artist quotations and fallback prices were removed or replaced with explicit live-data empty/loading states.
- A consent-aware, first-party conversion event model now covers catalogue and product views, product selection, add to cart, checkout, purchase, account signup, artist lead, artist activation and newsletter signup.
- First/last-touch UTMs and supported advertising click IDs are captured and carried into subscriber, profile and order records.
- Checkout success now verifies the Stripe session and emits a transaction-aware, order-ID-deduplicated purchase with value, currency and line items.
- `/start` is the canonical artist-acquisition landing page with dedicated search metadata and transparent estimated economics.
- Canonicals and metadata were filled across public routes; archive/account/checkout surfaces are excluded where appropriate.
- Journal routing and metadata were repaired. The journal and article pages are temporarily `noindex, follow` and excluded from the sitemap while the existing sample entries await editorial verification.
- The Merchant Center feed now provides improved image, category, availability, colour, apparel and shipping attributes from catalogue data without inventing stock or variants.
- The homepage now leads with “Shop the scene,” uses “Sell merch” second, and defers fan account signup.
- Product and artist-review UI is backed by verified fulfilled-order eligibility, with honest zero states. Post-delivery review-request notifications remain a deliberately separate lifecycle project.

The two Supabase migrations were applied to the linked project on 19 September 2026. Live verification passed 15/15 checks covering schema availability, event and subscriber attribution persistence, purchase deduplication, anonymous access controls, review eligibility protection and test-record cleanup. Production consent/tag destinations, Merchant Center account-level shipping/return settings and paid-channel test purchases remain outstanding.

## Post-remediation scorecard

Re-audit date: 19 September 2026
Overall marketing, SEO and advertising readiness: **82/100**, up from **58/100**.

| Area | Before | Now | Remaining deduction |
|---|---:|---:|---|
| Brand and creative | 82 | 86 | Strong identity; genuine campaign creative and artist proof still need to accumulate |
| On-page conversion | 65 | 88 | Clearer shop/artist hierarchy; production funnel testing and behavioural data are still absent |
| Technical SEO | 74 | 90 | Metadata, canonicals and crawl controls are strong; production Search Console and Core Web Vitals remain unverified |
| Content SEO | 46 | 64 | Journal risk is contained, but verified editorial depth and case studies are still thin |
| Analytics and attribution | 28 | 86 | Complete first-party event/attribution foundation; migrations and external tag destinations still need production activation |
| Paid advertising readiness | 32 | 78 | Feed and purchase payloads are materially improved; Merchant Center diagnostics and paid-channel test orders remain outstanding |
| Trust and compliance | 52 | 90 | Fabricated proof and scarcity are removed; verified reviews and case studies need real customer volume |

The score deliberately does not assume that local migrations are deployed, ad accounts are configured, Merchant Center has accepted the feed, or production conversions have been observed. Completing those activation steps should move readiness into the high 80s. Reaching 90+ requires real proof: verified reviews, genuine artist case studies, production Core Web Vitals, Search Console performance, and stable paid-channel purchase attribution.

### Highest-value remaining work

1. Configure GA4/Google Ads/Meta destinations behind consent, then complete channel-specific test purchases and reconcile them to Stripe and the order database.
2. Complete an authenticated review test with a controlled delivered test order during the next checkout lifecycle test.
3. Submit and validate the Merchant Center feed, including account-level shipping and return policies and variant diagnostics.
4. Build the post-delivery review request and reminder lifecycle, with suppression and request-to-review measurement.
5. Replace or remove the existing journal samples, then re-enable indexing with genuine artist stories and case studies.
6. Establish a weekly acquisition dashboard covering sessions, product-view rate, add-to-cart rate, checkout rate, purchase rate, CAC, artist lead rate and artist activation rate.

## Executive assessment

Merch Tent has a distinctive, credible visual identity and a technically solid ecommerce SEO base. The strongest assets are the clear scene-specific positioning, indexable server-rendered product and artist pages, dynamic sitemap, Product/Offer schema, breadcrumbs, and a Google Merchant feed.

The main constraint is measurement and trust, not design. The application records page views but does not implement a usable paid-media event model, campaign attribution, consent-aware ad tags, or purchase conversion tracking. In addition, fallback content creates apparently real countdowns, stock scarcity, reviews, ratings and social proof. That content must not appear as genuine evidence when it is illustrative.

Indicative readiness scores:

| Area | Score | Assessment |
|---|---:|---|
| Brand and creative | 82/100 | Memorable, relevant and visually differentiated |
| On-page conversion | 65/100 | Strong hero, but two audiences and three competing primary actions |
| Technical SEO | 74/100 | Good base; metadata gaps and crawl-quality issues remain |
| Content SEO | 46/100 | Thin editorial footprint and inconsistent page targeting |
| Analytics and attribution | 28/100 | Page views only; insufficient for optimisation or paid media |
| Paid advertising readiness | 32/100 | Merchant feed exists, but conversion and trust prerequisites are incomplete |
| Overall launch readiness | 58/100 | Suitable for controlled organic beta; not ready for scaled ad spend |

## Priority findings

### P0 — Resolve before public launch or advertising

1. **Remove or qualify simulated urgency and social proof.** The homepage fallback UI renders countdown-style labels, fixed “12/17/22/27 left” inventory, a 4.8 rating, named fan quotes, community handles and artist quotations when live data is missing. If these are not verified, they create the impression of real scarcity and customer experience. Replace them with honest empty states such as “First drops coming soon,” label demonstrations as examples, and show ratings only after genuine reviews exist. Australian advertising guidance requires claims and testimonials to be truthful; the ACCC specifically identifies false scarcity, false countdowns and fake reviews as problematic.

2. **Build conversion tracking before buying traffic.** Current first-party analytics records path, referrer, user agent and a local session ID, but no ecommerce events or campaign parameters. Implement, at minimum: `view_item_list`, `select_item`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase`, `sign_up`, `artist_lead`, `newsletter_signup` and outbound social clicks. Every purchase event needs transaction ID, value, currency and item data, deduplicated between browser and server.

3. **Persist acquisition attribution.** Capture UTMs, `gclid`, `gbraid`, `wbraid`, Meta click IDs and landing page on first touch and last non-direct touch. Attach them to newsletter leads, account creation and orders. The newsletter endpoint accepts an `utm` field, but the homepage form does not send it; the page-view table does not capture query parameters.

4. **Make the success page transaction-aware.** `/checkout/success` clears the cart but contains no conversion tag or transaction payload. Do not fire purchase conversion from a generic page view. Load a verified order/session once, send a stable transaction ID and value, and prevent duplicate events on refresh.

5. **Add privacy/consent implementation before ad pixels.** There is no consent interface or consent-mode implementation in the inspected code. Decide the served geographies and obtain legal advice on the required consent model. If Google advertising reaches EEA users, configure Consent Mode signals; do not load remarketing/personalisation tags indiscriminately.

### P1 — Complete in the first launch sprint

6. **Choose one primary homepage conversion.** The first screen presents “Shop the scene,” “Start as artist,” and “Start as fan” at equal weight. The brand proposition also serves buyers and artists simultaneously. Keep “Shop the scene” primary on the marketplace homepage and make “Sell merch” the secondary path. Move fan account creation downstream until users save, buy or earn credits; it is not a compelling cold-traffic action.

7. **Create a dedicated artist acquisition landing page.** `/start` has strong content but inherits the generic site title and description because it exports no metadata. Target a page such as “Print-on-demand band merch Australia — no upfront stock,” add proof, exact economics, fulfilment regions/times, FAQs, artist examples and a single signup CTA. Use this page—not the mixed homepage—for artist-search and social campaigns.

8. **Fix metadata gaps.** Important public routes without their own metadata include `/start`, `/editors`, `/journal/[slug]`, `/sustainability`, `/size-guide`, `/privacy`, `/terms` and `/categories/artists`. The homepage also emits no canonical link. Add unique titles, descriptions, canonical URLs, Open Graph/Twitter data, and appropriate robots directives. `/home-archive` should be removed from public routing or set to `noindex` and canonicalise to `/`.

9. **Repair the journal as an organic acquisition channel.** The inspected journal detail page uses hard-coded sample entries, has no `generateMetadata`, and links to `/journal` even though no journal index page was found. Artist buttons point to `/artist/...` while live profiles use `/artists/...`. Build a journal index, dynamic article metadata/schema, correct artist relationships and real content before indexing journal URLs.

10. **Improve Merchant Center data quality.** The feed is a strong start, but uses a fixed `in_stock` value, fixed AU shipping cost, artist as brand, and `identifier_exists=no` for every item. Add variant attributes relevant to apparel (`size`, `color`, `gender`, `age_group`, item group IDs), accurate availability, consistent landing-page prices, additional images, Google product categories and shipping/return settings aligned with Merchant Center. Submit the feed and resolve diagnostics before Performance Max or Shopping campaigns.

11. **Add organisation-level return and shipping policy schema.** Product markup already includes `Offer`, shipping and a no-returns policy. Confirm that “returns not permitted” accurately reflects Australian Consumer Law guarantees and the published policy. Add complete merchant return policy/shipping details at the store level where appropriate, and validate representative product URLs with Google's Rich Results Test.

12. **Strengthen trust at purchase decision points.** Add concise delivery estimates, production time, returns/consumer-guarantee language, accepted payment methods, secure checkout cues, real contact details and “artist receives $X / Y%” where it can be stated accurately. Put these adjacent to the product buy box and artist signup CTA, not only in footer/legal pages.

### P2 — Growth work after measurement is reliable

13. **Build search demand clusters.** Create useful landing/editorial content around Australian band merch, local band T-shirts, artist-specific merch, how bands sell merch without inventory, merch pricing/profit, print quality, artwork preparation, tour merch and sustainable/made-to-order production. Avoid mass-generated thin category copy. Each piece should lead naturally to an artist, product or artist signup.

14. **Increase internal linking and discovery.** Link journal articles to named artists/products/categories, product pages back to artist profiles and relevant guides, and artist pages to genre/location/editorial hubs. Google primarily infers ecommerce hierarchy through crawlable links, not URL shape alone.

15. **Develop verified proof.** Replace generic endorsements with attributable artist case studies: launch date, products, units/revenue where permission is granted, time saved and artist quote. Use verified-purchase product reviews and explain moderation. Proof will improve both conversion and ad creative.

16. **Segment lifecycle email.** The existing signup should offer a clear promise and consent copy. Separate fans from artists at capture. Suggested flows: fan welcome/drop alerts/cart recovery/post-purchase/review request; artist welcome/profile completion/first-product activation/first-sale/reactivation. Record source and campaign on every subscriber.

17. **Create campaign-specific landing pages and creative.** Do not send all ads to the homepage. Suggested starting campaigns:
    - High-intent search for artists → artist acquisition page.
    - Artist/genre/product search → relevant artist, category or product page.
    - Meta/TikTok prospecting → authentic artist story or drop page.
    - Dynamic remarketing → product/artist viewed, after consent and adequate audience size.

## SEO implementation detail

### What is already good

- Server-rendered product, artist and category routes.
- Dynamic sitemap including public products, artists and published journal entries.
- Robots rules exclude account, admin, checkout, order and API surfaces.
- Product pages include Product/Offer data, availability, price, seller, shipping, return policy, aggregate rating when ratings exist, and breadcrumb schema.
- Artist pages have dynamic metadata and structured data.
- Category pages have unique metadata and breadcrumbs.
- Root `WebSite` and `OnlineStore` structured data is present.
- A Google Merchant XML feed exists.
- Images generally use Next Image and meaningful alt text for content images.

### Technical corrections

- Add an explicit homepage canonical.
- Add `noindex` metadata to internal/private page layouts as defence in depth; robots disallow alone does not guarantee removal if URLs are discovered externally.
- Ensure unknown category slugs return 404 rather than generating indexable arbitrary pages.
- Ensure unavailable/private product and artist records return a true 404/410 and are removed from the sitemap promptly.
- Add `lastModified` for artists and static/editorial pages where data supports it.
- Keep sitemap URLs and metadata canonical URLs on the production HTTPS hostname; deployment must not use the local default.
- Add article schema and metadata for real journal posts.
- Consider `ItemList` schema on category pages only when it faithfully represents visible products; do not add schema merely for volume.
- Use multiple high-resolution product image aspect ratios where available; Google recommends crawlable 1:1, 4:3 and 16:9 images for best product-result coverage.
- Validate structured data after deployment and monitor Merchant listings and Product snippets reports in Search Console.

### Content and keyword architecture

Recommended intent map:

| Intent | Primary page | Example theme |
|---|---|---|
| Buy generic merch | Category | Australian band tees / local band hoodies |
| Buy known artist | Artist profile | `[Artist] official merch Australia` |
| Buy known product | Product page | `[Artist] [design] tee` |
| Discover artists | Artists/editorial hub | Australian local bands and merch |
| Artist wants a platform | Artist acquisition page | sell band merch without upfront stock |
| Artist needs education | Guides/case studies | band merch pricing, designs, fulfilment |

Do keyword research with Search Console and a keyword tool after launch; do not lock the architecture to assumed volumes. Artist names and genuine long-tail product queries are likely to be the fastest early organic wins.

## Conversion and UX observations

- Desktop creative is excellent, but at the tested 1265×720 viewport the hero CTAs were below the fold; users see the proposition but not the action without scrolling. Reduce desktop hero type/height or lift the CTA group.
- Mobile presentation is much stronger: all three CTAs are visible in the first viewport, there is no horizontal overflow, and the hierarchy reads clearly.
- “Build the drop. Back the band.” is memorable but not self-explanatory. Keep the line, then make the supporting sentence more explicit: “Shop official Australian band merch—or launch your own with no upfront stock.”
- The homepage is very long and repeats several product/artist/scene sections. After analytics is installed, test a shorter path: hero → live products → how it works/trust → featured artists → email capture.
- The search field is prominent on desktop; track searches, zero-result terms, search-to-product clicks and conversion. Use the query data to guide categories and content.
- “Fan account” is a feature-led CTA. Frame the benefit (“Earn credits on every drop”) or defer account creation until intent exists.
- Newsletter copy is on-brand, but it needs visible consent/privacy context and campaign attribution. Consider email-only capture initially; asking for name adds friction without a clear immediate use.

## Measurement plan

### North-star and funnel metrics

Marketplace:

- Qualified product-detail sessions.
- Add-to-cart rate.
- Checkout-start rate.
- Purchase conversion rate.
- Revenue, gross margin and artist payout per session/order.
- New versus returning buyer rate.
- Repeat purchase within 30/60/90 days.

Artist growth:

- Artist landing-page conversion.
- Signup → profile completion.
- Profile → first product draft.
- Draft → published product.
- Published artist → first sale.
- Time to first published product and first sale.

### Event requirements

Use a consistent data layer so first-party analytics, GA4 and ad platforms receive the same event names and item/order IDs. Do not send raw sensitive personal data in analytics events. If enhanced conversions are used, follow the platform's hashing, consent and policy requirements. Verify events in browser/server logs and ad-platform diagnostics before launch.

Create a weekly dashboard by source/medium/campaign, landing page, device and new/returning user. Report contribution margin or at least gross profit alongside ROAS; revenue-only optimisation can scale unprofitable orders.

## Suggested advertising rollout

### Gate 1 — No spend

- Remove simulated proof/urgency.
- Verify policies, pricing, shipping and fulfilment claims.
- Implement and test conversion events and attribution.
- Validate feed and product schema.
- Establish baseline organic/direct funnel performance.

### Gate 2 — Controlled tests

- Start with branded search and small high-intent artist-acquisition search campaigns.
- Run a small catalog/remarketing test only after consent and purchase tracking are verified.
- Use tightly matched landing pages and exclude irrelevant queries aggressively.
- Judge tests on qualified conversions and contribution margin, not clicks or page views.

### Gate 3 — Scale

- Expand non-brand product/category search where inventory and conversion data support it.
- Test authentic artist-led short video for Meta/TikTok.
- Build lookalike/customer-match activity only with appropriate consent and sufficient clean first-party data.
- Scale winning artist/drop creative, not a single generic brand ad.

## 30/60/90-day action plan

### Days 0–30

- Remove unverified countdowns, stock counts, ratings, reviews and testimonials.
- Implement event schema, transaction-safe purchase tracking and UTM/click-ID storage.
- Decide consent and tag architecture.
- Add `/start` metadata, homepage canonical, missing public-page metadata and `noindex` for archive/internal pages.
- Fix journal routing/metadata or keep journal pages out of the sitemap until real.
- Validate top product/artist/category pages in Search Console and Rich Results Test.
- Configure Merchant Center feed and diagnostics.

### Days 31–60

- Publish the dedicated artist landing page plus 3–5 high-quality guides/case studies.
- Add verified trust proof and clearer product delivery/returns information.
- Launch segmented welcome and abandonment lifecycle emails.
- Run small branded/high-intent campaigns with explicit CAC and margin guardrails.
- Establish weekly acquisition and activation reporting.

### Days 61–90

- Expand content based on Search Console queries and onsite search data.
- Run homepage CTA/hierarchy and artist landing-page offer tests.
- Introduce catalog remarketing and broader artist-led creative only if tracking is stable.
- Review cohorts, repeat rate, artist activation and contribution margin; scale channels that create retained buyers and publishing artists.

## Reference guidance

- [Google: merchant listing structured data](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing)
- [Google: ecommerce site structure](https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure)
- [Google Ads: website conversion tracking](https://support.google.com/google-ads/answer/7521212)
- [Google Ads: enhanced conversions](https://support.google.com/google-ads/answer/13258081)
- [Google Ads: consent mode reference](https://support.google.com/google-ads/answer/13802165)
- [ACCC: false or misleading claims](https://www.accc.gov.au/consumers/advertising-and-promotions/false-or-misleading-claims)
- [ACCC: online reviews](https://www.accc.gov.au/business/advertising-and-promotions/online-reviews-for-product-and-services)
- [ACCC: environmental and sustainability claims](https://www.accc.gov.au/business/advertising-and-promotions/environmental-and-sustainability-claims)

## Audit limitations

This review did not have access to the production domain, Search Console, Merchant Center, GA4, Google Ads, Meta Ads, email-delivery metrics, keyword-volume data or real order economics. Performance observations came from a local development server and are not substitutes for production Lighthouse or field Core Web Vitals. A production follow-up should include index coverage, query/page performance, rich-result validity, feed diagnostics, tag diagnostics, consent behavior, real-device Core Web Vitals and end-to-end purchase attribution.
