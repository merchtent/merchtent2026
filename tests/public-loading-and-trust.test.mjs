import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homepage = readFileSync(new URL("../src/app/HomePageClient.tsx", import.meta.url), "utf8");
const skeletons = readFileSync(new URL("../src/components/shop/ContentSkeletons.tsx", import.meta.url), "utf8");
const trustEvidence = readFileSync(new URL("../src/lib/trust-evidence.ts", import.meta.url), "utf8");

test("public catalogue loading uses structural skeletons instead of repeated loading copy", () => {
    assert.doesNotMatch(homepage, /Loading drop|Artist loading|Loading product/);
    assert.match(homepage, /ProductCardSkeleton/);
    assert.match(homepage, /ArtistCardSkeleton/);
    assert.match(homepage, /JournalCardSkeleton/);
    assert.match(skeletons, /aspect-\[4\/4\.5\]/);
    assert.match(skeletons, /motion-safe:animate-pulse/);
});

test("customer trust promises have one reusable source", () => {
    assert.match(trustEvidence, /Usually 2–3 business days/);
    assert.match(trustEvidence, /Completed orders only/);
    assert.match(trustEvidence, /fully replaced at no cost/);
});
