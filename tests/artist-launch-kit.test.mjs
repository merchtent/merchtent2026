import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("artist dashboard exposes a working launch kit", () => {
    const sidebar = read("src/app/dashboard/DashboardSidebar.tsx");
    const page = read("src/app/dashboard/launch-kit/page.tsx");
    const client = read("src/app/dashboard/launch-kit/LaunchKitClient.tsx");
    const actions = read("src/app/dashboard/launch-kit/actions.ts");
    const migration = read("supabase/migrations/202609250005_artist_launch_kit_progress.sql");

    assert.match(sidebar, /label: "Launch kit", href: "\/dashboard\/launch-kit"/);
    assert.match(page, /requireArtistPage\(\)/);
    assert.match(page, /products_with_first_image/);
    assert.match(page, /QRCode\.toDataURL/);
    assert.match(client, /Story graphic/);
    assert.match(client, /Short promo video/);
    assert.match(client, /drawAnimatedVideoFrame/);
    assert.match(client, /product\.images\.slice\(0, 3\)/);
    assert.match(client, /videoTrack\.requestFrame/);
    assert.match(client, /max-w-5xl/);
    assert.match(client, /htmlFor="launch-product" className="block/);
    assert.match(client, /Instagram/);
    assert.match(client, /TikTok/);
    assert.match(client, /Email/);
    assert.match(client, /Facebook/);
    assert.match(client, /Gig audience/);
    assert.match(client, /saveLaunchKitProgress/);
    assert.doesNotMatch(client, /localStorage/);
    assert.match(actions, /requireArtistAction\(\)/);
    assert.match(actions, /\.from\("launch_kit_progress"\)\.upsert/);
    assert.match(migration, /enable row level security/);
    assert.match(migration, /public\.owns_artist\(artist_id\)/);
});
