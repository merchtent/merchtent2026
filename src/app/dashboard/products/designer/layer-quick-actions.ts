export type LayerQuickAction =
    | "center-horizontal"
    | "center-vertical"
    | "max-width"
    | "max-height"
    | "top"
    | "bottom"
    | "left"
    | "right";

type LayerGeometry = {
    type: "image" | "text";
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    fontSize?: number;
    aspectRatio?: number;
};

type PrintArea = { x: number; y: number; width: number; height: number };

export function fitImageToPrintArea(imageWidth: number, imageHeight: number, area: PrintArea) {
    const safeWidth = Math.max(1, imageWidth);
    const safeHeight = Math.max(1, imageHeight);
    const scale = Math.min(area.width / safeWidth, area.height / safeHeight);
    const width = safeWidth * scale;
    const height = safeHeight * scale;

    return {
        x: area.x + (area.width - width) / 2,
        y: area.y + (area.height - height) / 2,
        width,
        height,
    };
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function rotatedSize(width: number, height: number, rotation: number) {
    const angle = rotation * Math.PI / 180;
    const cosine = Math.abs(Math.cos(angle));
    const sine = Math.abs(Math.sin(angle));
    return {
        width: width * cosine + height * sine,
        height: width * sine + height * cosine,
    };
}

export function getLayerQuickActionPatch(layer: LayerGeometry, area: PrintArea, action: LayerQuickAction) {
    const originalCenterX = layer.x + layer.width / 2;
    const originalCenterY = layer.y + layer.height / 2;
    let width = layer.width;
    let height = layer.height;

    if (action === "max-width" || action === "max-height") {
        const ratio = layer.type === "image" && layer.aspectRatio && layer.aspectRatio > 0
            ? layer.aspectRatio
            : layer.width / layer.height;
        const rotatedUnit = rotatedSize(ratio, 1, layer.rotation);
        height = Math.min(
            area.width / ratio,
            area.height,
            area.width / rotatedUnit.width,
            area.height / rotatedUnit.height
        );
        width = height * ratio;
    } else {
        const rotated = rotatedSize(width, height, layer.rotation);
        const scale = Math.min(
            1,
            area.width / width,
            area.height / height,
            area.width / rotated.width,
            area.height / rotated.height
        );
        width *= scale;
        height *= scale;
    }

    const rotated = rotatedSize(width, height, layer.rotation);
    const halfWidth = Math.max(width, rotated.width) / 2;
    const halfHeight = Math.max(height, rotated.height) / 2;
    let centerX = clamp(originalCenterX, area.x + halfWidth, area.x + area.width - halfWidth);
    let centerY = clamp(originalCenterY, area.y + halfHeight, area.y + area.height - halfHeight);

    if (action === "max-width" || action === "max-height" || action === "center-horizontal") {
        centerX = area.x + area.width / 2;
    }
    if (action === "max-width" || action === "max-height" || action === "center-vertical") {
        centerY = area.y + area.height / 2;
    }
    if (action === "top") centerY = area.y + halfHeight;
    if (action === "bottom") centerY = area.y + area.height - halfHeight;
    if (action === "left") centerX = area.x + halfWidth;
    if (action === "right") centerX = area.x + area.width - halfWidth;

    return {
        x: centerX - width / 2,
        y: centerY - height / 2,
        width,
        height,
        ...(layer.type === "text" && layer.fontSize
            ? { fontSize: clamp(layer.fontSize * width / layer.width, 12, 220) }
            : {}),
    };
}

export function getLayerPositionPatch(layer: LayerGeometry, area: PrintArea, axis: "x" | "y", localPosition: number) {
    const rotated = rotatedSize(layer.width, layer.height, layer.rotation);
    const fits = layer.width <= area.width && layer.height <= area.height
        && rotated.width <= area.width && rotated.height <= area.height;
    const base = fits ? layer : { ...layer, ...getLayerQuickActionPatch(layer, area, "center-horizontal") };
    const visible = rotatedSize(base.width, base.height, base.rotation);
    const halfWidth = Math.max(base.width, visible.width) / 2;
    const halfHeight = Math.max(base.height, visible.height) / 2;
    const minX = area.x + halfWidth - base.width / 2;
    const maxX = area.x + area.width - halfWidth - base.width / 2;
    const minY = area.y + halfHeight - base.height / 2;
    const maxY = area.y + area.height - halfHeight - base.height / 2;

    return {
        x: clamp(axis === "x" ? area.x + localPosition : base.x, minX, maxX),
        y: clamp(axis === "y" ? area.y + localPosition : base.y, minY, maxY),
        width: base.width,
        height: base.height,
        ...(base.type === "text" && base.fontSize ? { fontSize: base.fontSize } : {}),
    };
}
