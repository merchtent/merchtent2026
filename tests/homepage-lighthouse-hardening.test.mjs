import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("homepage LCP image is eagerly loaded at high priority with deliberate compression", () => {
  const home = read("src/app/HomePageClient.tsx");
  assert.match(home, /priority fetchPriority="high" loading="eager" quality=\{65\}/);
  assert.match(home, /sizes="\(max-width: 639px\) 196px, 360px"/);
});

test("homepage image compression levels are enabled in Next Image", () => {
  const config = read("next.config.ts");
  assert.match(config, /qualities:\s*\[60, 65, 70, 75\]/);
});

test("Sentry ingest origins are included in the production content security policy", () => {
  const proxy = read("src/proxy.ts");
  assert.match(proxy, /process\.env\.NEXT_PUBLIC_SENTRY_DSN/);
  assert.match(proxy, /https:\/\/\*\.ingest\.us\.sentry\.io/);
  assert.match(proxy, /\.\.\.sentryOrigins/);
});

test("mobile cart control has a useful accessible name", () => {
  const header = read("src/components/HeaderClient.tsx");
  assert.match(header, /aria-label=\{count > 0 \? `Open cart with/);
});

test("homepage and footer audited colours clear their former contrast failures", () => {
  const home = read("src/app/HomePageClient.tsx");
  const footer = read("src/components/Footer.tsx");
  assert.doesNotMatch(home, /bg-\[#ef0000\]/);
  assert.match(home, /bg-\[#d60000\] text-white/);
  assert.doesNotMatch(footer, /text-neutral-500|text-red-50/);
});
