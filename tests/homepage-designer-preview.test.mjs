import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/app/HomePageClient.tsx", import.meta.url), "utf8");

test("homepage designer preview shows reusable recent artwork instead of unsupported graphics", () => {
    assert.match(source, /label: "Recent image"/);
    assert.match(source, /icon: History/);
    assert.doesNotMatch(source, /"Graphics"/);
});
