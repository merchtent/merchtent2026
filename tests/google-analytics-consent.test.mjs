import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
    return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("GA4 starts denied and only loads after analytics consent", () => {
    const layout = read("src/app/layout.tsx");
    const banner = read("src/components/ConsentBanner.tsx");

    assert.match(layout, /<ConsentBanner nonce=\{nonce\}/);
    assert.match(layout, /nonce=\{nonce\}/);
    assert.match(banner, /consent\?\.analytics === true/);
    assert.match(banner, /analyticsEnabled && GA4_MEASUREMENT_ID/);
    assert.match(banner, /googletagmanager\.com\/gtag\/js/);
    assert.match(banner, /nonce=\{nonce\}/);
});

test("GA4 consent choices map analytics and advertising independently", () => {
    const google = read("src/lib/marketing/google.ts");

    assert.match(google, /analytics_storage: consent\?\.analytics \? "granted" : "denied"/);
    assert.match(google, /ad_storage: consent\?\.marketing \? "granted" : "denied"/);
    assert.match(google, /ad_user_data: consent\?\.marketing \? "granted" : "denied"/);
    assert.match(google, /ad_personalization: consent\?\.marketing \? "granted" : "denied"/);
});

test("GA4 receives granted consent before the first consent-triggered page view", () => {
    const banner = read("src/components/ConsentBanner.tsx");
    const chooseStart = banner.indexOf("function choose(");
    const applyIndex = banner.indexOf("updateGoogleConsent(nextConsent)", chooseStart);
    const saveIndex = banner.indexOf("saveConsent({ analytics, marketing })", chooseStart);

    assert.ok(chooseStart > -1);
    assert.ok(applyIndex > chooseStart);
    assert.ok(saveIndex > applyIndex);
});

test("first-party events and page views also reach the GA4 bridge", () => {
    const events = read("src/lib/marketing/events.ts");
    const pageViews = read("src/lib/usePageView.ts");
    const google = read("src/lib/marketing/google.ts");

    assert.match(events, /trackGoogleAnalyticsEvent\(eventName, properties\)/);
    assert.match(pageViews, /trackGooglePageView\(path\)/);
    assert.match(google, /value_cents \/ 100/);
    assert.match(google, /send_page_view: false/);
    assert.match(google, /eventName === "artist_lead" \|\| eventName === "newsletter_signup"/);
});

test("visitors can reopen their privacy choices", () => {
    const banner = read("src/components/ConsentBanner.tsx");
    const button = read("src/components/PrivacyChoicesButton.tsx");
    const footer = read("src/components/Footer.tsx");

    assert.match(banner, /merch-tent:open-consent/);
    assert.match(button, /merch-tent:open-consent/);
    assert.match(footer, /PrivacyChoicesButton/);
});
