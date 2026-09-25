import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("designer exposes recent saved artwork for reuse", () => {
    const library = read("src/lib/products/artist-artwork-library.ts");
    const artworkData = read("src/lib/products/artwork-data.ts");
    const designer = read("src/app/dashboard/products/designer/DesignerClient.tsx");
    const newProductPage = read("src/app/dashboard/products/designer/[catalogKey]/page.tsx");
    const editPage = read("src/app/dashboard/products/[id]/edit/page.tsx");

    assert.match(library, /\.from\("product_designs"\)/);
    assert.match(artworkData, /record\.type === "image"/);
    assert.match(artworkData, /value\.startsWith\("designer-assets\/"\)/);
    assert.match(library, /Array\.from\(new Set\(paths\)\)/);
    assert.match(designer, /Recent artwork/);
    assert.match(designer, /addRecentArtwork/);
    assert.match(designer, /insertImageLayer\(asset\.path, image\)/);
    assert.match(newProductPage, /recentArtwork=\{recentArtwork\}/);
    assert.match(editPage, /recentArtwork=\{recentArtwork\}/);
});

test("artwork gallery only unlocks removal after every linked product is archived", () => {
    const library = read("src/lib/products/artist-artwork-library.ts");
    const action = read("src/app/dashboard/images/actions.ts");
    const page = read("src/app/dashboard/images/page.tsx");
    const gallery = read("src/app/dashboard/images/ArtworkGalleryClient.tsx");
    const products = read("src/app/dashboard/products/page.tsx");
    const deletedProducts = read("src/app/dashboard/products/deleted/page.tsx");
    const sidebar = read("src/app/dashboard/DashboardSidebar.tsx");

    assert.match(library, /usage\.isArchived && !usage\.isPublished && !usage\.isRecoverable/);
    assert.match(action, /14-day recovery window/);
    assert.match(action, /storage\.from\("product-images"\)\.remove\(\[path\]\)/);
    assert.match(page, /Artwork gallery/);
    assert.match(gallery, /\/dashboard\/products\"\}#product-/);
    assert.match(products, /id=\{`product-\$\{p\.id\}`\}/);
    assert.match(products, /target:ring-2/);
    assert.match(deletedProducts, /id=\{`product-\$\{product\.id\}`\}/);
    assert.match(sidebar, /label: "Artwork gallery"/);
});
