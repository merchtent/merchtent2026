"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
    AlignCenterHorizontal,
    AlignCenterVertical,
    CircleAlert,
    CircleCheck,
    Copy,
    Download,
    ArrowLeft,
    ArrowRight,
    ClipboardList,
    Eye,
    EyeOff,
    Grid3X3,
    Group,
    Image as ImageIcon,
    Images,
    Layers,
    Loader2,
    Lock,
    MoveDown,
    MoveHorizontal,
    MoveLeft,
    MoveRight,
    MoveUp,
    MoveVertical,
    Redo2,
    RefreshCw,
    Ruler,
    RotateCw,
    Save,
    Shirt,
    Trash2,
    Type,
    Undo2,
    Ungroup,
    Unlock,
    ZoomIn,
    ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicImageUrl } from "@/lib/storage";
import type { CatalogProduct } from "@/lib/product-catalog";
import type { ArtistArtworkAsset } from "@/lib/products/artist-artwork-library";
import {
    DESIGN_CANVAS_HEIGHT,
    DESIGN_CANVAS_WIDTH,
    normalizeGeometryAreas,
    resolveGeometryAreas,
    resolveGeometryRect,
    type PixelRect,
} from "@/lib/products/design-geometry";
import { getLifestyleModelSets, getMockupTemplate, type LifestyleModelSetId } from "@/lib/products/mockup-templates";
import { posterCanvasArea, posterFormatForKey, remapPosterLayers } from "@/lib/products/poster-formats";
import { buildDesignedProductName, extractDesignedProductDropName } from "@/lib/products/designed-product-name";
import { createDesignedProductAction, generateDesignerMockupPreviewAction } from "./actions";
import {
    fitImageToPrintArea,
    getLayerPositionPatch,
    getLayerQuickActionPatch,
    type LayerQuickAction,
} from "./layer-quick-actions";
import DesignerListingReview, { type DesignerMockupPreview } from "./DesignerListingReview";
import { estimateArtworkPrintQuality } from "./artwork-print-quality";

const CANVAS_WIDTH = DESIGN_CANVAS_WIDTH;
const CANVAS_HEIGHT = DESIGN_CANVAS_HEIGHT;
const PRINT_ASSET_WIDTH = 2400;
const PRINT_ASSET_HEIGHT = 3200;

type Side = "front" | "back";
type GarmentKind = "tee" | "hoodie" | "hat" | "tank" | "bag" | "poster";
type ToolPanel = "product" | "blank" | "layers" | "selection" | "advanced";

type DesignLayer = {
    id: string;
    side: Side;
    type: "image" | "text";
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    text?: string;
    fill?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    src?: string;
    aspectRatio?: number;
    sourcePixelWidth?: number;
    sourcePixelHeight?: number;
    name?: string;
    locked?: boolean;
    hidden?: boolean;
    groupId?: string;
    fileType?: string;
    hasTransparency?: boolean;
    colorProfile?: string;
};

type CanvasGuideOptions = {
    advanced: boolean;
    showGrid: boolean;
    showRulers: boolean;
    showSafeArea: boolean;
    showBleed: boolean;
    gridSize: number;
};

export type DesignerInitialProduct = {
    id: string;
    title: string;
    description: string | null;
    color?: string;
    colorLabel?: string;
    saleColorNames?: string[];
    layers: DesignLayer[];
    posterFormatKey?: string | null;
    posterLayouts?: Array<{ key: string; layers: DesignLayer[] }>;
    referenceImageUrl?: string | null;
};

type DragState = {
    id: string;
    mode: "move";
    offsetX: number;
    offsetY: number;
} | {
    id: string;
    mode: "resize";
    centerX: number;
    centerY: number;
    startDistance: number;
    startWidth: number;
    startHeight: number;
} | {
    id: string;
    mode: "rotate";
    centerX: number;
    centerY: number;
    startAngle: number;
    startRotation: number;
};

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function uid() {
    return globalThis.crypto.randomUUID();
}

function priceWithPrintSides(basePrice: string, hasTwoPrintSides: boolean, additionalPrintSideRetailCents?: number) {
    const parsed = Number(basePrice);
    const baseCents = Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
    const extraCents = hasTwoPrintSides ? additionalPrintSideRetailCents ?? 0 : 0;
    return ((baseCents + extraCents) / 100).toFixed(2);
}

function formatMoneyFromCents(cents: number) {
    return (cents / 100).toLocaleString("en-AU", {
        style: "currency",
        currency: "AUD",
    });
}

function hasDesignerProductPreview(product: CatalogProduct, color: CatalogProduct["colors"][number]) {
    if (product.garmentKind === "poster") return true;
    const supplierColorName = color.supplierColorName ?? color.label;
    return Boolean(getMockupTemplate(product, color.value, "front", supplierColorName));
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function printTargetPixels(
    product: CatalogProduct,
    printArea: PixelRect,
    posterFormat: { width: number; height: number } | null,
) {
    if (product.garmentKind === "poster" && posterFormat) {
        return { width: posterFormat.width, height: posterFormat.height, isSupplierSpecified: true };
    }

    const supplierTargets: Record<string, { width: number; height: number }> = {
        "995": { width: 3071, height: 3508 },
        "553": { width: 2835, height: 3425 },
        "1703": { width: 1654, height: 750 },
    };
    const supplierTarget = supplierTargets[product.supplier.externalProductId];
    if (supplierTarget) return { ...supplierTarget, isSupplierSpecified: true };

    const width = 3600;
    return {
        width,
        height: Math.round(width * printArea.height / printArea.width),
        isSupplierSpecified: false,
    };
}

function printTargetPhysicalSize(target: { width: number; height: number }) {
    return {
        widthCm: target.width / 300 * 2.54,
        heightCm: target.height / 300 * 2.54,
    };
}

function omitInlineLayerSources(layers: DesignLayer[]) {
    return layers.map((layer) => layer.type === "image" ? { ...layer, src: undefined } : layer);
}

function loadImage(src: string) {
    const cached = imageCache.get(src);
    if (cached) return cached;

    const request = new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new window.Image();
        image.onload = () => resolve(image);
        image.onerror = () => {
            imageCache.delete(src);
            reject(new Error("Could not load design image."));
        };
        const imageUrl = src.startsWith("data:") || src.startsWith("http") || src.startsWith("/")
            ? src
            : publicImageUrl(src) ?? src;
        if (imageUrl.startsWith("http")) image.crossOrigin = "anonymous";
        image.src = imageUrl;
    });
    imageCache.set(src, request);
    return request;
}

function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("Could not read that artwork file."));
        reader.readAsDataURL(file);
    });
}

function imageHasTransparency(image: HTMLImageElement) {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 128 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let index = 3; index < pixels.length; index += 4) {
        if (pixels[index] < 255) return true;
    }
    return false;
}

async function detectColorProfile(file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const searchable = new TextDecoder("latin1").decode(bytes);
    if (searchable.includes("ICC_PROFILE") || searchable.includes("iCCP") || searchable.includes("ICCP")) {
        return "Embedded ICC profile";
    }
    if (searchable.includes("sRGB")) return "sRGB";
    return "No embedded profile";
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

function drawImageCover(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number
) {
    const sourceRatio = image.naturalWidth / image.naturalHeight;
    const targetRatio = width / height;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;

    if (sourceRatio > targetRatio) {
        sourceWidth = image.naturalHeight * targetRatio;
        sourceX = (image.naturalWidth - sourceWidth) / 2;
    } else {
        sourceHeight = image.naturalWidth / targetRatio;
        sourceY = (image.naturalHeight - sourceHeight) / 2;
    }

    ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        x,
        y,
        width,
        height
    );
}

function drawImageContain(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number
) {
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const renderedWidth = image.naturalWidth * scale;
    const renderedHeight = image.naturalHeight * scale;
    ctx.drawImage(
        image,
        x + (width - renderedWidth) / 2,
        y + (height - renderedHeight) / 2,
        renderedWidth,
        renderedHeight
    );
}

function rotatePoint(x: number, y: number, centerX: number, centerY: number, degrees: number) {
    const radians = (degrees * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dx = x - centerX;
    const dy = y - centerY;
    return {
        x: centerX + dx * cos - dy * sin,
        y: centerY + dx * sin + dy * cos,
    };
}

function layerHandles(layer: DesignLayer) {
    const centerX = layer.x + layer.width / 2;
    const centerY = layer.y + layer.height / 2;
    return {
        centerX,
        centerY,
        resize: rotatePoint(layer.x + layer.width, layer.y + layer.height, centerX, centerY, layer.rotation),
        rotate: rotatePoint(centerX, layer.y - 50, centerX, centerY, layer.rotation),
    };
}

function pointHitsLayer(point: { x: number; y: number }, layer: DesignLayer) {
    const centerX = layer.x + layer.width / 2;
    const centerY = layer.y + layer.height / 2;
    const local = rotatePoint(point.x, point.y, centerX, centerY, -layer.rotation);
    return local.x >= layer.x && local.x <= layer.x + layer.width && local.y >= layer.y && local.y <= layer.y + layer.height;
}

function pointNear(point: { x: number; y: number }, target: { x: number; y: number }, radius = 28) {
    return Math.hypot(point.x - target.x, point.y - target.y) <= radius;
}

function drawGarment(
    ctx: CanvasRenderingContext2D,
    kind: GarmentKind,
    side: Side,
    color: string,
    posterArea?: PixelRect,
) {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, "#2a2a2a");
    gradient.addColorStop(1, "#0f0f0f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    ctx.translate(0, kind === "hoodie" ? 20 : 0);

    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 5;

    if (kind === "hoodie") {
        ctx.beginPath();
        ctx.moveTo(318, 170);
        ctx.quadraticCurveTo(450, 72, 582, 170);
        ctx.lineTo(646, 304);
        ctx.lineTo(758, 405);
        ctx.lineTo(662, 575);
        ctx.lineTo(612, 980);
        ctx.quadraticCurveTo(450, 1045, 288, 980);
        ctx.lineTo(238, 575);
        ctx.lineTo(142, 405);
        ctx.lineTo(254, 304);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.beginPath();
        ctx.moveTo(350, 225);
        ctx.quadraticCurveTo(450, 320, 550, 225);
        ctx.quadraticCurveTo(506, 355, 450, 390);
        ctx.quadraticCurveTo(394, 355, 350, 225);
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.beginPath();
        ctx.moveTo(365, 700);
        ctx.quadraticCurveTo(450, 750, 535, 700);
        ctx.lineTo(535, 820);
        ctx.quadraticCurveTo(450, 870, 365, 820);
        ctx.closePath();
        ctx.stroke();
    } else if (kind === "hat") {
        ctx.beginPath();
        ctx.moveTo(190, 565);
        ctx.bezierCurveTo(190, 260, 300, 155, 450, 155);
        ctx.bezierCurveTo(600, 155, 710, 260, 710, 565);
        ctx.quadraticCurveTo(450, 650, 190, 565);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(190, 565);
        ctx.quadraticCurveTo(450, 650, 710, 565);
        ctx.quadraticCurveTo(745, 710, 450, 745);
        ctx.quadraticCurveTo(155, 710, 190, 565);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    } else if (kind === "tank") {
        ctx.beginPath();
        ctx.moveTo(325, 150);
        ctx.bezierCurveTo(360, 136, 390, 120, 407, 105);
        ctx.bezierCurveTo(420, 175, 480, 175, 493, 105);
        ctx.bezierCurveTo(510, 120, 540, 136, 575, 150);
        ctx.lineTo(625, 195);
        ctx.bezierCurveTo(585, 265, 565, 340, 585, 980);
        ctx.quadraticCurveTo(450, 1038, 315, 980);
        ctx.bezierCurveTo(335, 340, 315, 265, 275, 195);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.beginPath();
        ctx.arc(450, side === "front" ? 145 : 132, side === "front" ? 74 : 58, 0.08 * Math.PI, 0.92 * Math.PI);
        ctx.stroke();
    } else if (kind === "bag") {
        ctx.beginPath();
        ctx.moveTo(275, 475);
        ctx.lineTo(625, 475);
        ctx.lineTo(650, 1030);
        ctx.lineTo(250, 1030);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(330, 475);
        ctx.lineTo(330, 210);
        ctx.quadraticCurveTo(450, 125, 570, 210);
        ctx.lineTo(570, 475);
        ctx.stroke();
    } else if (kind === "poster") {
        const area = posterArea ?? { x: 150, y: 150, width: 600, height: 900 };
        ctx.shadowColor = "rgba(0,0,0,0.28)";
        ctx.shadowBlur = 28;
        ctx.shadowOffsetY = 18;
        ctx.fillRect(area.x, area.y, area.width, area.height);
        ctx.shadowColor = "transparent";
        ctx.strokeRect(area.x, area.y, area.width, area.height);
    } else {
        ctx.beginPath();
        ctx.moveTo(318, 160);
        ctx.quadraticCurveTo(450, 96, 582, 160);
        ctx.lineTo(742, 300);
        ctx.lineTo(646, 472);
        ctx.lineTo(590, 980);
        ctx.quadraticCurveTo(450, 1038, 310, 980);
        ctx.lineTo(254, 472);
        ctx.lineTo(158, 300);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.beginPath();
        ctx.arc(450, 177, 92, 0.08 * Math.PI, 0.92 * Math.PI);
        ctx.stroke();
    }

    if (side === "back" && kind !== "hat" && kind !== "bag" && kind !== "poster") {
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.beginPath();
        const backNeckY = kind === "hoodie" ? 245 : kind === "tank" ? 150 : 196;
        const backNeckDepth = kind === "hoodie" ? 318 : kind === "tank" ? 185 : 250;
        ctx.moveTo(326, backNeckY);
        ctx.quadraticCurveTo(450, backNeckDepth, 574, backNeckY);
        ctx.stroke();
    }

    ctx.restore();
}

async function drawLayer(ctx: CanvasRenderingContext2D, layer: DesignLayer) {
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
    ctx.rotate((layer.rotation * Math.PI) / 180);

    if (layer.type === "text") {
        ctx.fillStyle = layer.fill ?? "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const fontSize = layer.fontSize ?? 72;
        ctx.font = `${layer.fontWeight ?? "800"} ${fontSize}px ${layer.fontFamily ?? "Arial"}`;
        const text = layer.text ?? "";
        const lines = text.split("\n");
        const textWidth = Math.max(...lines.map((line) => ctx.measureText(line).width), 1);
        const textHeight = fontSize + (lines.length - 1) * fontSize * 1.12;
        const scale = Math.min(1, (layer.width - 16) / textWidth, (layer.height - 16) / textHeight);
        ctx.scale(Math.max(scale, 0.01), Math.max(scale, 0.01));
        lines.forEach((line, index) => {
            ctx.fillText(line, 0, (index - (lines.length - 1) / 2) * fontSize * 1.12);
        });
    } else if (layer.src) {
        const image = await loadImage(layer.src);
        ctx.drawImage(image, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
    }

    ctx.restore();
}

function drawSelection(ctx: CanvasRenderingContext2D, layer: DesignLayer) {
    const { centerX, centerY, resize, rotate } = layerHandles(layer);
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.strokeStyle = "#b7ff3c";
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 8]);
    ctx.strokeRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, -layer.height / 2);
    ctx.lineTo(0, -layer.height / 2 - 50);
    ctx.stroke();
    ctx.restore();

    for (const [point, fill] of [[resize, "#b7ff3c"], [rotate, "#ef4444"]] as const) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 15, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 4;
        ctx.stroke();
    }
}

