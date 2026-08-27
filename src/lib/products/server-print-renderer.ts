import "server-only";

import { createHash } from "crypto";
import sharp, { type OverlayOptions } from "sharp";
import { getServiceSupabase } from "@/lib/supabase/service";
import { decodeStrictBase64ImagePayload, validateImageBytes } from "@/lib/uploads";
import { logger } from "@/lib/logger";

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
};

type PrintArea = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type DesignerPayload = {
    printAreas: Record<Side, PrintArea>;
    layers: DesignerLayer[];
};

const PRINT_WIDTH = 2400;
const PRINT_HEIGHT = 3200;
const MAX_LAYER_SOURCE_BYTES = 12 * 1024 * 1024;

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

    const text = escapeXml(layer.text ?? "");
    const lines = text.split("\n").slice(0, 4);
    const fontSize = Math.max(12, Math.min(220, layer.fontSize ?? 72));
    const lineHeight = fontSize * 1.12;
    const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;
    const tspans = lines
        .map((line, index) => `<tspan x="50%" y="${startY + index * lineHeight}">${line}</tspan>`)
        .join("");

    const svg = `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            <text
                text-anchor="middle"
                dominant-baseline="middle"
                font-family="${escapeXml(layer.fontFamily ?? "Arial")}"
                font-size="${fontSize}"
                font-weight="${escapeXml(layer.fontWeight ?? "800")}"
                fill="${escapeXml(layer.fill ?? "#ffffff")}"
            >${tspans}</text>
        </svg>`;

    return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function renderServerPrintAsset(design: DesignerPayload, side: Side) {
    const area = design.printAreas[side];
    const scaleX = PRINT_WIDTH / area.width;
    const scaleY = PRINT_HEIGHT / area.height;
    const composites: OverlayOptions[] = [];

    for (const layer of design.layers.filter((item) => item.side === side)) {
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

    const buffer = await sharp({
        create: {
            width: PRINT_WIDTH,
            height: PRINT_HEIGHT,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .composite(composites)
        .png()
        .toBuffer();

    return {
        buffer,
        contentType: "image/png",
        extension: "png",
        sha256: hashBuffer(buffer),
        width: PRINT_WIDTH,
        height: PRINT_HEIGHT,
    };
}
