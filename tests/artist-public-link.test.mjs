import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("artist dashboard links public pages by canonical slug", async () => {
    const profilePage = await read("src/app/dashboard/artist/page.tsx");
    assert.match(profilePage, /href={`\/artists\/\${artist\.slug}`}/);
    assert.doesNotMatch(profilePage, /href={`\/artists\/\${artist\.id}`}/);
});

test("public artist pages retain UUID link compatibility and redirect to the slug", async () => {
    const artistPage = await read("src/app/artists/[id]/page.tsx");
    assert.match(artistPage, /UUID_PATTERN\.test\(id\)/);
    assert.match(artistPage, /artistQuery\.or\(`slug\.eq\.\${id},id\.eq\.\${id}`\)/);
    assert.match(artistPage, /redirect\(`\/artists\/\${artist\.slug}`\)/);
});