async function renderDesign(
    canvas: HTMLCanvasElement,
    layers: DesignLayer[],
    side: Side,
    kind: GarmentKind,
    garmentColor: string,
    supplierColorName: string,
    catalogProduct: Pick<CatalogProduct, "key" | "brand" | "model">,
    printAreas: Record<Side, PixelRect>,
    printTarget: { width: number; height: number },
    showGuides: boolean,
    guideOptions: CanvasGuideOptions,
    selectedLayerId?: string | null
) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const template = getMockupTemplate(catalogProduct, garmentColor, side, supplierColorName);
    if (template) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = template.background;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const background = await loadImage(template.publicPath);
        const placement = resolveGeometryRect(template.canvasPlacement, CANVAS_WIDTH, CANVAS_HEIGHT);
        if (template.fit === "contain") {
            drawImageContain(ctx, background, placement.x, placement.y, placement.width, placement.height);
        } else {
            drawImageCover(ctx, background, placement.x, placement.y, placement.width, placement.height);
        }
    } else {
        drawGarment(ctx, kind, side, garmentColor, printAreas[side]);
    }

    if (guideOptions.advanced && guideOptions.showGrid) {
        ctx.save();
        ctx.strokeStyle = "rgba(17,24,39,0.15)";
        ctx.lineWidth = 1;
        for (let x = 0; x <= CANVAS_WIDTH; x += guideOptions.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CANVAS_HEIGHT);
            ctx.stroke();
        }
        for (let y = 0; y <= CANVAS_HEIGHT; y += guideOptions.gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(CANVAS_WIDTH, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    for (const layer of layers.filter((item) => item.side === side && !item.hidden)) {
        await drawLayer(ctx, layer);
    }

    if (showGuides) {
        const area = printAreas[side];
        ctx.save();
        ctx.strokeStyle = "rgba(248,113,113,0.9)";
        ctx.setLineDash([16, 12]);
        ctx.lineWidth = 4;
        ctx.strokeRect(area.x, area.y, area.width, area.height);
        if (guideOptions.advanced && guideOptions.showBleed) {
            const bleed = Math.max(6, Math.min(area.width, area.height) * 0.025);
            ctx.strokeStyle = "rgba(251,146,60,0.95)";
            ctx.setLineDash([8, 8]);
            ctx.strokeRect(area.x - bleed, area.y - bleed, area.width + bleed * 2, area.height + bleed * 2);
        }
        if (guideOptions.advanced && guideOptions.showSafeArea) {
            const inset = Math.max(10, Math.min(area.width, area.height) * 0.05);
            ctx.strokeStyle = "rgba(34,197,94,0.95)";
            ctx.setLineDash([10, 7]);
            ctx.strokeRect(area.x + inset, area.y + inset, area.width - inset * 2, area.height - inset * 2);
        }
        const guideLabel = `${printTarget.width} x ${printTarget.height} px`;
        ctx.font = "800 18px Arial";
        const labelWidth = ctx.measureText(guideLabel).width + 20;
        const labelY = Math.max(4, area.y - 30);
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(0,0,0,0.9)";
        ctx.fillRect(area.x, labelY, labelWidth, 26);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(guideLabel, area.x + 10, labelY + 13);
        if (guideOptions.advanced && guideOptions.showRulers) {
            ctx.fillStyle = "rgba(0,0,0,0.78)";
            ctx.fillRect(0, 0, CANVAS_WIDTH, 24);
            ctx.fillRect(0, 0, 24, CANVAS_HEIGHT);
            ctx.strokeStyle = "rgba(255,255,255,0.75)";
            ctx.fillStyle = "#ffffff";
            ctx.font = "700 10px Arial";
            for (let x = 0; x <= CANVAS_WIDTH; x += 50) {
                ctx.beginPath();
                ctx.moveTo(x, 24);
                ctx.lineTo(x, x % 100 === 0 ? 12 : 17);
                ctx.stroke();
                if (x % 100 === 0 && x > 0) ctx.fillText(String(x), x + 3, 9);
            }
            for (let y = 0; y <= CANVAS_HEIGHT; y += 50) {
                ctx.beginPath();
                ctx.moveTo(24, y);
                ctx.lineTo(y % 100 === 0 ? 12 : 17, y);
                ctx.stroke();
                if (y % 100 === 0 && y > 0) {
                    ctx.save();
                    ctx.translate(8, y + 3);
                    ctx.rotate(-Math.PI / 2);
                    ctx.fillText(String(y), 0, 0);
                    ctx.restore();
                }
            }
        }
        ctx.restore();

        const selectedLayer = layers.find((layer) => layer.id === selectedLayerId && layer.side === side && !layer.hidden);
        if (selectedLayer) drawSelection(ctx, selectedLayer);
    }
}

function presentCanvas(target: HTMLCanvasElement, frame: HTMLCanvasElement) {
    target.width = CANVAS_WIDTH;
    target.height = CANVAS_HEIGHT;
    const ctx = target.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.drawImage(frame, 0, 0);
}

export default function DesignerClient({
    catalogProduct,
    artistName,
    initialProduct,
    recentArtwork = [],
}: {
    catalogProduct: CatalogProduct;
    artistName: string;
    initialProduct?: DesignerInitialProduct;
    recentArtwork?: ArtistArtworkAsset[];
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const workspaceRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef<DragState | null>(null);
    const dragHistorySnapshotRef = useRef<DesignLayer[] | null>(null);
    const layersRef = useRef<DesignLayer[]>([]);
    const historyRef = useRef<{ past: DesignLayer[][]; future: DesignLayer[][] }>({ past: [], future: [] });
    const spacePressedRef = useRef(false);
    const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
    const renderGenerationRef = useRef(0);
    const dragFrameRef = useRef<number | null>(null);
    const pendingDragUpdateRef = useRef<{ id: string; patch: Partial<DesignLayer> } | null>(null);
    const saveModeRef = useRef<"draft" | "publish">("draft");

    const [title, setTitle] = useState(() => extractDesignedProductDropName(
        initialProduct?.title,
        artistName,
        catalogProduct.name
    ));
    const [description, setDescription] = useState(initialProduct?.description ?? "");
    const category = catalogProduct.category;
    const [activeSide, setActiveSide] = useState<Side>("front");
    const [activeToolPanel, setActiveToolPanel] = useState<ToolPanel>("product");
    const [advancedMode, setAdvancedMode] = useState(false);
    const [zoom, setZoom] = useState(100);
    const [showGrid, setShowGrid] = useState(true);
    const [showRulers, setShowRulers] = useState(true);
    const [showSafeArea, setShowSafeArea] = useState(true);
    const [showBleed, setShowBleed] = useState(true);
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [gridSize, setGridSize] = useState(10);
    const [lockAspectRatio, setLockAspectRatio] = useState(true);
    const garmentKind = catalogProduct.garmentKind;
    const isSingleSided = garmentKind === "poster" || garmentKind === "hat";
    const posterFormats = catalogProduct.production.posterFormats ?? [];
    const [selectedPosterFormatKey, setSelectedPosterFormatKey] = useState(() =>
        posterFormatForKey(posterFormats, initialProduct?.posterFormatKey)?.key ?? ""
    );
    const selectedPosterFormat = posterFormatForKey(posterFormats, selectedPosterFormatKey);
    const designerPreviewColors = catalogProduct.colors.filter((item) =>
        hasDesignerProductPreview(catalogProduct, item)
    );
    const designerPreviewColorNames = new Set(
        designerPreviewColors.map((item) => item.supplierColorName ?? item.label)
    );
    const [selectedColorName, setSelectedColorName] = useState(() => {
        const matching = designerPreviewColors.find((item) =>
            (item.supplierColorName ?? item.label) === initialProduct?.colorLabel
        ) ?? designerPreviewColors.find((item) => item.value === initialProduct?.color);
        const preferredBlackNames = garmentKind === "tank" ? ["black stone", "black"] : ["black"];
        const black = preferredBlackNames
            .map((preferred) => designerPreviewColors.find((item) =>
                (item.supplierColorName ?? item.label).trim().toLowerCase() === preferred
            ))
            .find(Boolean);
        return matching?.supplierColorName ?? matching?.label ?? black?.supplierColorName ?? black?.label
            ?? designerPreviewColors[0]?.supplierColorName ?? designerPreviewColors[0]?.label
            ?? catalogProduct.colors[0]?.supplierColorName ?? catalogProduct.colors[0]?.label ?? "";
    });
    const selectedColor = catalogProduct.colors.find((item) => (item.supplierColorName ?? item.label) === selectedColorName)
        ?? catalogProduct.colors[0];
    const garmentColor = selectedColor?.value ?? "#111111";
    const [saleColorNames, setSaleColorNames] = useState<string[]>(() => initialProduct?.saleColorNames?.length
        ? initialProduct.saleColorNames
        : [selectedColor?.supplierColorName ?? selectedColor?.label ?? ""]);
    const saleColors = catalogProduct.colors.filter((item) => saleColorNames.includes(item.supplierColorName ?? item.label));
    const listingColor = saleColors.find((item) => (item.supplierColorName ?? item.label).toLowerCase() === "black") ?? saleColors[0];
    const [layers, setLayers] = useState<DesignLayer[]>(initialProduct?.layers ?? []);
    const [posterLayouts, setPosterLayouts] = useState<Record<string, DesignLayer[]>>(() =>
        Object.fromEntries((initialProduct?.posterLayouts ?? []).map((layout) => [
            layout.key,
            layout.layers.map((layer) => ({
                ...layer,
                src: layer.src ?? initialProduct?.layers.find((source) => source.id === layer.id)?.src,
            })),
        ]))
    );
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
    const [historyStatus, setHistoryStatus] = useState({ canUndo: false, canRedo: false });
    const [isSaving, setIsSaving] = useState(false);
    const [savingMode, setSavingMode] = useState<"draft" | "publish">("draft");
    const [error, setError] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<"designer" | "colors" | "mockups" | "review">("designer");
    const [isGeneratingMockups, setIsGeneratingMockups] = useState(false);
    const [isUploadingArtwork, setIsUploadingArtwork] = useState(false);
    const [isArtworkLibraryOpen, setIsArtworkLibraryOpen] = useState(false);
    const [mockupPreview, setMockupPreview] = useState<DesignerMockupPreview | null>(null);
    const [femaleModelSet, setFemaleModelSet] = useState<LifestyleModelSetId | null>(null);
    const [maleModelSet, setMaleModelSet] = useState<LifestyleModelSetId | null>(null);
    const printAreas = useMemo(() => {
        const resolved = resolveGeometryAreas(catalogProduct.printAreas, CANVAS_WIDTH, CANVAS_HEIGHT);
        if (!isSingleSided || !selectedPosterFormat) return resolved;
        const area = posterCanvasArea(selectedPosterFormat.width, selectedPosterFormat.height);
        return { front: area, back: area };
    }, [catalogProduct.printAreas, isSingleSided, selectedPosterFormat]);
    const activePrintTarget = useMemo(
        () => printTargetPixels(catalogProduct, printAreas[activeSide], selectedPosterFormat),
        [activeSide, catalogProduct, printAreas, selectedPosterFormat],
    );
    const activePrintPhysicalSize = printTargetPhysicalSize(activePrintTarget);
    const canvasGuideOptions = useMemo<CanvasGuideOptions>(() => ({
        advanced: advancedMode,
        showGrid,
        showRulers,
        showSafeArea,
        showBleed,
        gridSize,
    }), [advancedMode, gridSize, showBleed, showGrid, showRulers, showSafeArea]);

    const selectedLayer = useMemo(
        () => layers.find((layer) => layer.id === selectedLayerId) ?? null,
        [layers, selectedLayerId]
    );
    const missingImageDimensionsKey = useMemo(() => layers
        .filter((layer) => layer.type === "image" && layer.src && (!layer.sourcePixelWidth || !layer.sourcePixelHeight))
        .map((layer) => `${layer.id}:${layer.src}`)
        .join("|"), [layers]);
    const activeLayers = layers.filter((layer) => layer.side === activeSide);
    const selectedLayers = layers.filter((layer) => selectedLayerIds.includes(layer.id));
    const preflightChecks = activeLayers.flatMap((layer) => {
        const checks: Array<{ level: "pass" | "warning"; message: string }> = [];
        const area = printAreas[layer.side];
        const safeInset = Math.max(10, Math.min(area.width, area.height) * 0.05);
        const outsidePrintArea = layer.x < area.x || layer.y < area.y ||
            layer.x + layer.width > area.x + area.width || layer.y + layer.height > area.y + area.height;
        const outsideSafeArea = layer.x < area.x + safeInset || layer.y < area.y + safeInset ||
            layer.x + layer.width > area.x + area.width - safeInset ||
            layer.y + layer.height > area.y + area.height - safeInset;
        if (outsidePrintArea) checks.push({ level: "warning", message: `${layer.name ?? "Layer"} is clipped by the print boundary.` });
        else if (outsideSafeArea) checks.push({ level: "warning", message: `${layer.name ?? "Layer"} extends beyond the safe area.` });
        if (layer.hidden) checks.push({ level: "warning", message: `${layer.name ?? "Layer"} is hidden and will not print.` });
        if (layer.type === "image" && layer.sourcePixelWidth && layer.sourcePixelHeight) {
            const quality = estimateArtworkPrintQuality({
                sourceWidth: layer.sourcePixelWidth,
                sourceHeight: layer.sourcePixelHeight,
                layerWidth: layer.width,
                layerHeight: layer.height,
                printAreaWidth: area.width,
                printAreaHeight: area.height,
                targetPixelWidth: activePrintTarget.width,
                targetPixelHeight: activePrintTarget.height,
            });
            if (quality?.level === "low") checks.push({ level: "warning", message: `${layer.name ?? "Artwork"} is only ${quality.dpi} DPI at this size.` });
        }
        return checks;
    });
    if (activeLayers.length > 0 && preflightChecks.length === 0) {
        preflightChecks.push({ level: "pass", message: "No print issues found on this side." });
    }
    const hasFrontDesign = layers.some((layer) => layer.side === "front" && !layer.hidden);
    const hasBackDesign = layers.some((layer) => layer.side === "back" && !layer.hidden);
    const hasTwoPrintSides = hasFrontDesign && hasBackDesign;
    const printSideCount = hasTwoPrintSides ? 2 : 1;
    const additionalPrintSideRetailCents =
        catalogProduct.production.includedPrintSides && catalogProduct.production.includedPrintSides >= 2
            ? 0
            : catalogProduct.production.additionalPrintSideRetailCents ?? catalogProduct.production.additionalPrintSideCents ?? 0;
    const price = useMemo(
        () => priceWithPrintSides(catalogProduct.defaultPrice, hasTwoPrintSides, additionalPrintSideRetailCents),
        [additionalPrintSideRetailCents, catalogProduct.defaultPrice, hasTwoPrintSides]
    );
    const singlePriceCents = useMemo(() => {
        const parsed = Number(catalogProduct.defaultPrice);
        return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
    }, [catalogProduct.defaultPrice]);
    const doublePriceCents = singlePriceCents + additionalPrintSideRetailCents;
    const activePriceCents = hasTwoPrintSides ? doublePriceCents : singlePriceCents;
    const artistProfitCents = catalogProduct.production.artistProfitCents ?? 0;
    const productTitlePreview = useMemo(() => {
        return buildDesignedProductName(artistName, title, catalogProduct.name);
    }, [artistName, catalogProduct.name, title]);
    const modelSets = getLifestyleModelSets(catalogProduct, listingColor?.value ?? garmentColor);
    const femaleOptions = modelSets.filter((set) => set.audience === "female");
    const maleOptions = modelSets.filter((set) => set.audience === "male");
    const hasModelSetPreview = (set: (typeof modelSets)[number]) => Boolean(
        mockupPreview?.lifestyle.some((image) => image.id === set.frontTemplateId) &&
        (!set.backTemplateId || mockupPreview?.lifestyle.some((image) => image.id === set.backTemplateId))
    );
    const hasAudienceSelection = (
        options: typeof modelSets,
        selected: LifestyleModelSetId | null
    ) => options.length === 0 || options.some((set) => set.id === selected && hasModelSetPreview(set));
    const canSaveReview = Boolean(mockupPreview) && (modelSets.length === 0 || (
        hasAudienceSelection(femaleOptions, femaleModelSet) &&
        hasAudienceSelection(maleOptions, maleModelSet)
    ));

    useEffect(() => {
        layersRef.current = layers;
    }, [layers]);

    useEffect(() => {
        const missingLayers = layersRef.current.filter((layer) =>
            layer.type === "image" && layer.src && (!layer.sourcePixelWidth || !layer.sourcePixelHeight)
        );
        if (!missingLayers.length) return;

        let cancelled = false;
        void Promise.all(missingLayers.map(async (layer) => {
            const image = await loadImage(layer.src!);
            return [layer.id, image.naturalWidth, image.naturalHeight] as const;
        })).then((dimensions) => {
            if (cancelled) return;
            const byId = new Map(dimensions.map(([id, width, height]) => [id, { width, height }]));
            setLayers((current) => current.map((layer) => {
                const size = byId.get(layer.id);
                return size ? {
                    ...layer,
                    sourcePixelWidth: size.width,
                    sourcePixelHeight: size.height,
                } : layer;
            }));
        }).catch(() => {
            // The canvas renderer reports inaccessible artwork separately.
        });

        return () => {
            cancelled = true;
        };
    }, [missingImageDimensionsKey]);

    useEffect(() => {
        const generation = ++renderGenerationRef.current;

        async function render() {
            const frame = document.createElement("canvas");
            await renderDesign(
                frame,
                layers,
                activeSide,
                garmentKind,
                garmentColor,
                selectedColorName,
                catalogProduct,
                printAreas,
                activePrintTarget,
                true,
                canvasGuideOptions,
                selectedLayerId
            );
            if (generation === renderGenerationRef.current && canvasRef.current) {
                presentCanvas(canvasRef.current, frame);
            }
        }

        render().catch((err) => {
            if (generation === renderGenerationRef.current) {
                setError(err instanceof Error ? err.message : "Could not render design preview");
            }
        });
    }, [activePrintTarget, activeSide, canvasGuideOptions, catalogProduct, garmentColor, garmentKind, layers, printAreas, selectedColorName, selectedLayerId]);

    useEffect(() => () => {
        if (dragFrameRef.current !== null) cancelAnimationFrame(dragFrameRef.current);
    }, []);

    function commitLayers(updater: (current: DesignLayer[]) => DesignLayer[]) {
        setLayers((current) => {
            const next = updater(current);
            if (next === current) return current;
            historyRef.current.past = [...historyRef.current.past.slice(-49), current];
            historyRef.current.future = [];
            setHistoryStatus({ canUndo: true, canRedo: false });
            return next;
        });
    }

    function undo() {
        const previous = historyRef.current.past.at(-1);
        if (!previous) return;
        historyRef.current.past = historyRef.current.past.slice(0, -1);
        historyRef.current.future = [layersRef.current, ...historyRef.current.future.slice(0, 49)];
        setLayers(previous);
        setSelectedLayerId(null);
        setSelectedLayerIds([]);
        setHistoryStatus({ canUndo: historyRef.current.past.length > 0, canRedo: true });
    }

    function redo() {
        const next = historyRef.current.future[0];
        if (!next) return;
        historyRef.current.future = historyRef.current.future.slice(1);
        historyRef.current.past = [...historyRef.current.past.slice(-49), layersRef.current];
        setLayers(next);
        setSelectedLayerId(null);
        setSelectedLayerIds([]);
        setHistoryStatus({ canUndo: true, canRedo: historyRef.current.future.length > 0 });
    }

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            const target = event.target as HTMLElement | null;
            if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
            if (event.code === "Space") {
                spacePressedRef.current = true;
                event.preventDefault();
                return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
                event.preventDefault();
                if (event.shiftKey) redo(); else undo();
                return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
                event.preventDefault();
                redo();
                return;
            }
            if ((event.key === "Delete" || event.key === "Backspace") && selectedLayerId) {
                event.preventDefault();
                commitLayers((current) => current.filter((layer) => !selectedLayerIds.includes(layer.id)));
                setSelectedLayerId(null);
                setSelectedLayerIds([]);
            }
        }

        function handleKeyUp(event: KeyboardEvent) {
            if (event.code === "Space") spacePressedRef.current = false;
        }

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [selectedLayerId, selectedLayerIds]);

    function selectLayer(id: string, additive = false) {
        const layer = layersRef.current.find((item) => item.id === id);
        const groupedIds = advancedMode && layer?.groupId
            ? layersRef.current.filter((item) => item.groupId === layer.groupId).map((item) => item.id)
            : [id];
        setSelectedLayerId(id);
        setSelectedLayerIds((current) => additive
            ? current.includes(id) ? current.filter((item) => !groupedIds.includes(item)) : Array.from(new Set([...current, ...groupedIds]))
            : groupedIds
        );
    }

    function updateLayer(id: string, patch: Partial<DesignLayer>) {
        commitLayers((current) =>
            current.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer))
        );
    }

    function addTextLayer() {
        const layer: DesignLayer = {
            id: uid(),
            side: activeSide,
            type: "text",
            x: 302,
            y: 420,
            width: 296,
            height: 120,
            rotation: 0,
            opacity: 1,
            text: "BAND NAME",
            fill: "#ffffff",
            fontSize: 76,
            fontFamily: "Arial",
            fontWeight: "900",
            name: "Text",
        };

        commitLayers((current) => [...current, layer]);
        selectLayer(layer.id);
        setActiveToolPanel("selection");
    }

    async function addImageLayer(file: File | null) {
        if (!file) return;
        setIsUploadingArtwork(true);
        setError(null);
        try {
            const previewSource = await readFileAsDataUrl(file);
            const image = await loadImage(previewSource);
            const upload = new FormData();
            upload.set("file", file);
            const response = await fetch("/api/designer/artwork", {
                method: "POST",
                body: upload,
            });
            const result = await response.json() as { path?: unknown; error?: unknown };
            if (!response.ok || typeof result.path !== "string") {
                throw new Error(typeof result.error === "string" ? result.error : "Could not upload artwork.");
            }

            insertImageLayer(result.path, image, {
                fileType: file.type || "Unknown",
                hasTransparency: imageHasTransparency(image),
                colorProfile: await detectColorProfile(file),
                name: file.name.replace(/\.[^.]+$/, "") || "Artwork",
            });
        } catch (error) {
            setError(error instanceof Error ? error.message : "Could not load that image. Try a PNG, JPEG or WebP file.");
        } finally {
            setIsUploadingArtwork(false);
        }
    }

    function insertImageLayer(
        source: string,
        image: HTMLImageElement,
        diagnostics: Pick<DesignLayer, "fileType" | "hasTransparency" | "colorProfile" | "name"> = {},
    ) {
        const fitted = fitImageToPrintArea(
            image.naturalWidth,
            image.naturalHeight,
            printAreas[activeSide],
        );
        const layer: DesignLayer = {
            id: uid(),
            side: activeSide,
            type: "image",
            x: fitted.x,
            y: fitted.y,
            width: fitted.width,
            height: fitted.height,
            rotation: 0,
            opacity: 1,
            src: source,
            aspectRatio: image.naturalWidth / image.naturalHeight,
            sourcePixelWidth: image.naturalWidth,
            sourcePixelHeight: image.naturalHeight,
            name: diagnostics.name ?? "Artwork",
            fileType: diagnostics.fileType,
            hasTransparency: diagnostics.hasTransparency,
            colorProfile: diagnostics.colorProfile,
        };
        commitLayers((current) => [...current, layer]);
        selectLayer(layer.id);
        setActiveToolPanel("selection");
    }

    async function addRecentArtwork(asset: ArtistArtworkAsset) {
        setIsUploadingArtwork(true);
        setError(null);
        try {
            const image = await loadImage(asset.previewUrl);
            insertImageLayer(asset.path, image);
            setIsArtworkLibraryOpen(false);
        } catch {
            setError("That saved artwork could not be loaded. Try uploading it again.");
        } finally {
            setIsUploadingArtwork(false);
        }
    }

    function removeSelectedLayer() {
        if (!selectedLayerIds.length) return;
        commitLayers((current) => current.filter((layer) => !selectedLayerIds.includes(layer.id)));
        setSelectedLayerId(null);
        setSelectedLayerIds([]);
    }

    async function replaceSelectedArtwork(file: File | null) {
        if (!file || selectedLayer?.type !== "image") return;
        setIsUploadingArtwork(true);
        setError(null);
        try {
            const previewSource = await readFileAsDataUrl(file);
            const image = await loadImage(previewSource);
            const upload = new FormData();
            upload.set("file", file);
            const response = await fetch("/api/designer/artwork", { method: "POST", body: upload });
            const result = await response.json() as { path?: unknown; error?: unknown };
            if (!response.ok || typeof result.path !== "string") {
                throw new Error(typeof result.error === "string" ? result.error : "Could not replace artwork.");
            }
            updateLayer(selectedLayer.id, {
                src: result.path,
                aspectRatio: image.naturalWidth / image.naturalHeight,
                sourcePixelWidth: image.naturalWidth,
                sourcePixelHeight: image.naturalHeight,
                fileType: file.type || "Unknown",
                hasTransparency: imageHasTransparency(image),
                colorProfile: await detectColorProfile(file),
                name: file.name.replace(/\.[^.]+$/, "") || selectedLayer.name,
            });
        } catch (error) {
            setError(error instanceof Error ? error.message : "Could not replace artwork.");
        } finally {
            setIsUploadingArtwork(false);
        }
    }

    function applyQuickAction(action: LayerQuickAction) {
        if (!selectedLayer) return;
        const area = printAreas[selectedLayer.side];
        updateLayer(selectedLayer.id, getLayerQuickActionPatch(selectedLayer, area, action));
    }

    function reorderLayer(id: string, direction: -1 | 1) {
        commitLayers((current) => {
            const index = current.findIndex((layer) => layer.id === id);
            if (index < 0) return current;
            const target = clamp(index + direction, 0, current.length - 1);
            if (target === index) return current;
            const next = [...current];
            const [layer] = next.splice(index, 1);
            next.splice(target, 0, layer);
            return next;
        });
    }

    function duplicateSelectedLayers() {
        if (!selectedLayers.length) return;
        const duplicates = selectedLayers.map((layer) => ({
            ...layer,
            id: uid(),
            x: clamp(layer.x + 12, 0, CANVAS_WIDTH - layer.width),
            y: clamp(layer.y + 12, 0, CANVAS_HEIGHT - layer.height),
            name: `${layer.name ?? (layer.type === "text" ? "Text" : "Artwork")} copy`,
        }));
        commitLayers((current) => [...current, ...duplicates]);
        setSelectedLayerIds(duplicates.map((layer) => layer.id));
        setSelectedLayerId(duplicates.at(-1)?.id ?? null);
    }

    function groupSelectedLayers() {
        if (selectedLayerIds.length < 2) return;
        const groupId = uid();
        commitLayers((current) => current.map((layer) => selectedLayerIds.includes(layer.id)
            ? { ...layer, groupId }
            : layer
        ));
    }

    function ungroupSelectedLayers() {
        const groupIds = new Set(selectedLayers.map((layer) => layer.groupId).filter(Boolean));
        commitLayers((current) => current.map((layer) => layer.groupId && groupIds.has(layer.groupId)
            ? { ...layer, groupId: undefined }
            : layer
        ));
    }

    function alignSelectedLayers(mode: "left" | "center-x" | "right" | "top" | "center-y" | "bottom" | "space-x" | "space-y") {
        if (selectedLayers.length < 2) return;
        const left = Math.min(...selectedLayers.map((layer) => layer.x));
        const right = Math.max(...selectedLayers.map((layer) => layer.x + layer.width));
        const top = Math.min(...selectedLayers.map((layer) => layer.y));
        const bottom = Math.max(...selectedLayers.map((layer) => layer.y + layer.height));
        const sorted = [...selectedLayers].sort((a, b) => mode === "space-x" ? a.x - b.x : a.y - b.y);
        const first = sorted[0];
        const last = sorted.at(-1)!;
        commitLayers((current) => current.map((layer) => {
            if (!selectedLayerIds.includes(layer.id)) return layer;
            if (mode === "left") return { ...layer, x: left };
            if (mode === "center-x") return { ...layer, x: (left + right - layer.width) / 2 };
            if (mode === "right") return { ...layer, x: right - layer.width };
            if (mode === "top") return { ...layer, y: top };
            if (mode === "center-y") return { ...layer, y: (top + bottom - layer.height) / 2 };
            if (mode === "bottom") return { ...layer, y: bottom - layer.height };
            const index = sorted.findIndex((item) => item.id === layer.id);
            if (mode === "space-x") {
                const step = (last.x - first.x) / Math.max(1, sorted.length - 1);
                return { ...layer, x: first.x + step * index };
            }
            const step = (last.y - first.y) / Math.max(1, sorted.length - 1);
            return { ...layer, y: first.y + step * index };
        }));
    }

    function copyPlacement() {
        if (!selectedLayer) return;
        const area = printAreas[selectedLayer.side];
        localStorage.setItem("merch-tent-designer-placement", JSON.stringify({
            x: (selectedLayer.x - area.x) / area.width,
            y: (selectedLayer.y - area.y) / area.height,
            width: selectedLayer.width / area.width,
            height: selectedLayer.height / area.height,
            rotation: selectedLayer.rotation,
        }));
    }

    function pastePlacement() {
        if (!selectedLayer) return;
        try {
            const placement = JSON.parse(localStorage.getItem("merch-tent-designer-placement") ?? "null") as {
                x: number; y: number; width: number; height: number; rotation: number;
            } | null;
            if (!placement) return;
            const area = printAreas[selectedLayer.side];
            updateLayer(selectedLayer.id, {
                x: area.x + placement.x * area.width,
                y: area.y + placement.y * area.height,
                width: placement.width * area.width,
                height: placement.height * area.height,
                rotation: placement.rotation,
            });
        } catch {
            setError("The copied placement could not be read.");
        }
    }

    function copyToOtherSide() {
        if (!selectedLayer || isSingleSided) return;
        const sourceArea = printAreas[selectedLayer.side];
        const targetSide: Side = selectedLayer.side === "front" ? "back" : "front";
        const targetArea = printAreas[targetSide];
        const duplicate: DesignLayer = {
            ...selectedLayer,
            id: uid(),
            side: targetSide,
            x: targetArea.x + (selectedLayer.x - sourceArea.x) / sourceArea.width * targetArea.width,
            y: targetArea.y + (selectedLayer.y - sourceArea.y) / sourceArea.height * targetArea.height,
            width: selectedLayer.width / sourceArea.width * targetArea.width,
            height: selectedLayer.height / sourceArea.height * targetArea.height,
            name: `${selectedLayer.name ?? "Layer"} ${targetSide}`,
        };
        commitLayers((current) => [...current, duplicate]);
        setActiveSide(targetSide);
        selectLayer(duplicate.id);
    }

    function downloadTemplate() {
        const area = printAreas[activeSide];
        const safeInset = Math.max(10, Math.min(area.width, area.height) * 0.05);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${activePrintTarget.width}" height="${activePrintTarget.height}" viewBox="0 0 ${activePrintTarget.width} ${activePrintTarget.height}"><rect width="100%" height="100%" fill="none" stroke="#ef4444" stroke-width="8"/><rect x="${activePrintTarget.width * safeInset / area.width}" y="${activePrintTarget.height * safeInset / area.height}" width="${activePrintTarget.width * (area.width - safeInset * 2) / area.width}" height="${activePrintTarget.height * (area.height - safeInset * 2) / area.height}" fill="none" stroke="#22c55e" stroke-width="6" stroke-dasharray="24 16"/><text x="24" y="48" font-family="Arial" font-size="28" font-weight="700">${catalogProduct.name} - ${activeSide} - ${activePrintTarget.width} x ${activePrintTarget.height} px</text></svg>`;
        downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${catalogProduct.model}-${activeSide}-template.svg`);
    }

    function exportProof() {
        const source = canvasRef.current;
        if (!source) return;
        const proof = document.createElement("canvas");
        proof.width = 1200;
        proof.height = 1700;
        const ctx = proof.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, proof.width, proof.height);
        ctx.fillStyle = "#b7ff3c";
        ctx.font = "700 22px Arial";
        ctx.fillText("MERCH TENT PRODUCTION PROOF", 60, 60);
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 34px Arial";
        ctx.fillText(productTitlePreview, 60, 110);
        ctx.font = "700 20px Arial";
        ctx.fillText(`${catalogProduct.name} / ${activeSide.toUpperCase()}`, 60, 150);
        ctx.font = "16px Arial";
        ctx.fillStyle = "#a3a3a3";
        ctx.fillText(`Print area: ${activePrintTarget.width} x ${activePrintTarget.height} px`, 60, 182);
        ctx.drawImage(source, 150, 220, 900, 1200);
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 18px Arial";
        ctx.fillText("PREFLIGHT", 60, 1470);
        ctx.font = "15px Arial";
        preflightChecks.slice(0, 6).forEach((check, index) => {
            ctx.fillStyle = check.level === "pass" ? "#b7ff3c" : "#fbbf24";
            ctx.fillText(`${check.level === "pass" ? "PASS" : "CHECK"}: ${check.message}`, 60, 1505 + index * 28);
        });
        proof.toBlob((blob) => {
            if (blob) downloadBlob(blob, `${catalogProduct.model}-${activeSide}-proof.png`);
        }, "image/png");
    }

    function getCanvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
        const canvas = event.currentTarget;
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
            y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
        };
    }

    function snapValue(value: number) {
        return advancedMode && snapEnabled ? Math.round(value / gridSize) * gridSize : value;
    }

    function queueDragUpdate(id: string, patch: Partial<DesignLayer>) {
        pendingDragUpdateRef.current = { id, patch };
        if (dragFrameRef.current !== null) return;
        dragFrameRef.current = requestAnimationFrame(() => {
            const pending = pendingDragUpdateRef.current;
            pendingDragUpdateRef.current = null;
            dragFrameRef.current = null;
            if (!pending) return;
            setLayers((current) =>
                current.map((layer) => layer.id === pending.id ? { ...layer, ...pending.patch } : layer)
            );
        });
    }

    function flushDragUpdate() {
        if (dragFrameRef.current !== null) {
            cancelAnimationFrame(dragFrameRef.current);
            dragFrameRef.current = null;
        }
        const pending = pendingDragUpdateRef.current;
        pendingDragUpdateRef.current = null;
        if (!pending) return;
        setLayers((current) =>
            current.map((layer) => layer.id === pending.id ? { ...layer, ...pending.patch } : layer)
        );
    }

    function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
        if (spacePressedRef.current) return;
        const point = getCanvasPoint(event);
        const currentSelected = activeLayers.find((layer) => layer.id === selectedLayerId);

        if (currentSelected && !currentSelected.locked) {
            const handles = layerHandles(currentSelected);
            if (pointNear(point, handles.rotate)) {
                dragHistorySnapshotRef.current = layersRef.current;
                dragRef.current = {
                    id: currentSelected.id,
                    mode: "rotate",
                    centerX: handles.centerX,
                    centerY: handles.centerY,
                    startAngle: Math.atan2(point.y - handles.centerY, point.x - handles.centerX),
                    startRotation: currentSelected.rotation,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
                return;
            }
            if (pointNear(point, handles.resize)) {
                dragHistorySnapshotRef.current = layersRef.current;
                dragRef.current = {
                    id: currentSelected.id,
                    mode: "resize",
                    centerX: handles.centerX,
                    centerY: handles.centerY,
                    startDistance: Math.max(1, Math.hypot(point.x - handles.centerX, point.y - handles.centerY)),
                    startWidth: currentSelected.width,
                    startHeight: currentSelected.height,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
                return;
            }
        }

        const hit = [...activeLayers]
            .filter((layer) => !layer.hidden)
            .reverse()
            .find((layer) => pointHitsLayer(point, layer));

        if (!hit) {
            setSelectedLayerId(null);
            if (!event.shiftKey) setSelectedLayerIds([]);
            return;
        }

        selectLayer(hit.id, advancedMode && event.shiftKey);
        setActiveToolPanel("selection");
        if (hit.locked) return;
        dragHistorySnapshotRef.current = layersRef.current;
        dragRef.current = {
            id: hit.id,
            mode: "move",
            offsetX: point.x - hit.x,
            offsetY: point.y - hit.y,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    }

    function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
        const drag = dragRef.current;
        if (!drag) return;
        const point = getCanvasPoint(event);
        const layer = layersRef.current.find((item) => item.id === drag.id);
        if (!layer) return;

        if (drag.mode === "move") {
            const nextX = clamp(snapValue(point.x - drag.offsetX), 0, CANVAS_WIDTH - layer.width);
            const nextY = clamp(snapValue(point.y - drag.offsetY), 0, CANVAS_HEIGHT - layer.height);
            const movingIds = layer.groupId
                ? layersRef.current.filter((item) => item.groupId === layer.groupId).map((item) => item.id)
                : selectedLayerIds.includes(layer.id) && selectedLayerIds.length > 1 ? selectedLayerIds : [layer.id];
            const deltaX = nextX - layer.x;
            const deltaY = nextY - layer.y;
            setLayers((current) => current.map((item) => movingIds.includes(item.id)
                ? {
                    ...item,
                    x: clamp(item.x + deltaX, 0, CANVAS_WIDTH - item.width),
                    y: clamp(item.y + deltaY, 0, CANVAS_HEIGHT - item.height),
                }
                : item
            ));
            return;
        }

        if (drag.mode === "resize") {
            const distance = Math.hypot(point.x - drag.centerX, point.y - drag.centerY);
            const scale = clamp(distance / drag.startDistance, 0.2, 4);
            const width = clamp(drag.startWidth * scale, 60, 650);
            const height = lockAspectRatio
                ? clamp(width / (layer.aspectRatio ?? drag.startWidth / drag.startHeight), 40, 760)
                : clamp(drag.startHeight * scale, 40, 760);
            queueDragUpdate(drag.id, {
                width: snapValue(width),
                height: snapValue(height),
                x: snapValue(drag.centerX - width / 2),
                y: snapValue(drag.centerY - height / 2),
            });
            return;
        }

        const angle = Math.atan2(point.y - drag.centerY, point.x - drag.centerX);
        const rotation = drag.startRotation + ((angle - drag.startAngle) * 180) / Math.PI;
        queueDragUpdate(drag.id, { rotation: Math.round(rotation) });
    }

    function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
        flushDragUpdate();
        if (dragHistorySnapshotRef.current) {
            historyRef.current.past = [...historyRef.current.past.slice(-49), dragHistorySnapshotRef.current];
            historyRef.current.future = [];
            dragHistorySnapshotRef.current = null;
            setHistoryStatus({ canUndo: true, canRedo: false });
        }
        dragRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    }

    function handleWorkspacePointerDown(event: React.PointerEvent<HTMLDivElement>) {
        if (!advancedMode || !spacePressedRef.current || !workspaceRef.current) return;
        const workspace = workspaceRef.current;
        panRef.current = {
            x: event.clientX,
            y: event.clientY,
            left: workspace.scrollLeft,
            top: workspace.scrollTop,
        };
        workspace.setPointerCapture(event.pointerId);
        event.preventDefault();
    }

    function handleWorkspacePointerMove(event: React.PointerEvent<HTMLDivElement>) {
        if (!panRef.current || !workspaceRef.current) return;
        workspaceRef.current.scrollLeft = panRef.current.left - (event.clientX - panRef.current.x);
        workspaceRef.current.scrollTop = panRef.current.top - (event.clientY - panRef.current.y);
    }

    function handleWorkspacePointerUp(event: React.PointerEvent<HTMLDivElement>) {
        panRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    }

    function buildDesignPayload(color = selectedColor) {
        const sourceArea = selectedPosterFormat
            ? posterCanvasArea(selectedPosterFormat.width, selectedPosterFormat.height)
            : printAreas.front;
        const resolvedPosterLayouts = garmentKind === "poster"
            ? posterFormats.map((format) => ({
                key: format.key,
                layers: omitInlineLayerSources(format.key === selectedPosterFormat?.key
                    ? layers
                    : posterLayouts[format.key] ?? remapPosterLayers(
                        layers,
                        sourceArea,
                        posterCanvasArea(format.width, format.height),
                    )),
            }))
            : undefined;
        return {
            version: 1 as const,
            templateKey: `merch-tent-${garmentKind}-v1`,
            catalogProduct: {
                key: catalogProduct.key,
                name: catalogProduct.name,
                brand: catalogProduct.brand,
                model: catalogProduct.model,
                category: catalogProduct.category,
                supplier: catalogProduct.supplier,
                providerOptions: catalogProduct.providerOptions ?? [],
                sizes: catalogProduct.sizes,
                colors: catalogProduct.colors,
                production: catalogProduct.production,
            },
            printSideCount,
            posterFormatKey: selectedPosterFormat?.key,
            posterFormats,
            posterLayouts: resolvedPosterLayouts,
            canvas: {
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
            },
            printAsset: {
                width: PRINT_ASSET_WIDTH,
                height: PRINT_ASSET_HEIGHT,
                format: "image/png" as const,
            },
            garment: {
                kind: garmentKind,
                color: color?.value ?? garmentColor,
                colorLabel: color?.label ?? "Designed",
                supplierColorName: color?.supplierColorName ?? color?.label ?? "Designed",
            },
            printAreas,
            normalizedPrintAreas: normalizeGeometryAreas(printAreas, CANVAS_WIDTH, CANVAS_HEIGHT),
            layers,
        };
    }

    function changePosterFormat(nextKey: string) {
        const next = posterFormatForKey(posterFormats, nextKey);
        if (!next || next.key === selectedPosterFormat?.key) return;
        const sourceArea = selectedPosterFormat
            ? posterCanvasArea(selectedPosterFormat.width, selectedPosterFormat.height)
            : printAreas.front;
        const targetArea = posterCanvasArea(next.width, next.height);
        const nextLayers = posterLayouts[next.key] ?? remapPosterLayers(layers, sourceArea, targetArea);
        if (selectedPosterFormat?.key) {
            setPosterLayouts((current) => ({
                ...current,
                [selectedPosterFormat.key]: layers,
                [next.key]: nextLayers,
            }));
        }
        setLayers(nextLayers);
        setSelectedLayerId(null);
        setSelectedPosterFormatKey(next.key);
        setMockupPreview(null);
    }

    function chooseModelSets(preview: DesignerMockupPreview) {
        const randomItem = <T,>(items: T[]) => {
            const values = new Uint32Array(1);
            crypto.getRandomValues(values);
            return items[values[0] % items.length];
        };
        const available = (audience: "female" | "male") => modelSets.filter((set) =>
            set.audience === audience &&
            preview.lifestyle.some((image) => image.id === set.frontTemplateId) &&
            (!set.backTemplateId || preview.lifestyle.some((image) => image.id === set.backTemplateId))
        );
        const females = available("female");
        const males = available("male");
        if (females.length) {
            setFemaleModelSet((current) => females.some((set) => set.id === current)
                ? current
                : randomItem(females).id);
        }
        if (males.length) {
            setMaleModelSet((current) => males.some((set) => set.id === current)
                ? current
                : randomItem(males).id);
        }
        if ((femaleOptions.length > 0 && females.length === 0) || (maleOptions.length > 0 && males.length === 0)) {
            setError("Some model photos could not be generated. Try again before saving.");
        }
    }

    async function openPreview(view: "mockups" | "review") {
        if (isGeneratingMockups || isUploadingArtwork) return;
        if (saleColors.length === 0) {
            setError("Choose at least one colour to sell.");
            setActiveView("colors");
            return;
        }
        if (view === "review" && (layers.length === 0 || !title.trim())) {
            setError("Add artwork and a drop name before reviewing the listing.");
            return;
        }
        if (view === "review" && activeView === "mockups" && mockupPreview) {
            chooseModelSets(mockupPreview);
            setActiveView("review");
            return;
        }
        setActiveView(view);
        setIsGeneratingMockups(true);
        setMockupPreview(null);
        setError(null);

        try {
            const preview = JSON.parse(await generateDesignerMockupPreviewAction(
                JSON.stringify(buildDesignPayload(listingColor)),
                JSON.stringify(saleColorNames)
            )) as DesignerMockupPreview;
            setMockupPreview(preview);
            if (view === "review") chooseModelSets(preview);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Could not generate mockups");
        } finally {
            setIsGeneratingMockups(false);
        }
    }

    function handleViewMockups() {
        setError(null);
        setActiveView("colors");
    }

    async function handleSave(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isSaving || isUploadingArtwork) return;
        if (activeView !== "review") {
            setActiveView("colors");
            return;
        }
        if (!title.trim()) {
            setError("Enter a drop name before saving the product.");
            setActiveView("designer");
            setActiveToolPanel("product");
            return;
        }
        if (layers.length === 0) {
            setError("Add artwork or text before saving the product.");
            return;
        }
        if (!canSaveReview) {
            setError("Choose one available model from each listed group before saving.");
            return;
        }

        const shouldPublish = saveModeRef.current === "publish";
        setSavingMode(saveModeRef.current);
        setIsSaving(true);
        setError(null);

        try {
            const designPayload = buildDesignPayload(listingColor);

            const formData = new FormData();
            if (initialProduct) formData.set("product_id", initialProduct.id);
            formData.set("drop_name", title.trim());
            formData.set("description", description);
            formData.set("price", price);
            formData.set("category", category);
            formData.set("garment_color", listingColor.value);
            formData.set("garment_label", listingColor.label);
            formData.set("sale_color_names", JSON.stringify(saleColorNames));
            formData.set("design_json", JSON.stringify(designPayload));
            formData.set("catalog_product_key", catalogProduct.key);
            formData.set("supplier_key", catalogProduct.supplier.key);
            formData.set("supplier_product_id", catalogProduct.supplier.externalProductId);
            formData.set("supplier_automation_mode", catalogProduct.supplier.automationMode);
            formData.set("provider_options_json", JSON.stringify(catalogProduct.providerOptions ?? []));
            if (femaleModelSet) formData.set("female_model_set", femaleModelSet);
            if (maleModelSet) formData.set("male_model_set", maleModelSet);
            if (catalogProduct.supplier.printify) {
                formData.set("printify_blueprint_id", String(catalogProduct.supplier.printify.blueprintId));
                if (catalogProduct.supplier.printify.printProviderId) {
                    formData.set("printify_print_provider_id", String(catalogProduct.supplier.printify.printProviderId));
                }
                if (catalogProduct.supplier.printify.variantIds.length) {
                    formData.set("printify_variant_ids", catalogProduct.supplier.printify.variantIds.join(","));
                }
            }
            if (shouldPublish) formData.set("publish", "on");

            await createDesignedProductAction(formData);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Could not save design");
            setIsSaving(false);
        }
    }

    const sizeGuide = catalogProduct.production.customerInfo?.sizeGuide;

    return (
        <form
            onSubmit={handleSave}
            className="relative grid h-full min-h-0 flex-1 gap-0 overflow-hidden border border-neutral-800 bg-black xl:grid-cols-[360px_minmax(0,1fr)_320px]"
        >
            {activeView !== "designer" ? (
                <section className="absolute inset-0 z-30 flex min-h-0 flex-col bg-black">
                    <div className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-800 bg-neutral-950 p-4">
                        <button
                            type="button"
                            onClick={() => setActiveView(activeView === "review" ? "mockups" : activeView === "mockups" ? "colors" : "designer")}
                            className="inline-flex h-10 items-center gap-2 border border-neutral-700 px-4 text-sm font-black text-white transition hover:border-lime-300 hover:text-lime-300"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sm:hidden">Back</span>
                            <span className="hidden sm:inline">Back</span>
                        </button>
                        <div className="flex items-center gap-4">
                            {activeView === "mockups" && mockupPreview ? (
                                <button
                                    type="button"
                                    onClick={() => void openPreview("review")}
                                    className="inline-flex h-10 items-center gap-2 bg-lime-300 px-4 text-sm font-black text-black hover:bg-lime-200"
                                >
                                    Review listing <ArrowRight className="h-4 w-4" />
                                </button>
                            ) : null}
                            <div className="hidden text-right sm:block">
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-lime-300">{activeView === "review" ? "Final review" : activeView === "colors" ? "Colours to sell" : "Store preview"}</p>
                                <p className="mt-1 text-sm font-black uppercase text-white">{activeView === "review" ? "Choose photos and check the listing" : activeView === "colors" ? "Choose the final range" : "Generated by Merch Tent"}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex min-h-0 flex-1">
                        {activeView === "colors" ? (
                            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 md:px-10">
                                <div className="mx-auto max-w-4xl">
                                    <p className="text-xs font-black uppercase text-lime-300">Colours to sell</p>
                                    <h2 className="mt-2 text-3xl font-black uppercase">Choose the final colours.</h2>
                                    <p className="mt-3 text-sm text-neutral-400">
                                        {isSingleSided ? "Your front artwork" : "Your front and back artwork"} is shared across every selected colour. The colour you used while designing was only a preview.
                                    </p>
                                    <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        {catalogProduct.colors.map((item) => {
                                            const name = item.supplierColorName ?? item.label;
                                            const checked = saleColorNames.includes(name);
                                            return <label key={name} className={`flex items-center gap-3 border p-4 ${checked ? "cursor-pointer border-lime-300 bg-lime-300/10" : saleColorNames.length >= 6 ? "cursor-not-allowed border-neutral-800 bg-neutral-950 opacity-50" : "cursor-pointer border-neutral-700 bg-neutral-950"}`}>
                                                <input type="checkbox" checked={checked} disabled={!checked && saleColorNames.length >= 6} onChange={() => { setSaleColorNames((current) => checked ? current.filter((value) => value !== name) : [...current, name]); setMockupPreview(null); setError(null); }} className="h-5 w-5 accent-lime-300" />
                                                <span className="h-7 w-7 shrink-0 border border-white/30" style={{ backgroundColor: item.value }} />
                                                <span className="text-sm font-bold">{item.label}</span>
                                            </label>;
                                        })}
                                    </div>
                                    <p className="mt-5 text-xs text-neutral-400">Choose up to six colours. Supplier photography is used where configured; other colours use generated product previews.</p>
                                    {error ? <p className="mt-4 text-sm text-red-300" role="alert">{error}</p> : null}
                                    <button type="button" disabled={!saleColors.length || isGeneratingMockups || isUploadingArtwork} onClick={() => void openPreview("mockups")} className="mt-7 inline-flex h-11 items-center gap-2 bg-lime-300 px-5 text-sm font-black text-black disabled:opacity-50">Generate mockups <ArrowRight className="h-4 w-4" /></button>
                                </div>
                            </div>
                        ) : isGeneratingMockups ? (
                            <div className="m-5 grid w-full place-items-center border border-neutral-800 bg-neutral-950">
                                <div className="text-center">
                                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-lime-300" />
                                    <p className="mt-4 text-sm font-black uppercase tracking-[0.16em]">Generating mockups</p>
                                    <p className="mt-2 text-xs text-neutral-500">Applying artwork, colour, lighting and texture.</p>
                                </div>
                            </div>
                        ) : mockupPreview ? activeView === "mockups" ? (
                            <MockupGallery preview={mockupPreview} />
                        ) : (
                            <DesignerListingReview
                                preview={mockupPreview}
                                modelSets={modelSets}
                                femaleModelSet={femaleModelSet}
                                maleModelSet={maleModelSet}
                                onSelectFemale={setFemaleModelSet}
                                onSelectMale={setMaleModelSet}
                                artistName={artistName}
                                title={productTitlePreview}
                                description={description}
                                category={category}
                                priceCents={activePriceCents}
                                sizes={catalogProduct.sizes}
                                hasFrontDesign={hasFrontDesign}
                                hasBackDesign={hasBackDesign}
                            />
                        ) : (
                            <div className="m-5 grid w-full place-items-center border border-red-500/30 bg-red-500/10 p-6 text-center">
                                <div>
                                    <p className="text-lg font-black uppercase text-red-100">Mockup could not be generated</p>
                                    <p className="mt-2 text-sm text-red-200/70">{error ?? "Return to the designer and try again."}</p>
                                    <button
                                        type="button"
                                        onClick={() => void openPreview(activeView)}
                                        className="mt-5 bg-lime-300 px-5 py-3 text-sm font-black text-black hover:bg-lime-200"
                                    >
                                        Try again
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    {activeView === "review" && mockupPreview && !isGeneratingMockups ? (
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-neutral-800 bg-neutral-950 p-4">
                            {error ? <p className="mr-auto text-sm text-red-300" role="alert">{error}</p> : null}
                            <Button
                                type="submit"
                                onClick={() => { saveModeRef.current = "draft"; }}
                                disabled={isSaving || isUploadingArtwork || !canSaveReview}
                                className="h-11 border border-neutral-700 bg-black px-5 font-black hover:bg-neutral-900"
                            >
                                {isSaving && savingMode === "draft" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save draft
                            </Button>
                            <Button
                                type="submit"
                                onClick={() => { saveModeRef.current = "publish"; }}
                                disabled={isSaving || isUploadingArtwork || !canSaveReview}
                                className="h-11 bg-lime-300 px-5 font-black text-black hover:bg-lime-200"
                            >
                                {isSaving && savingMode === "publish" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save and publish to shop
                            </Button>
                        </div>
                    ) : null}
                </section>
            ) : null}

            <section className="flex min-h-0 flex-col border-b border-neutral-800 bg-neutral-950 xl:border-b-0 xl:border-r">
                <div className={`grid border-b border-neutral-800 ${advancedMode ? "grid-cols-5" : "grid-cols-4"}`}>
                    {([
                        ["product", Shirt, "Product"],
                        ["blank", ClipboardList, "Specs"],
                        ["layers", Layers, "Layers"],
                        ["selection", RotateCw, "Edit"],
                        ...(advancedMode ? [["advanced", Grid3X3, "Advanced"] as const] : []),
                    ] as Array<readonly [ToolPanel, typeof Shirt, string]>).map(([panel, Icon, label]) => (
                        <button
                            key={panel}
                            type="button"
                            onClick={() => setActiveToolPanel(panel)}
                            className={`flex h-16 flex-col items-center justify-center gap-1 border-r border-neutral-800 text-[10px] font-black uppercase tracking-[0.12em] last:border-r-0 ${
                                activeToolPanel === panel ? "bg-lime-300 text-black" : "text-neutral-500 hover:text-white"
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </button>
                    ))}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {activeToolPanel === "product" ? (
                        <div className="space-y-4">
                            {initialProduct?.referenceImageUrl && layers.length === 0 ? (
                                <div className="border border-amber-500/50 bg-amber-500/10 p-3">
                                    <p className="text-sm font-bold text-amber-200">Artwork needs to be added again</p>
                                    <p className="mt-1 text-xs leading-5 text-neutral-300">This product saved a mockup, but its editable layers were lost when generation failed. Use the image below as a reference, then add your artwork or text to the canvas.</p>
                                    <Image src={initialProduct.referenceImageUrl} alt="Previous product mockup for reference" width={320} height={320} className="mt-3 w-full object-contain" unoptimized />
                                </div>
                            ) : null}
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#b7ff3c]">
                                    Product details
                                </p>
                                <h2 className="mt-2 text-2xl font-black uppercase">Name the drop.</h2>
                            </div>
                            <label className="block">
                                <span className="mb-1 block text-[11px] uppercase tracking-wide text-neutral-400">
                                    Drop name <span aria-hidden="true">*</span>
                                </span>
                                <input
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                    required
                                    maxLength={80}
                                    disabled={isSaving}
                                    className="h-11 w-full border border-neutral-700 bg-black px-3 text-sm outline-none"
                                    placeholder="e.g. Anniversary Edition"
                                />
                                <span className="mt-2 block border border-neutral-800 bg-black p-3 text-xs leading-5 text-neutral-400">
                                    <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                                        Shop name preview
                                    </span>
                                    <span className="mt-1 block font-black text-white">{productTitlePreview}</span>
                                    <span className="mt-1 block">
                                        Artist name is locked first and {catalogProduct.name} is locked last. Enter the
                                        distinctive drop name that appears between them.
                                    </span>
                                </span>
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-[11px] uppercase tracking-wide text-neutral-400">
                                    Description
                                </span>
                                <textarea
                                    value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                    disabled={isSaving}
                                    rows={5}
                                    className="w-full border border-neutral-700 bg-black px-3 py-2 text-sm outline-none"
                                    placeholder="Drop details"
                                />
                            </label>
                            <div className="border border-neutral-800 bg-black p-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                                    Shop category
                                </p>
                                <p className="mt-1 text-sm font-black uppercase text-white">{category}</p>
                                <p className="mt-1 text-xs leading-5 text-neutral-500">
                                    Locked from the catalogue product selected before opening the designer.
                                </p>
                            </div>
                        </div>
                    ) : null}

                    {activeToolPanel === "blank" ? (
                        <div className="space-y-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#b7ff3c]">
                                    Product specs
                                </p>
                                <h2 className="mt-2 text-2xl font-black uppercase">{catalogProduct.name}</h2>
                                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">
                                    {catalogProduct.brand} {catalogProduct.model}
                                </p>
                            </div>
                            <p className="border border-neutral-800 bg-black p-3 text-xs leading-5 text-neutral-400">
                                {catalogProduct.production.method} print. Made to order after the first sale.
                            </p>
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                <div className="border border-neutral-800 bg-black p-2">
                                    <b className="block text-white">{catalogProduct.sizes.length}</b>
                                    <span className="uppercase tracking-wide text-neutral-500">Sizes</span>
                                </div>
                                <div className="border border-neutral-800 bg-black p-2">
                                    <b className="block text-white">{catalogProduct.colors.length}</b>
                                    <span className="uppercase tracking-wide text-neutral-500">Colours</span>
                                </div>
                                <div className="border border-neutral-800 bg-black p-2">
                                    <b className="block text-white">Sale</b>
                                    <span className="uppercase tracking-wide text-neutral-500">Sync</span>
                                </div>
                            </div>
                            {designerPreviewColors.length < catalogProduct.colors.length ? (
                                <div className="border border-amber-400/40 bg-amber-400/10 p-3 text-[11px] leading-4 text-amber-100">
                                    <b className="block font-black uppercase text-amber-300">Preview availability</b>
                                    <span className="mt-1 block">
                                        All {catalogProduct.colors.length} colours can be sold. Dimmed colours only lack
                                        product photography for this design preview.
                                    </span>
                                </div>
                            ) : null}
                            <div className="grid grid-cols-2 gap-2">
                                {catalogProduct.colors.map((item) => {
                                    const colorName = item.supplierColorName ?? item.label;
                                    const hasPreview = designerPreviewColorNames.has(colorName);
                                    return (
                                    <button
                                        key={colorName}
                                        type="button"
                                        disabled={!hasPreview}
                                        aria-label={hasPreview
                                            ? `${item.label}: preview ready`
                                            : `${item.label}: available to sell, product preview unavailable`}
                                        title={hasPreview ? `Preview ${item.label}` : `${item.label} needs a product preview image`}
                                        onClick={() => setSelectedColorName(colorName)}
                                        className={`flex min-h-12 items-center gap-2 border px-2 py-1.5 text-xs ${
                                            selectedColorName === colorName
                                                ? "border-lime-300 bg-lime-300/15"
                                                : hasPreview
                                                    ? "border-neutral-700 bg-black"
                                                    : "cursor-not-allowed border-neutral-800 bg-neutral-950 text-neutral-600 opacity-45"
                                        }`}
                                    >
                                        <span
                                            className="h-4 w-4 rounded-full border border-white/20"
                                            style={{ backgroundColor: item.value }}
                                        />
                                        <span className="min-w-0 text-left">
                                            <span className="block truncate">{item.label}</span>
                                            <span className={`mt-0.5 block text-[9px] font-black uppercase ${
                                                hasPreview ? "text-lime-300" : "text-amber-300"
                                            }`}>
                                                {hasPreview ? "Preview ready" : "Available · no preview"}
                                            </span>
                                        </span>
                                    </button>
                                    );
                                })}
                            </div>
                            {designerPreviewColors.length < catalogProduct.colors.length ? (
                                <p className="text-[11px] leading-4 text-neutral-500">
                                    {designerPreviewColors.length} of {catalogProduct.colors.length} colours currently have product image previews.
                                    Choose the full range later under Colours to sell.
                                </p>
                            ) : null}
                            {catalogProduct.production.customerInfo ? (
                                <div className="border-t border-neutral-800 pt-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                                        Specifications
                                    </p>
                                    {catalogProduct.production.customerInfo.about ? (
                                        <p className="mt-3 text-xs leading-5 text-neutral-400">
                                            {catalogProduct.production.customerInfo.about}
                                        </p>
                                    ) : null}
                                    <dl className="mt-3 divide-y divide-neutral-800 border-y border-neutral-800">
                                        {catalogProduct.production.customerInfo.features.map((feature) => (
                                            <div key={feature.title} className="py-3">
                                                <dt className="text-xs font-black uppercase text-white">{feature.title}</dt>
                                                <dd className="mt-1 text-xs leading-5 text-neutral-400">{feature.description}</dd>
                                            </div>
                                        ))}
                                    </dl>

                                    {sizeGuide ? (
                                        <div className="mt-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                                                Size guide / cm
                                            </p>
                                            <div className="mt-2 divide-y divide-neutral-800 border-y border-neutral-800 text-[11px]">
                                                {sizeGuide.measurements.map((item) => (
                                                    <section key={item.size} className="py-3">
                                                        <h3 className="font-black uppercase text-white">{item.size}</h3>
                                                        <dl className="mt-2 divide-y divide-neutral-900">
                                                            {item.width !== undefined ? (
                                                                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-1.5">
                                                                    <dt className="font-black uppercase text-neutral-500">Width</dt>
                                                                    <dd className="text-right text-neutral-200">{item.width}</dd>
                                                                </div>
                                                            ) : null}
                                                            {item.length !== undefined ? (
                                                                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-1.5">
                                                                    <dt className="font-black uppercase text-neutral-500">
                                                                        {sizeGuide.lengthLabel ?? "Length"}
                                                                    </dt>
                                                                    <dd className="text-right text-neutral-200">{item.length}</dd>
                                                                </div>
                                                            ) : null}
                                                            {item.metrics?.map((metric) => (
                                                                <div key={metric.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-1.5">
                                                                    <dt className="font-black uppercase text-neutral-500">{metric.label}</dt>
                                                                    <dd className="text-right text-neutral-200">{metric.value}</dd>
                                                                </div>
                                                            ))}
                                                            {item.sleeveLength !== undefined ? (
                                                                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-1.5">
                                                                    <dt className="font-black uppercase text-neutral-500">
                                                                        {sizeGuide.sleeveLabel ?? "Sleeve length"}
                                                                    </dt>
                                                                    <dd className="text-right text-neutral-200">{item.sleeveLength}</dd>
                                                                </div>
                                                            ) : null}
                                                            {item.sizeTolerance !== undefined ? (
                                                                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-1.5">
                                                                    <dt className="font-black uppercase text-neutral-500">Tolerance</dt>
                                                                    <dd className="text-right text-neutral-200">{item.sizeTolerance}</dd>
                                                                </div>
                                                            ) : null}
                                                        </dl>
                                                    </section>
                                                ))}
                                            </div>
                                            <p className="mt-2 text-[11px] leading-4 text-neutral-500">
                                                {sizeGuide.measurementNote}
                                            </p>
                                        </div>
                                    ) : null}

                                    {catalogProduct.production.customerInfo.careInstructions.length ? (
                                        <div className="mt-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Care</p>
                                            <p className="mt-2 text-xs leading-5 text-neutral-400">
                                                {catalogProduct.production.customerInfo.careInstructions.join(" · ")}
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {activeToolPanel === "layers" ? (
                        <div className="space-y-3">
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#b7ff3c]">
                                {activeSide} layers
                            </p>
                            {activeLayers.length === 0 ? (
                                <p className="border border-neutral-800 bg-black p-3 text-sm text-neutral-500">
                                    No {activeSide} layers yet.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {[...activeLayers].reverse().map((layer) => (
                                        <div key={layer.id} className={`border ${selectedLayerIds.includes(layer.id) ? "border-lime-300 bg-lime-300/10" : "border-neutral-800 bg-black"}`}>
                                            <div className="flex items-center gap-2 p-2">
                                                {advancedMode ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedLayerIds.includes(layer.id)}
                                                        onChange={() => selectLayer(layer.id, true)}
                                                        className="h-4 w-4 accent-lime-300"
                                                        aria-label={`Select ${layer.name ?? layer.type}`}
                                                    />
                                                ) : null}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        selectLayer(layer.id);
                                                        setActiveToolPanel("selection");
                                                    }}
                                                    className="min-w-0 flex-1 text-left text-sm"
                                                >
                                                    <span className="block truncate">{layer.name ?? (layer.type === "text" ? layer.text || "Text" : "Artwork")}</span>
                                                    <span className="text-[10px] uppercase text-neutral-500">{layer.groupId ? "Grouped · " : ""}{layer.type}</span>
                                                </button>
                                                {advancedMode ? (
                                                    <>
                                                        <button type="button" onClick={() => updateLayer(layer.id, { hidden: !layer.hidden })} title={layer.hidden ? "Show layer" : "Hide layer"} className="grid h-7 w-7 place-items-center text-neutral-400 hover:text-white">{layer.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                                                        <button type="button" onClick={() => updateLayer(layer.id, { locked: !layer.locked })} title={layer.locked ? "Unlock layer" : "Lock layer"} className="grid h-7 w-7 place-items-center text-neutral-400 hover:text-white">{layer.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}</button>
                                                    </>
                                                ) : null}
                                            </div>
                                            {advancedMode ? (
                                                <div className="flex border-t border-neutral-800">
                                                    <button type="button" onClick={() => reorderLayer(layer.id, 1)} title="Move layer forward" className="grid h-7 flex-1 place-items-center text-neutral-500 hover:text-white"><MoveUp className="h-3.5 w-3.5" /></button>
                                                    <button type="button" onClick={() => reorderLayer(layer.id, -1)} title="Move layer backward" className="grid h-7 flex-1 place-items-center border-l border-neutral-800 text-neutral-500 hover:text-white"><MoveDown className="h-3.5 w-3.5" /></button>
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : null}

                    {activeToolPanel === "advanced" && advancedMode ? (
                        <div className="space-y-5">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-lime-300">Canvas</p>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <AdvancedToggle label="Grid" icon={Grid3X3} checked={showGrid} onChange={setShowGrid} />
                                    <AdvancedToggle label="Rulers" icon={Ruler} checked={showRulers} onChange={setShowRulers} />
                                    <AdvancedToggle label="Safe area" icon={CircleCheck} checked={showSafeArea} onChange={setShowSafeArea} />
                                    <AdvancedToggle label="Bleed" icon={CircleAlert} checked={showBleed} onChange={setShowBleed} />
                                    <AdvancedToggle label="Snap" icon={AlignCenterHorizontal} checked={snapEnabled} onChange={setSnapEnabled} />
                                    <label className="border border-neutral-800 bg-black p-2 text-[11px] uppercase text-neutral-400">
                                        Grid px
                                        <input type="number" min="5" max="100" step="5" value={gridSize} onChange={(event) => setGridSize(clamp(Number(event.target.value) || 10, 5, 100))} className="mt-1 h-7 w-full border border-neutral-700 bg-neutral-950 px-2 text-sm text-white" />
                                    </label>
                                </div>
                                <p className="mt-2 text-[11px] leading-4 text-neutral-500">Orange is bleed, red is the maximum print boundary and green is the safe area.</p>
                            </div>

                            <div className="border-t border-neutral-800 pt-4">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400">Selection</p>
                                <p className="mt-1 text-xs text-neutral-500">{selectedLayerIds.length} layers selected</p>
                                <div className="mt-3 grid grid-cols-3 gap-1">
                                    {([
                                        ["left", "Left"], ["center-x", "Centre X"], ["right", "Right"],
                                        ["top", "Top"], ["center-y", "Centre Y"], ["bottom", "Bottom"],
                                        ["space-x", "Space X"], ["space-y", "Space Y"],
                                    ] as const).map(([mode, label]) => (
                                        <button key={mode} type="button" disabled={selectedLayerIds.length < 2} onClick={() => alignSelectedLayers(mode)} className="min-h-9 border border-neutral-700 px-1 text-[10px] font-bold text-neutral-300 hover:border-lime-300 hover:text-lime-300 disabled:opacity-30">{label}</button>
                                    ))}
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <button type="button" disabled={selectedLayerIds.length < 2} onClick={groupSelectedLayers} className="inline-flex h-9 items-center justify-center gap-2 border border-neutral-700 text-xs font-bold disabled:opacity-30"><Group className="h-4 w-4" /> Group</button>
                                    <button type="button" disabled={!selectedLayers.some((layer) => layer.groupId)} onClick={ungroupSelectedLayers} className="inline-flex h-9 items-center justify-center gap-2 border border-neutral-700 text-xs font-bold disabled:opacity-30"><Ungroup className="h-4 w-4" /> Ungroup</button>
                                    <button type="button" disabled={!selectedLayers.length} onClick={duplicateSelectedLayers} className="inline-flex h-9 items-center justify-center gap-2 border border-neutral-700 text-xs font-bold disabled:opacity-30"><Copy className="h-4 w-4" /> Duplicate</button>
                                    <button type="button" disabled={!selectedLayer || isSingleSided} onClick={copyToOtherSide} className="inline-flex h-9 items-center justify-center gap-2 border border-neutral-700 text-xs font-bold disabled:opacity-30"><RefreshCw className="h-4 w-4" /> Other side</button>
                                </div>
                            </div>

                            <div className="border-t border-neutral-800 pt-4">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400">Reusable placement</p>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <button type="button" disabled={!selectedLayer} onClick={copyPlacement} className="h-9 border border-neutral-700 text-xs font-bold disabled:opacity-30">Copy</button>
                                    <button type="button" disabled={!selectedLayer} onClick={pastePlacement} className="h-9 border border-neutral-700 text-xs font-bold disabled:opacity-30">Paste</button>
                                </div>
                                <p className="mt-2 text-[11px] leading-4 text-neutral-500">Placement is stored proportionally, ready for another side or product.</p>
                            </div>

                            <div className="border-t border-neutral-800 pt-4">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400">Preflight</p>
                                <div className="mt-2 space-y-2">
                                    {preflightChecks.length ? preflightChecks.map((check, index) => (
                                        <div key={`${check.message}-${index}`} className={`flex gap-2 border p-2 text-xs ${check.level === "pass" ? "border-lime-300/40 text-lime-300" : "border-yellow-400/40 text-yellow-200"}`}>
                                            {check.level === "pass" ? <CircleCheck className="h-4 w-4 shrink-0" /> : <CircleAlert className="h-4 w-4 shrink-0" />}
                                            <span>{check.message}</span>
                                        </div>
                                    )) : <p className="text-xs text-neutral-500">Add artwork to begin preflight checks.</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 border-t border-neutral-800 pt-4">
                                <button type="button" onClick={downloadTemplate} className="inline-flex min-h-10 items-center justify-center gap-2 border border-lime-300 text-xs font-black text-lime-300 hover:bg-lime-300 hover:text-black"><Download className="h-4 w-4" /> SVG template</button>
                                <button type="button" onClick={exportProof} className="inline-flex min-h-10 items-center justify-center gap-2 border border-lime-300 text-xs font-black text-lime-300 hover:bg-lime-300 hover:text-black"><Download className="h-4 w-4" /> Proof PNG</button>
                                <p className="col-span-2 text-[11px] leading-4 text-neutral-500">The SVG template opens in Illustrator, Photoshop and Affinity apps.</p>
                            </div>
                        </div>
                    ) : null}

                    {activeToolPanel === "selection" ? (
                        <LayerEditor
                            selectedLayer={selectedLayer}
                            printArea={printAreas[activeSide]}
                            printTarget={activePrintTarget}
                            advancedMode={advancedMode}
                            lockAspectRatio={lockAspectRatio}
                            setLockAspectRatio={setLockAspectRatio}
                            updateLayer={updateLayer}
                            applyQuickAction={applyQuickAction}
                            removeSelectedLayer={removeSelectedLayer}
                            replaceSelectedArtwork={replaceSelectedArtwork}
                        />
                    ) : null}
                </div>
            </section>

            <section className="flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden p-4">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border border-neutral-800 bg-neutral-950 p-3">
                    <div className="inline-flex border border-neutral-800 bg-black p-1">
                        {([...(isSingleSided ? ["front"] : ["front", "back"])] as Side[]).map((side) => (
                            <button
                                key={side}
                                type="button"
                                onClick={() => {
                                    setActiveSide(side);
                                    const selected = layersRef.current.find((layer) => layer.id === selectedLayerId);
                                    if (selected?.side !== side) setSelectedLayerId(null);
                                }}
                                className={`h-9 px-4 text-sm font-black capitalize ${activeSide === side
                                    ? "bg-lime-300 text-black"
                                    : "text-neutral-400 hover:text-white"
                                    }`}
                            >
                                {side}
                            </button>
                        ))}
                    </div>

                    <div className="min-w-[220px] border border-neutral-800 bg-black px-3 py-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                            {activePrintTarget.isSupplierSpecified ? `${activeSide} print area` : "Recommended artwork"}
                        </p>
                        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <p className="text-sm font-black text-white">
                                {activePrintTarget.width} x {activePrintTarget.height} px
                            </p>
                            <p className="text-[11px] text-neutral-400">
                                {activePrintPhysicalSize.widthCm.toFixed(1)} x {activePrintPhysicalSize.heightCm.toFixed(1)} cm at 300 DPI
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center border border-neutral-800 bg-black p-1">
                        <button
                            type="button"
                            onClick={() => {
                                setAdvancedMode((current) => {
                                    const next = !current;
                                    if (next) setActiveToolPanel("advanced");
                                    else if (activeToolPanel === "advanced") setActiveToolPanel("product");
                                    return next;
                                });
                            }}
                            className={`h-8 px-3 text-xs font-black uppercase ${advancedMode ? "bg-lime-300 text-black" : "text-neutral-300 hover:text-white"}`}
                        >
                            Advanced
                        </button>
                        {advancedMode ? (
                            <>
                                <button type="button" onClick={undo} disabled={!historyStatus.canUndo} title="Undo (Ctrl+Z)" className="grid h-8 w-8 place-items-center text-neutral-300 hover:text-white disabled:text-neutral-700"><Undo2 className="h-4 w-4" /></button>
                                <button type="button" onClick={redo} disabled={!historyStatus.canRedo} title="Redo (Ctrl+Shift+Z)" className="grid h-8 w-8 place-items-center text-neutral-300 hover:text-white disabled:text-neutral-700"><Redo2 className="h-4 w-4" /></button>
                                <button type="button" onClick={() => setZoom((value) => Math.max(50, value - 10))} title="Zoom out" className="grid h-8 w-8 place-items-center text-neutral-300 hover:text-white"><ZoomOut className="h-4 w-4" /></button>
                                <span className="w-12 text-center text-[11px] font-black text-white">{zoom}%</span>
                                <button type="button" onClick={() => setZoom((value) => Math.min(200, value + 10))} title="Zoom in" className="grid h-8 w-8 place-items-center text-neutral-300 hover:text-white"><ZoomIn className="h-4 w-4" /></button>
                            </>
                        ) : null}
                    </div>

                    {isSingleSided && posterFormats.length > 0 ? (
                        <label className="flex min-w-0 items-center gap-2 text-xs font-black uppercase text-neutral-400">
                            <span className="hidden sm:inline">Preview format</span>
                            <select
                                value={selectedPosterFormat?.key ?? ""}
                                onChange={(event) => changePosterFormat(event.target.value)}
                                className="h-9 max-w-[260px] border border-neutral-700 bg-black px-3 text-xs font-black text-white outline-none focus:border-lime-300"
                                aria-label="Poster preview format"
                            >
                                {posterFormats.map((format) => (
                                    <option key={format.key} value={format.key}>{format.label}</option>
                                ))}
                            </select>
                        </label>
                    ) : null}

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleViewMockups}
                            disabled={isGeneratingMockups || isUploadingArtwork}
                            className="inline-flex h-9 items-center gap-2 border border-lime-300 px-3 text-sm font-black text-lime-300 transition hover:bg-lime-300 hover:text-black disabled:cursor-not-allowed disabled:border-neutral-700 disabled:text-neutral-600"
                        >
                            {isGeneratingMockups ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                            <span className="hidden sm:inline">View mockups</span>
                        </button>
                        {selectedLayer ? (
                            <button
                                type="button"
                                onClick={removeSelectedLayer}
                                className="inline-flex h-9 items-center gap-2 border border-red-500/50 px-3 text-sm font-bold text-red-300 hover:bg-red-500/15"
                                title="Delete selected layer"
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Delete</span>
                            </button>
                        ) : null}
                    </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col">
                    <div
                        ref={workspaceRef}
                        onPointerDown={handleWorkspacePointerDown}
                        onPointerMove={handleWorkspacePointerMove}
                        onPointerUp={handleWorkspacePointerUp}
                        onPointerCancel={handleWorkspacePointerUp}
                        className={`relative grid min-h-0 flex-1 bg-white p-3 md:p-5 ${advancedMode ? "place-items-start overflow-auto" : "place-items-center overflow-hidden"}`}
                    >
                        <div className="absolute left-3 top-3 z-10 flex items-center gap-1 border border-neutral-700 bg-black p-1 shadow-lg md:left-5 md:top-5" aria-label="Add to design">
                            <label className={`inline-flex h-10 items-center gap-2 bg-lime-300 px-3 text-sm font-black text-black hover:bg-lime-200 ${isUploadingArtwork ? "cursor-wait opacity-60" : "cursor-pointer"}`}>
                                {isUploadingArtwork ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                                {isUploadingArtwork ? "Uploading" : "Image"}
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    disabled={isUploadingArtwork}
                                    onChange={(event) => {
                                        void addImageLayer(event.target.files?.[0] ?? null);
                                        event.target.value = "";
                                    }}
                                />
                            </label>
                            {recentArtwork.length ? (
                                <button
                                    type="button"
                                    onClick={() => setIsArtworkLibraryOpen((current) => !current)}
                                    aria-expanded={isArtworkLibraryOpen}
                                    className={`inline-flex h-10 items-center gap-2 px-3 text-sm font-black ${isArtworkLibraryOpen ? "bg-neutral-800 text-lime-300" : "text-white hover:bg-neutral-800"}`}
                                >
                                    <Images className="h-4 w-4" />
                                    Recent
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick={addTextLayer}
                                className="inline-flex h-10 items-center gap-2 px-3 text-sm font-black text-white hover:bg-neutral-800"
                            >
                                <Type className="h-4 w-4" />
                                Text
                            </button>
                        </div>
                        {isArtworkLibraryOpen ? (
                            <div className="absolute left-3 top-16 z-20 w-[min(360px,calc(100%-1.5rem))] border border-neutral-700 bg-black p-3 text-white shadow-2xl md:left-5 md:top-[4.5rem]">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-black uppercase tracking-[0.16em]">Recent artwork</p>
                                    <button type="button" onClick={() => setIsArtworkLibraryOpen(false)} className="text-xs font-black uppercase text-neutral-500 hover:text-white">Close</button>
                                </div>
                                <div className="mt-3 grid grid-cols-4 gap-2">
                                    {recentArtwork.map((asset, index) => (
                                        <button
                                            key={asset.path}
                                            type="button"
                                            onClick={() => void addRecentArtwork(asset)}
                                            disabled={isUploadingArtwork}
                                            className="group aspect-square overflow-hidden border border-neutral-700 bg-white p-1 hover:border-lime-300 disabled:opacity-50"
                                            title={`Reuse saved artwork ${index + 1}`}
                                        >
                                            <Image src={asset.previewUrl} alt={`Saved artwork ${index + 1}`} width={160} height={160} className="h-full w-full object-contain" unoptimized />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        <canvas
                            ref={canvasRef}
                            className={advancedMode
                                ? "m-auto block max-w-none touch-none bg-white shadow-xl"
                                : "block h-full min-h-0 w-auto max-w-full touch-none bg-white"
                            }
                            style={advancedMode ? { width: `${CANVAS_WIDTH * zoom / 100}px`, height: `${CANVAS_HEIGHT * zoom / 100}px` } : undefined}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                        />
                    </div>
                    <div className="mt-2 flex shrink-0 items-center justify-between text-xs uppercase tracking-wide text-neutral-500">
                        <span>{activeSide} view</span>
                        <span>{advancedMode ? "Hold Space and drag to pan | Shift-click selects multiple" : selectedLayer ? "Drag to move | green handle resizes | red handle rotates" : "Select artwork to edit"}</span>
                    </div>
                </div>
            </section>

            <section className="flex min-h-0 flex-col border-t border-neutral-800 bg-neutral-950 xl:border-l xl:border-t-0">
                <div className="border-b border-neutral-800 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#b7ff3c]">
                        Catalogue pricing
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <PriceSummaryCard
                            label="Single"
                            priceCents={singlePriceCents}
                            artistProfitCents={artistProfitCents}
                            active={!hasTwoPrintSides}
                        />
                        <PriceSummaryCard
                            label="Double"
                            priceCents={doublePriceCents}
                            artistProfitCents={artistProfitCents}
                            active={hasTwoPrintSides}
                        />
                    </div>
                    <div className="mt-3 border border-neutral-800 bg-black p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                            Current design
                        </p>
                        <p className="mt-1 text-sm text-neutral-300">
                            RRP <span className="font-black text-[#b7ff3c]">{formatMoneyFromCents(activePriceCents)}</span>
                        </p>
                        <p className="mt-1 text-sm text-neutral-300">
                            Band profit <span className="font-black text-white">{formatMoneyFromCents(artistProfitCents)}</span>
                        </p>
                        <p className="mt-1 text-xs text-neutral-400">
                            {hasTwoPrintSides ? "Front + back artwork" : hasBackDesign ? "Back artwork only" : "Front artwork only"}
                        </p>
                    </div>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                    {error ? (
                        <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                            {error}
                        </p>
                    ) : null}

                    <Button
                        type="button"
                        onClick={() => setActiveView("colors")}
                        disabled={isGeneratingMockups || isUploadingArtwork || !title.trim() || layers.length === 0}
                        className="h-11 w-full bg-lime-300 font-black text-black hover:bg-lime-200"
                    >
                        Choose colours <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </section>
        </form>
    );
}

function MockupGallery({ preview }: { preview: DesignerMockupPreview }) {
    const mockups = [
        { id: "front", label: "Front", src: preview.front },
        ...(preview.back ? [{ id: "back", label: "Back", src: preview.back }] : []),
        ...preview.colorMockups.flatMap((color) => color.front === preview.front ? [] : [
            { id: `${color.label}-front`, label: `${color.label} front`, src: color.front },
            ...(color.back ? [{ id: `${color.label}-back`, label: `${color.label} back`, src: color.back }] : []),
        ]),
        ...preview.lifestyle,
        ...(preview.posterFormats ?? []).map((format) => ({
            id: `poster-${format.key}`,
            label: format.label,
            src: format.src,
        })),
    ];
    const [slots, setSlots] = useState<[string, string]>([
        "front",
        preview.back ? "back" : preview.lifestyle[0]?.id ?? "front",
    ]);
    const [activeSlot, setActiveSlot] = useState<0 | 1>(1);
    const mainMockups = slots.map((id) => mockups.find((mockup) => mockup.id === id) ?? mockups[0]);
    const otherMockups = mockups.filter((mockup) => !slots.includes(mockup.id));

    function showInActiveSlot(id: string) {
        setSlots((current) => current.map((item, index) => index === activeSlot ? id : item) as [string, string]);
    }

    return (
        <div className="flex min-h-0 w-full flex-col gap-3 p-3 lg:grid lg:grid-cols-[minmax(0,1fr)_150px] lg:gap-5 lg:p-5 xl:grid-cols-[minmax(0,1fr)_180px]">
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 lg:gap-5">
                {mainMockups.map((mockup, index) => (
                    <button
                        key={index}
                        type="button"
                        onClick={() => setActiveSlot(index as 0 | 1)}
                        aria-pressed={activeSlot === index}
                        aria-label={`Select ${mockup.label} large preview`}
                        title={`Select ${mockup.label} preview to replace`}
                        className={`flex min-h-0 min-w-0 flex-col border bg-neutral-950 p-2 text-left transition lg:p-3 ${
                            activeSlot === index ? "border-lime-300" : "border-neutral-800 hover:border-neutral-500"
                        }`}
                    >
                        <span className="relative min-h-0 w-full flex-1 overflow-hidden bg-[#f3f1e8]">
                            <Image
                                src={mockup.src}
                                alt={`${mockup.label} product mockup`}
                                fill
                                unoptimized
                                sizes="(min-width: 1024px) 40vw, 45vw"
                                className="object-contain"
                            />
                        </span>
                        <span className="shrink-0 pt-2 text-center text-[11px] font-black uppercase tracking-[0.18em] text-neutral-300 lg:pt-3">
                            {mockup.label}
                        </span>
                    </button>
                ))}
            </div>
            {otherMockups.length > 0 ? (
                <aside className="flex min-h-0 shrink-0 flex-col border-t border-neutral-800 pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0" aria-label="Other mockup views">
                    <p className="mb-2 shrink-0 text-[10px] font-black uppercase tracking-[0.18em] text-lime-300">Other views</p>
                    <div className="flex min-h-0 gap-2 overflow-x-auto lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto">
                        {otherMockups.map((mockup) => (
                            <button
                                key={mockup.id}
                                type="button"
                                onClick={() => showInActiveSlot(mockup.id)}
                                aria-label={`Show ${mockup.label} in selected large preview`}
                                title={`Show ${mockup.label} in selected large preview`}
                                className="flex w-24 shrink-0 flex-col border border-neutral-700 bg-neutral-950 p-1.5 text-left transition hover:border-lime-300 focus-visible:border-lime-300 focus-visible:outline-none lg:w-full"
                            >
                                <span className="relative aspect-[3/4] w-full overflow-hidden bg-[#f3f1e8]">
                                    <Image
                                        src={mockup.src}
                                        alt=""
                                        fill
                                        unoptimized
                                        sizes="180px"
                                        className="object-contain"
                                    />
                                </span>
                                <span className="mt-1 w-full truncate text-center text-[10px] font-bold uppercase text-neutral-300">{mockup.label}</span>
                            </button>
                        ))}
                    </div>
                </aside>
            ) : null}
        </div>
    );
}

function PriceSummaryCard({
    label,
    priceCents,
    artistProfitCents,
    active,
    note,
}: {
    label: string;
    priceCents: number;
    artistProfitCents: number;
    active: boolean;
    note?: string;
}) {
    return (
        <div className={`border bg-black p-3 ${active ? "border-lime-300" : "border-neutral-800"}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">{label}</p>
            <p className="mt-2 text-xs text-neutral-400">RRP</p>
            <p className="text-xl font-black text-white">{formatMoneyFromCents(priceCents)}</p>
            <p className="mt-2 text-xs text-neutral-400">
                Band profit <span className="font-black text-white">{formatMoneyFromCents(artistProfitCents)}</span>
            </p>
            {note ? <p className="mt-1 text-[11px] text-red-300">{note}</p> : null}
        </div>
    );
}

function LayerEditor({
    selectedLayer,
    printArea,
    printTarget,
    advancedMode,
    lockAspectRatio,
    setLockAspectRatio,
    updateLayer,
    applyQuickAction,
    removeSelectedLayer,
    replaceSelectedArtwork,
}: {
    selectedLayer: DesignLayer | null;
    printArea: PixelRect;
    printTarget: { width: number; height: number };
    advancedMode: boolean;
    lockAspectRatio: boolean;
    setLockAspectRatio: (value: boolean) => void;
    updateLayer: (id: string, patch: Partial<DesignLayer>) => void;
    applyQuickAction: (action: LayerQuickAction) => void;
    removeSelectedLayer: () => void;
    replaceSelectedArtwork: (file: File | null) => Promise<void>;
}) {
    if (!selectedLayer) {
        return (
            <div className="space-y-3">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-400">Edit layer</p>
                <p className="border border-neutral-800 bg-black p-3 text-sm text-neutral-500">
                    Select a layer on the garment to edit size, colour, rotation and opacity.
                </p>
            </div>
        );
    }


    const imageQuality = selectedLayer.type === "image" && selectedLayer.sourcePixelWidth && selectedLayer.sourcePixelHeight
        ? estimateArtworkPrintQuality({
            sourceWidth: selectedLayer.sourcePixelWidth,
            sourceHeight: selectedLayer.sourcePixelHeight,
            layerWidth: selectedLayer.width,
            layerHeight: selectedLayer.height,
            printAreaWidth: printArea.width,
            printAreaHeight: printArea.height,
            targetPixelWidth: printTarget.width,
            targetPixelHeight: printTarget.height,
        })
        : null;
    const qualityContent = imageQuality ? {
        high: {
            label: "High quality",
            message: "This artwork should print sharply at its current size.",
            classes: "border-lime-300/50 bg-lime-300/10 text-lime-300",
            Icon: CircleCheck,
        },
        medium: {
            label: "Medium quality",
            message: "This should print well, though very fine detail may look softer.",
            classes: "border-yellow-400/50 bg-yellow-400/10 text-yellow-300",
            Icon: CircleAlert,
        },
        low: {
            label: "Low quality",
            message: "This may look soft or pixelated in print. A larger image or smaller layer will improve it.",
            classes: "border-red-400/50 bg-red-400/10 text-red-300",
            Icon: CircleAlert,
        },
    }[imageQuality.level] : null;
    const fullPrintWidthCm = printTarget.width / 300 * 2.54;
    const fullPrintHeightCm = printTarget.height / 300 * 2.54;
    const layerWidthCm = selectedLayer.width / printArea.width * fullPrintWidthCm;
    const layerHeightCm = selectedLayer.height / printArea.height * fullPrintHeightCm;
    const activeLayer = selectedLayer;

    function updateDimensions(patch: { width?: number; height?: number }) {
        if (!lockAspectRatio || activeLayer.type !== "image") {
            updateLayer(activeLayer.id, patch);
            return;
        }
        const ratio = activeLayer.aspectRatio ?? activeLayer.width / activeLayer.height;
        if (patch.width !== undefined) updateLayer(activeLayer.id, { width: patch.width, height: patch.width / ratio });
        else if (patch.height !== undefined) updateLayer(activeLayer.id, { height: patch.height, width: patch.height * ratio });
    }

    return (
        <div className="space-y-4">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-400">Edit layer</p>
            {advancedMode ? (
                <label className="block">
                    <span className="mb-1 block text-[11px] uppercase tracking-wide text-neutral-400">Layer name</span>
                    <input value={selectedLayer.name ?? ""} placeholder={selectedLayer.type === "image" ? "Artwork" : "Text"} onChange={(event) => updateLayer(selectedLayer.id, { name: event.target.value || undefined })} className="h-10 w-full border border-neutral-700 bg-black px-3 text-sm text-white outline-none focus:border-lime-300" />
                </label>
            ) : null}
            {selectedLayer.type === "image" ? (
                qualityContent && imageQuality ? (
                    <div className={`border p-3 ${qualityContent.classes}`}>
                        <div className="flex items-start gap-2">
                            <qualityContent.Icon className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                    <p className="text-xs font-black uppercase">{qualityContent.label}</p>
                                    <p className="text-[11px] font-bold text-neutral-300">Approx. {imageQuality.dpi} DPI</p>
                                </div>
                                <p className="mt-1 text-xs leading-5 text-neutral-300">{qualityContent.message}</p>
                                <p className="mt-1 text-[11px] text-neutral-500">You can still continue with this artwork.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="border border-neutral-800 bg-black p-3 text-xs text-neutral-500">
                        Analysing image quality...
                    </div>
                )
            ) : null}
            {advancedMode && selectedLayer.type === "image" ? (
                <div className="border border-neutral-800 bg-black p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">File diagnostics</p>
                    <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs">
                        <dt className="text-neutral-500">Source</dt><dd>{selectedLayer.sourcePixelWidth ?? "?"} x {selectedLayer.sourcePixelHeight ?? "?"} px</dd>
                        <dt className="text-neutral-500">Format</dt><dd>{selectedLayer.fileType ?? "Unknown"}</dd>
                        <dt className="text-neutral-500">Transparency</dt><dd>{selectedLayer.hasTransparency === undefined ? "Unknown" : selectedLayer.hasTransparency ? "Yes" : "No"}</dd>
                        <dt className="text-neutral-500">Colour</dt><dd>{selectedLayer.colorProfile ?? "RGB preview"}</dd>
                    </dl>
                    <label className="mt-3 inline-flex h-9 cursor-pointer items-center gap-2 border border-neutral-700 px-3 text-xs font-black hover:border-lime-300 hover:text-lime-300">
                        <RefreshCw className="h-4 w-4" /> Replace artwork
                        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { void replaceSelectedArtwork(event.target.files?.[0] ?? null); event.target.value = ""; }} />
                    </label>
                </div>
            ) : null}
            <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-neutral-400">Position in print area</p>
                <div className="grid grid-cols-2 gap-2">
                    <PositionInput
                        key={`${selectedLayer.id}-x-${Math.round(selectedLayer.x - printArea.x)}`}
                        label="X from left"
                        value={Math.round(selectedLayer.x - printArea.x)}
                        onCommit={(value) => updateLayer(selectedLayer.id, getLayerPositionPatch(selectedLayer, printArea, "x", value))}
                    />
                    <PositionInput
                        key={`${selectedLayer.id}-y-${Math.round(selectedLayer.y - printArea.y)}`}
                        label="Y from top"
                        value={Math.round(selectedLayer.y - printArea.y)}
                        onCommit={(value) => updateLayer(selectedLayer.id, getLayerPositionPatch(selectedLayer, printArea, "y", value))}
                    />
                </div>
            </div>
            <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-neutral-400">Quick actions</p>
                <div className="grid grid-cols-2 gap-2">
                    {([
                        ["center-horizontal", AlignCenterHorizontal, "Centre horizontally"],
                        ["center-vertical", AlignCenterVertical, "Centre vertically"],
                        ["max-width", MoveHorizontal, "Max width"],
                        ["max-height", MoveVertical, "Max height"],
                        ["top", MoveUp, "Top edge"],
                        ["bottom", MoveDown, "Bottom edge"],
                        ["left", MoveLeft, "Left edge"],
                        ["right", MoveRight, "Right edge"],
                    ] as const).map(([action, Icon, label]) => (
                        <button
                            key={action}
                            type="button"
                            onClick={() => applyQuickAction(action)}
                            title={`${label} in the printable area`}
                            className="flex min-h-11 items-center gap-2 border border-neutral-700 bg-black px-2 py-2 text-left text-xs font-bold text-white transition hover:border-lime-300 hover:text-lime-300"
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </div>
            {selectedLayer.type === "text" ? (
                <>
                    <label className="block">
                        <span className="mb-1 block text-[11px] uppercase tracking-wide text-neutral-400">Text</span>
                        <textarea
                            value={selectedLayer.text ?? ""}
                            rows={3}
                            onChange={(event) => updateLayer(selectedLayer.id, { text: event.target.value })}
                            className="w-full border border-neutral-700 bg-black px-3 py-2 text-sm outline-none"
                        />
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-[11px] uppercase tracking-wide text-neutral-400">Colour</span>
                        <input
                            type="color"
                            value={selectedLayer.fill ?? "#ffffff"}
                            onChange={(event) => updateLayer(selectedLayer.id, { fill: event.target.value })}
                            className="h-10 w-full border border-neutral-700 bg-black"
                        />
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-[11px] uppercase tracking-wide text-neutral-400">Font</span>
                        <select
                            value={selectedLayer.fontFamily ?? "Arial"}
                            onChange={(event) => updateLayer(selectedLayer.id, { fontFamily: event.target.value })}
                            className="h-10 w-full border border-neutral-700 bg-black px-3 text-sm text-white outline-none focus:border-lime-300"
                        >
                            {["Arial", "Impact", "Georgia", "Verdana", "Courier New"].map((font) => (
                                <option key={font} value={font}>{font}</option>
                            ))}
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-[11px] uppercase tracking-wide text-neutral-400">Weight</span>
                        <select
                            value={selectedLayer.fontWeight ?? "900"}
                            onChange={(event) => updateLayer(selectedLayer.id, { fontWeight: event.target.value })}
                            className="h-10 w-full border border-neutral-700 bg-black px-3 text-sm text-white outline-none focus:border-lime-300"
                        >
                            <option value="400">Regular</option>
                            <option value="600">Semi bold</option>
                            <option value="700">Bold</option>
                            <option value="800">Extra bold</option>
                            <option value="900">Black</option>
                        </select>
                    </label>
                    <RangeControl
                        label="Font size"
                        min={24}
                        max={160}
                        value={selectedLayer.fontSize ?? 76}
                        onChange={(value) =>
                            updateLayer(selectedLayer.id, {
                                fontSize: value,
                                height: value * 1.6,
                            })
                        }
                    />
                </>
            ) : null}

            {advancedMode ? (
                <div className="border border-neutral-800 bg-black p-3">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">Exact transform</p>
                        {selectedLayer.type === "image" ? (
                            <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-neutral-400">
                                <input type="checkbox" checked={lockAspectRatio} onChange={(event) => setLockAspectRatio(event.target.checked)} className="accent-lime-300" /> Lock ratio
                            </label>
                        ) : null}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <PositionInput key={`width-${selectedLayer.width}`} label="Width / px" value={Math.round(selectedLayer.width)} onCommit={(value) => updateDimensions({ width: clamp(value, 1, CANVAS_WIDTH) })} />
                        <PositionInput key={`height-${selectedLayer.height}`} label="Height / px" value={Math.round(selectedLayer.height)} onCommit={(value) => updateDimensions({ height: clamp(value, 1, CANVAS_HEIGHT) })} />
                        <DecimalInput key={`width-cm-${layerWidthCm}`} label="Width / cm" value={layerWidthCm} onCommit={(value) => updateDimensions({ width: value / fullPrintWidthCm * printArea.width })} />
                        <DecimalInput key={`height-cm-${layerHeightCm}`} label="Height / cm" value={layerHeightCm} onCommit={(value) => updateDimensions({ height: value / fullPrintHeightCm * printArea.height })} />
                        <PositionInput key={`rotation-${selectedLayer.rotation}`} label="Rotation" value={Math.round(selectedLayer.rotation)} onCommit={(value) => updateLayer(selectedLayer.id, { rotation: clamp(value, -180, 180) })} />
                        <PositionInput key={`scale-${selectedLayer.width}`} label="Scale / %" value={Math.round(selectedLayer.width / printArea.width * 100)} onCommit={(value) => updateDimensions({ width: clamp(value, 1, 300) / 100 * printArea.width })} />
                    </div>
                </div>
            ) : null}

            <RangeControl
                label="Width"
                min={80}
                max={520}
                value={Math.round(selectedLayer.width)}
                onChange={(value) => updateDimensions({ width: value })}
            />
            <RangeControl
                label="Height"
                min={60}
                max={520}
                value={Math.round(selectedLayer.height)}
                onChange={(value) => updateDimensions({ height: value })}
            />
            <RangeControl
                label="Rotation"
                min={-45}
                max={45}
                value={Math.round(selectedLayer.rotation)}
                onChange={(value) => updateLayer(selectedLayer.id, { rotation: value })}
            />
            <RangeControl
                label="Opacity"
                min={10}
                max={100}
                value={Math.round(selectedLayer.opacity * 100)}
                onChange={(value) => updateLayer(selectedLayer.id, { opacity: value / 100 })}
            />

            <button
                type="button"
                onClick={removeSelectedLayer}
                className="inline-flex h-10 w-full items-center justify-center gap-2 border border-red-500/40 bg-red-500/10 text-sm text-red-200 hover:bg-red-500/20"
            >
                <Trash2 className="h-4 w-4" />
                Remove layer
            </button>
        </div>
    );
}

function PositionInput({ label, value, onCommit }: { label: string; value: number; onCommit: (value: number) => void }) {
    const [draft, setDraft] = useState(String(value));

    return (
        <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-wide text-neutral-400">{label}</span>
            <input
                type="number"
                step="1"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => {
                    const number = Number(draft);
                    if (draft.trim() && Number.isFinite(number)) onCommit(number);
                    setDraft(String(value));
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.blur();
                    }
                }}
                className="h-10 w-full border border-neutral-700 bg-black px-3 text-sm text-white outline-none focus:border-lime-300"
            />
        </label>
    );
}

function DecimalInput({ label, value, onCommit }: { label: string; value: number; onCommit: (value: number) => void }) {
    const [draft, setDraft] = useState(value.toFixed(1));

    return (
        <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-wide text-neutral-400">{label}</span>
            <input
                type="number"
                min="0.1"
                step="0.1"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => {
                    const number = Number(draft);
                    if (Number.isFinite(number) && number > 0) onCommit(number);
                    setDraft(value.toFixed(1));
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.blur();
                    }
                }}
                className="h-10 w-full border border-neutral-700 bg-black px-3 text-sm text-white outline-none focus:border-lime-300"
            />
        </label>
    );
}

function AdvancedToggle({
    label,
    icon: Icon,
    checked,
    onChange,
}: {
    label: string;
    icon: ComponentType<{ className?: string }>;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <label className={`flex min-h-10 cursor-pointer items-center gap-2 border px-2 text-xs font-bold ${checked ? "border-lime-300 bg-lime-300/10 text-lime-300" : "border-neutral-800 bg-black text-neutral-400"}`}>
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="sr-only" />
            <Icon className="h-4 w-4" />
            <span>{label}</span>
        </label>
    );
}

function RangeControl({
    label,
    min,
    max,
    value,
    onChange,
}: {
    label: string;
    min: number;
    max: number;
    value: number;
    onChange: (value: number) => void;
}) {
    return (
        <label className="block">
            <span className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-neutral-400">
                {label}
                <span>{value}</span>
            </span>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className="w-full accent-red-600"
            />
        </label>
    );
}
