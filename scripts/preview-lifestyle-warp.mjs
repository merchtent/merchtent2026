import { readFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { getLifestyleMockupTemplates } from "../src/lib/products/mockup-templates.ts";
import { warpArtworkOntoPhoto } from "../src/lib/products/lifestyle-warp.ts";

const productKey = process.argv[2] ?? "printify-gildan-64000-softstyle-tee";
const templates = getLifestyleMockupTemplates({ key: productKey }, "#111111");
if (templates.length === 0) throw new Error(`Lifestyle templates are missing for ${productKey}.`);
const artworkBySide = Object.fromEntries(await Promise.all(["front", "back"].map(async (side) => {
    const testArt = Buffer.from(`
        <svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
            <rect x="28" y="35" width="544" height="730" rx="30" fill="${side === "front" ? "#e7ff54" : "#ff6d72"}"/>
            <text x="300" y="310" text-anchor="middle" fill="#151515" font-family="Arial" font-size="103" font-weight="900">${side.toUpperCase()}</text>
            <text x="300" y="440" text-anchor="middle" fill="#151515" font-family="Arial" font-size="103" font-weight="900">PRINT</text>
            <path d="M110 555 L490 555" stroke="#151515" stroke-width="34"/>
        </svg>
    `);
    return [side, await sharp(testArt).ensureAlpha().raw().toBuffer({ resolveWithObject: true })];
})));
for (const template of templates) {
    const photoBuffer = await readFile(path.join(process.cwd(), "public", template.publicPath.slice(1)));
    const photo = await sharp(photoBuffer).resize(template.imageWidth, template.imageHeight).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const overlay = warpArtworkOntoPhoto(
        { data: photo.data, width: photo.info.width, height: photo.info.height },
        { data: artworkBySide[template.side].data, width: artworkBySide[template.side].info.width, height: artworkBySide[template.side].info.height },
        template.printMesh
    );
    const output = path.join(tmpdir(), `merch-tent-lifestyle-warp-${template.id}.png`);
    await sharp(photoBuffer)
        .composite([{ input: overlay, raw: { width: template.imageWidth, height: template.imageHeight, channels: 4 }, left: 0, top: 0 }])
        .png()
        .toFile(output);
    console.log(output);
}
