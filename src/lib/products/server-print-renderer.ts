import "server-only";

import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import sharp, { type OverlayOptions, type Sharp } from "sharp";
import { getLifestyleMockupTemplates, getMockupTemplate, type LifestyleModelSetId } from "@/lib/products/mockup-templates";
import { clipMockupPlacement, mapCanvasRectToMockupPlacement } from "@/lib/products/mockup-placement";
import { warpArtworkOntoPhoto } from "@/lib/products/lifestyle-warp";
import {
    DESIGN_CANVAS_HEIGHT,
    DESIGN_CANVAS_WIDTH,
    resolveGeometryRect,
    type GeometryRect,
    type PixelRect,
} from "@/lib/products/design-geometry";
import { getServiceSupabase } from "@/lib/supabase/service";
import { decodeStrictBase64ImagePayload, validateImageBytes } from "@/lib/uploads";
import { logger } from "@/lib/logger";
import type { PosterFormat } from "@/lib/products/poster-formats";

type Side = "front" | "back";

type DesignerLayer = {
    id: string;
    side: Side;
    type: "image" | "text";
    x: number;
    y: number;
    width?: number;
    height?: number;
    rotation?: number;
    opacity?: number;
    text?: string;
    fill?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    src?: string;
    hidden?: boolean;
};

type PrintArea = GeometryRect;

export type DesignerPayload = {
    printAreas: Record<Side, PrintArea>;
    layers: DesignerLayer[];
    catalogProduct?: {
        key?: string;
        brand?: string;
        model?: string;
    };
    garment?: {
        kind?: "tee" | "hoodie" | "hat" | "tank" | "bag" | "poster";
        color?: string;
        colorLabel?: string;
        supplierColorName?: string;
    };
    posterFormatKey?: string;
    posterFormats?: PosterFormat[];
};

const PRINT_WIDTH = 2400;
const PRINT_HEIGHT = 3200;
const MAX_LAYER_SOURCE_BYTES = 12 * 1024 * 1024;
const MOCKUP_WIDTH = 1200;
const MOCKUP_HEIGHT = 1600;

function hashBuffer(buffer: Buffer) {
    return createHash("sha256").update(buffer).digest("hex");
}

function parseDataUrl(value: string) {
    const match = value.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
        throw new Error("Image layer source must be an inline PNG, JPEG, or WebP data URL.");
    }

    const contentType = match[1];
    const buffer = decodeStrictBase64ImagePayload(match[2]);
    if (buffer.length === 0 || buffer.length > MAX_LAYER_SOURCE_BYTES) {
        throw new Error("Image layer source is empty or too large.");
    }

    validateImageBytes(buffer, contentType);
    return buffer;
}

