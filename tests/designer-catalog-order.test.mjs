import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("designer product choices use the requested garment order", () => {
    const chooser = read("src/app/dashboard/products/designer/CatalogChooser.tsx");

    assert.match(chooser, /tee: 0,[\s\S]*hoodie: 1,[\s\S]*tank: 2,[\s\S]*hat: 3,[\s\S]*bag: 4,[\s\S]*poster: 5/);
    assert.match(chooser, /filteredProducts\.map\(\(product\) =>/);
});

test("the designer catalogue search filters products and can be cleared", () => {
    const chooser = read("src/app/dashboard/products/designer/CatalogChooser.tsx");

    assert.match(chooser, /const \[query, setQuery\] = useState\(""\)/);
    assert.match(chooser, /placeholder="Search products, brands or colours"/);
    assert.match(chooser, /product\.colors\.flatMap/);
    assert.match(chooser, /filteredProducts\.length === 0/);
    assert.match(chooser, /onClick=\{\(\) => setQuery\(""\)\}/);
});

test("products with chargeable additional print areas show a From RRP", () => {
    const chooser = read("src/app/dashboard/products/designer/CatalogChooser.tsx");

    assert.match(chooser, /availablePrintAreas > includedPrintSides && additionalPrintSideRetailCents > 0/);
    assert.match(chooser, /hasVariableRrp\(product\) \? "From" : "RRP"/);
    assert.match(chooser, /hasVariableRrp\(product\) \? " RRP" : ""/);
});

test("the designer presents product specifications without supplier blank jargon", () => {
    const designer = read("src/app/dashboard/products/designer/DesignerClient.tsx");

    assert.match(designer, /\["blank", ClipboardList, "Specs"\]/);
    assert.match(designer, /Product specs/);
    assert.match(designer, /Specifications/);
    assert.doesNotMatch(designer, />Blank</);
    assert.doesNotMatch(designer, /Catalogue blank/);
});

test("the designer stacks size measurements vertically without a wide scrolling table", () => {
    const designer = read("src/app/dashboard/products/designer/DesignerClient.tsx");

    assert.match(designer, /measurements\.map\(\(item\) => \([\s\S]*<section key=\{item\.size\}/);
    assert.match(designer, /grid-cols-\[minmax\(0,1fr\)_auto\]/);
    assert.doesNotMatch(designer, /min-w-\[720px\]/);
    assert.doesNotMatch(designer, /mt-4 overflow-x-auto/);
});

test("only colours with product imagery are selectable in the initial designer", () => {
    const designer = read("src/app/dashboard/products/designer/DesignerClient.tsx");

    assert.match(designer, /hasDesignerProductPreview/);
    assert.match(designer, /disabled=\{!hasPreview\}/);
    assert.match(designer, /needs a product preview image/);
    assert.match(designer, /All \{catalogProduct\.colors\.length\} colours can be sold/);
    assert.match(designer, /Available · no preview/);
    assert.match(designer, /Choose the full range later under Colours to sell/);
    assert.match(designer, /activeView === "colors"[\s\S]*catalogProduct\.colors\.map/);
});