async function loadImageSource(value: string) {
    if (value.startsWith("data:")) {
        return parseDataUrl(value);
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase.storage
        .from("product-images")
        .download(value);

    if (error || !data) {
        logger.error("Stored image layer asset download failed", {
            path: value,
            error: error?.message ?? "No storage object returned",
        });
        throw new Error("Stored image layer asset could not be loaded.");
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_LAYER_SOURCE_BYTES) {
        logger.error("Stored image layer asset size validation failed", {
            path: value,
            size: buffer.length,
        });
        throw new Error("Stored image layer asset could not be loaded.");
    }

    try {
        validateImageBytes(buffer, data.type || "");
    } catch (validationError) {
        logger.error("Stored image layer asset signature validation failed", {
            path: value,
            content_type: data.type || null,
            error: validationError instanceof Error ? validationError.message : String(validationError),
        });
        throw new Error("Stored image layer asset could not be loaded.");
    }

    return buffer;
}

function escapeXml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

async function layerToBuffer(layer: DesignerLayer, width: number, height: number) {
    if (layer.type === "image") {
        if (!layer.src) throw new Error("Image layer is missing a source.");
        return sharp(await loadImageSource(layer.src))
            .resize(width, height, { fit: "fill" })
            .png()
            .toBuffer();
    }

    const lines = (layer.text ?? "").split("\n");
    const canvasWidth = Math.max(1, Math.round(layer.width ?? width));
    const canvasHeight = Math.max(1, Math.round(layer.height ?? height));
    if (lines.every((line) => !line.trim())) {
        return sharp({ create: { width, height, channels: 4, background: "#00000000" } }).png().toBuffer();
    }

    const renderScale = Math.max(1, Math.min(width / canvasWidth, height / canvasHeight));
    const longestLine = Math.max(...lines.map((line) => line.length), 1);
    const fontSize = Math.min(
        Math.max(12, Math.min(220, layer.fontSize ?? 72)) * renderScale,
        4096 / (longestLine * 1.2 + 2),
        4096 / (lines.length * 1.12 + 2)
    );
    const lineHeight = fontSize * 1.12;
    const sourceWidth = Math.ceil(Math.max(width, longestLine * fontSize * 1.2 + fontSize * 2));
    const sourceHeight = Math.ceil(lines.length * lineHeight + fontSize * 2);
    const startY = fontSize * 1.5;
    const tspans = lines
        .map((line, index) => `<tspan x="50%" y="${startY + index * lineHeight}">${escapeXml(line)}</tspan>`)
        .join("");

    const svg = `
        <svg width="${sourceWidth}" height="${sourceHeight}" viewBox="0 0 ${sourceWidth} ${sourceHeight}" xmlns="http://www.w3.org/2000/svg">
            <text
                text-anchor="middle"
                dominant-baseline="middle"
                font-family="${escapeXml(layer.fontFamily ?? "Arial")}"
                font-size="${fontSize}"
                font-weight="${escapeXml(layer.fontWeight ?? "800")}"
                fill="${escapeXml(layer.fill ?? "#ffffff")}"
            >${tspans}</text>
        </svg>`;

    const trimmed = await sharp(Buffer.from(svg)).trim().png().toBuffer();
    const inset = Math.max(1, Math.round(8 * renderScale));
    const fitted = await sharp(trimmed)
        .resize(Math.max(1, width - inset * 2), Math.max(1, height - inset * 2), {
            fit: "inside",
            withoutEnlargement: true,
        })
        .png()
        .toBuffer({ resolveWithObject: true });

    return sharp({ create: { width, height, channels: 4, background: "#00000000" } })
        .composite([{ input: fitted.data, left: Math.round((width - fitted.info.width) / 2), top: Math.round((height - fitted.info.height) / 2) }])
        .png()
        .toBuffer();
}

export async function renderServerPrintAsset(
    design: DesignerPayload,
    side: Side,
    output = { width: PRINT_WIDTH, height: PRINT_HEIGHT },
) {
    const area = resolveGeometryRect(design.printAreas[side]);
    const scaleX = output.width / area.width;
    const scaleY = output.height / area.height;
    const composites: OverlayOptions[] = [];

    for (const layer of design.layers.filter((item) => item.side === side && !item.hidden)) {
        const width = Math.round((layer.width ?? 1) * scaleX);
        const height = Math.round((layer.height ?? 1) * scaleY);
        const left = Math.round((layer.x - area.x) * scaleX);
        const top = Math.round((layer.y - area.y) * scaleY);
        let input = await layerToBuffer(layer, width, height);

        if (layer.rotation) {
            input = await sharp(input)
                .rotate(layer.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .png()
                .toBuffer();
        }

        if (layer.opacity !== undefined && layer.opacity < 1) {
            input = await sharp(input)
                .ensureAlpha(layer.opacity)
                .png()
                .toBuffer();
        }

        composites.push({
            input,
            left: Math.max(0, left),
            top: Math.max(0, top),
        });
    }

    let renderer = sharp({
        create: {
            width: output.width,
            height: output.height,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    });
    if (composites.length > 0) renderer = renderer.composite(composites);
    const buffer = await renderer.png().toBuffer();

    return {
        buffer,
        contentType: "image/png",
        extension: "png",
        sha256: hashBuffer(buffer),
        width: output.width,
        height: output.height,
    };
}

type GarmentKind = "tee" | "hoodie" | "hat" | "tank" | "bag" | "poster";

function garmentPath(kind: GarmentKind, posterArea?: PixelRect) {
    if (kind === "hoodie") {
        return "M318 190 Q450 76 582 190 L646 324 L758 425 L662 595 L612 1000 Q450 1065 288 1000 L238 595 L142 425 L254 324 Z";
    }

    if (kind === "hat") {
        return "M190 565 C190 260 300 155 450 155 C600 155 710 260 710 565 Q450 650 190 565 Z M190 565 Q450 650 710 565 Q745 710 450 745 Q155 710 190 565 Z";
    }

    if (kind === "tank") {
        return "M325 150 C360 136 390 120 407 105 C420 175 480 175 493 105 C510 120 540 136 575 150 L625 195 C585 265 565 340 585 980 Q450 1038 315 980 C335 340 315 265 275 195 Z";
    }

    if (kind === "bag") {
        return "M275 475 L625 475 L650 1030 L250 1030 Z";
    }

    if (kind === "poster") {
        const area = posterArea ?? { x: 150, y: 150, width: 600, height: 900 };
        return `M${area.x} ${area.y} H${area.x + area.width} V${area.y + area.height} H${area.x} Z`;
    }

    return "M318 160 Q450 96 582 160 L742 300 L646 472 L590 980 Q450 1038 310 980 L254 472 L158 300 Z";
}

function garmentBaseSvg(kind: GarmentKind, side: Side, color: string, posterArea?: PixelRect) {
    const path = garmentPath(kind, posterArea);
    const neckline = kind === "poster"
        ? ""
        : kind === "hat"
        ? '<path d="M450 155 V625 M215 535 Q450 610 685 535 M190 565 Q450 650 710 565" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="5"/>'
        : kind === "bag"
        ? '<path d="M330 475 L330 210 Q450 125 570 210 L570 475" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="30"/>'
        : kind === "hoodie"
        ? side === "front"
            ? '<path d="M350 225 Q450 320 550 225 Q506 355 450 390 Q394 355 350 225" fill="rgba(0,0,0,.2)"/>'
            : '<path d="M326 245 Q450 318 574 245" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="5"/>'
        : kind === "tank"
            ? side === "front"
                ? '<path d="M385 130 Q450 205 515 130" fill="none" stroke="rgba(255,255,255,.17)" stroke-width="6"/>'
                : '<path d="M392 128 Q450 174 508 128" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="5"/>'
            : side === "front"
                ? '<path d="M358 171 Q450 252 542 171" fill="none" stroke="rgba(255,255,255,.17)" stroke-width="6"/>'
                : '<path d="M326 196 Q450 250 574 196" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="5"/>';
    const pocket = kind === "hoodie" && side === "front"
        ? '<path d="M365 700 Q450 750 535 700 L535 820 Q450 870 365 820 Z" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="5"/>'
        : "";

    return Buffer.from(`
        <svg width="${MOCKUP_WIDTH}" height="${MOCKUP_HEIGHT}" viewBox="0 0 ${DESIGN_CANVAS_WIDTH} ${DESIGN_CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#f7f5ef"/>
                    <stop offset="1" stop-color="#dedbd3"/>
                </linearGradient>
                <linearGradient id="garment" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#ffffff" stop-opacity=".18"/>
                    <stop offset=".32" stop-color="${color}"/>
                    <stop offset=".72" stop-color="${color}"/>
                    <stop offset="1" stop-color="#000000" stop-opacity=".3"/>
                </linearGradient>
                <filter id="shadow" x="-30%" y="-30%" width="160%" height="180%">
                    <feDropShadow dx="0" dy="30" stdDeviation="26" flood-color="#000000" flood-opacity=".32"/>
                </filter>
            </defs>
            <rect width="900" height="1200" fill="url(#background)"/>
            <ellipse cx="450" cy="1045" rx="285" ry="58" fill="#000000" opacity=".16"/>
            <path d="${path}" fill="url(#garment)" stroke="rgba(0,0,0,.35)" stroke-width="5" filter="url(#shadow)"/>
            ${neckline}
            ${pocket}
        </svg>
    `);
}

function garmentFinishSvg(kind: GarmentKind, posterArea?: PixelRect) {
    const path = garmentPath(kind, posterArea);
    return Buffer.from(`
        <svg width="${MOCKUP_WIDTH}" height="${MOCKUP_HEIGHT}" viewBox="0 0 ${DESIGN_CANVAS_WIDTH} ${DESIGN_CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="fabric" x="-10%" y="-10%" width="120%" height="120%">
                    <feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" seed="17" result="noise"/>
                    <feColorMatrix in="noise" type="saturate" values="0" result="grey"/>
                    <feComponentTransfer in="grey">
                        <feFuncA type="table" tableValues="0 .12"/>
                    </feComponentTransfer>
                </filter>
                <linearGradient id="light" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stop-color="#ffffff" stop-opacity=".2"/>
                    <stop offset=".5" stop-color="#ffffff" stop-opacity="0"/>
                    <stop offset="1" stop-color="#000000" stop-opacity=".22"/>
                </linearGradient>
                <clipPath id="garmentClip"><path d="${path}"/></clipPath>
            </defs>
            <g clip-path="url(#garmentClip)">
                <rect width="900" height="1200" fill="url(#light)"/>
                <rect width="900" height="1200" fill="#ffffff" filter="url(#fabric)" opacity=".42"/>
                <path d="M285 245 Q350 360 325 935" fill="none" stroke="#ffffff" stroke-opacity=".09" stroke-width="22"/>
                <path d="M615 245 Q550 360 575 935" fill="none" stroke="#000000" stroke-opacity=".12" stroke-width="24"/>
            </g>
            <path d="${path}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="3"/>
        </svg>
    `);
}

export async function renderServerMockup(design: DesignerPayload, side: Side) {
    const kind: GarmentKind = design.garment?.kind === "hoodie"
        ? "hoodie"
        : design.garment?.kind === "hat"
            ? "hat"
        : design.garment?.kind === "tank"
            ? "tank"
            : design.garment?.kind === "bag"
                ? "bag"
                : design.garment?.kind === "poster"
                    ? "poster"
            : "tee";
    const color = /^#[0-9a-fA-F]{6}$/.test(design.garment?.color ?? "")
        ? design.garment?.color ?? "#111111"
        : "#111111";
    const area = resolveGeometryRect(design.printAreas[side]);
    const scaleX = MOCKUP_WIDTH / DESIGN_CANVAS_WIDTH;
    const scaleY = MOCKUP_HEIGHT / DESIGN_CANVAS_HEIGHT;
    const template = getMockupTemplate(
        design.catalogProduct ?? {},
        color,
        side,
        design.garment?.supplierColorName ?? design.garment?.colorLabel
    );
    const printAsset = await renderServerPrintAsset(design, side);

    let renderer: Sharp;
    if (template) {
        const placement = resolveGeometryRect(template.canvasPlacement);
        const renderedPlacement = {
            left: Math.round(placement.x * scaleX),
            top: Math.round(placement.y * scaleY),
            width: Math.round(placement.width * scaleX),
            height: Math.round(placement.height * scaleY),
        };
        const clippedPlacement = clipMockupPlacement(renderedPlacement, MOCKUP_WIDTH, MOCKUP_HEIGHT);
        if (!clippedPlacement) throw new Error("Mockup template falls outside the output canvas.");
        const artworkPlacement = template.artworkPlacement
            ? (() => {
                const calibrated = resolveGeometryRect(template.artworkPlacement);
                return {
                    left: Math.round(calibrated.x * scaleX),
                    top: Math.round(calibrated.y * scaleY),
                    width: Math.max(1, Math.round(calibrated.width * scaleX)),
                    height: Math.max(1, Math.round(calibrated.height * scaleY)),
                };
            })()
            : mapCanvasRectToMockupPlacement(
                area,
                renderedPlacement,
                DESIGN_CANVAS_WIDTH,
                DESIGN_CANVAS_HEIGHT,
            );
        const artwork = await sharp(printAsset.buffer)
            .resize(artworkPlacement.width, artworkPlacement.height, { fit: "fill" })
            .png()
            .toBuffer();
        const templatePath = path.join(
            process.cwd(),
            "public",
            template.publicPath.replace(/^\//, "")
        );
        let templateRenderer = sharp(await readFile(templatePath))
            .resize(
                renderedPlacement.width,
                renderedPlacement.height,
                { fit: template.fit, position: "centre" }
            );
        if (
            clippedPlacement.sourceLeft !== 0
            || clippedPlacement.sourceTop !== 0
            || clippedPlacement.width !== renderedPlacement.width
            || clippedPlacement.height !== renderedPlacement.height
        ) {
            templateRenderer = templateRenderer.extract({
                left: clippedPlacement.sourceLeft,
                top: clippedPlacement.sourceTop,
                width: clippedPlacement.width,
                height: clippedPlacement.height,
            });
        }
        const templateImage = await templateRenderer.toBuffer();

        renderer = sharp({
            create: {
                width: MOCKUP_WIDTH,
                height: MOCKUP_HEIGHT,
                channels: 3,
                background: template.background,
            },
        }).composite([
            {
                input: templateImage,
                left: clippedPlacement.destinationLeft,
                top: clippedPlacement.destinationTop,
            },
            {
                input: artwork,
                left: artworkPlacement.left,
                top: artworkPlacement.top,
            },
        ]);
    } else {
        const artwork = await sharp(printAsset.buffer)
            .resize(Math.round(area.width * scaleX), Math.round(area.height * scaleY), { fit: "fill" })
            .png()
            .toBuffer();
        renderer = sharp(garmentBaseSvg(kind, side, color, area)).composite([
            {
                input: artwork,
                left: Math.round(area.x * scaleX),
                top: Math.round(area.y * scaleY),
            },
            ...(kind === "poster" ? [] : [{ input: garmentFinishSvg(kind, area), blend: "over" as const }]),
        ]);
    }

    const buffer = await renderer.webp({ quality: 92, effort: 5 }).toBuffer();

    return {
        buffer,
        contentType: "image/webp",
        extension: "webp",
        sha256: hashBuffer(buffer),
        width: MOCKUP_WIDTH,
        height: MOCKUP_HEIGHT,
    };
}

export async function renderServerLifestyleMockups(
    design: DesignerPayload,
    options?: { modelSets?: LifestyleModelSetId[]; includeBack?: boolean }
) {
    const templates = getLifestyleMockupTemplates(
        design.catalogProduct ?? {},
        design.garment?.color ?? "#111111",
        options?.modelSets
    ).filter((template) => options?.includeBack !== false || template.side === "front");
    if (templates.length === 0) return [];

    const [frontPrintAsset, backPrintAsset] = await Promise.all([
        renderServerPrintAsset(design, "front"),
        renderServerPrintAsset(design, "back"),
    ]);
    const [frontArtwork, backArtwork] = await Promise.all(
        [frontPrintAsset, backPrintAsset].map((asset) =>
            sharp(asset.buffer).resize(600, 800).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
        )
    );
    const artworkBySide = { front: frontArtwork, back: backArtwork };
    const results = await Promise.all(templates.map(async (template) => {
        try {
            const photoPath = path.join(process.cwd(), "public", template.publicPath.replace(/^\//, ""));
            const photoBuffer = await readFile(photoPath);
            const photo = await sharp(photoBuffer)
                .resize(template.imageWidth, template.imageHeight)
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });
            const overlay = warpArtworkOntoPhoto(
                { data: photo.data, width: photo.info.width, height: photo.info.height },
                {
                    data: artworkBySide[template.side].data,
                    width: artworkBySide[template.side].info.width,
                    height: artworkBySide[template.side].info.height,
                },
                template.printMesh
            );
            const buffer = await sharp(photoBuffer)
                .resize(template.imageWidth, template.imageHeight)
                .composite([{
                    input: overlay,
                    raw: { width: template.imageWidth, height: template.imageHeight, channels: 4 },
                    left: 0,
                    top: 0,
                }])
                .webp({ quality: 90, effort: 5 })
                .toBuffer();

            return {
                id: template.id,
                label: template.label,
                side: template.side,
                modelSetId: template.modelSetId,
                buffer,
                contentType: "image/webp",
            };
        } catch (error) {
            logger.error("designer lifestyle mockup render failed", {
                templateId: template.id,
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }));

    return results.filter((result): result is NonNullable<typeof result> => result !== null);
}
