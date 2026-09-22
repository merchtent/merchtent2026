export const DESIGN_CANVAS_WIDTH = 900;
export const DESIGN_CANVAS_HEIGHT = 1200;

export type GeometryUnits = "ratio" | "pixels";

export type GeometryRect = {
    x: number;
    y: number;
    width: number;
    height: number;
    units?: GeometryUnits;
};

export type PixelRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type RatioRect = PixelRect & {
    units: "ratio";
};

function finite(value: number, fallback: number) {
    return Number.isFinite(value) ? value : fallback;
}

function clean(value: number) {
    return Math.round(value * 1_000_000_000) / 1_000_000_000;
}

export function resolveGeometryRect(
    rect: GeometryRect,
    targetWidth = DESIGN_CANVAS_WIDTH,
    targetHeight = DESIGN_CANVAS_HEIGHT
): PixelRect {
    if (rect.units !== "ratio") {
        return {
            x: finite(rect.x, 0),
            y: finite(rect.y, 0),
            width: Math.max(1, finite(rect.width, targetWidth)),
            height: Math.max(1, finite(rect.height, targetHeight)),
        };
    }

    return {
        x: clean(finite(rect.x, 0) * targetWidth),
        y: clean(finite(rect.y, 0) * targetHeight),
        width: Math.max(1, clean(finite(rect.width, 1) * targetWidth)),
        height: Math.max(1, clean(finite(rect.height, 1) * targetHeight)),
    };
}

export function normalizeGeometryRect(
    rect: GeometryRect,
    sourceWidth = DESIGN_CANVAS_WIDTH,
    sourceHeight = DESIGN_CANVAS_HEIGHT
): RatioRect {
    if (rect.units === "ratio") return { ...rect, units: "ratio" };

    return {
        x: finite(rect.x, 0) / sourceWidth,
        y: finite(rect.y, 0) / sourceHeight,
        width: finite(rect.width, sourceWidth) / sourceWidth,
        height: finite(rect.height, sourceHeight) / sourceHeight,
        units: "ratio",
    };
}

export function resolveGeometryAreas<T extends string>(
    areas: Record<T, GeometryRect>,
    targetWidth = DESIGN_CANVAS_WIDTH,
    targetHeight = DESIGN_CANVAS_HEIGHT
) {
    return Object.fromEntries(
        Object.entries<GeometryRect>(areas).map(([key, rect]) => [
            key,
            resolveGeometryRect(rect, targetWidth, targetHeight),
        ])
    ) as Record<T, PixelRect>;
}

export function normalizeGeometryAreas<T extends string>(
    areas: Record<T, GeometryRect>,
    sourceWidth = DESIGN_CANVAS_WIDTH,
    sourceHeight = DESIGN_CANVAS_HEIGHT
) {
    return Object.fromEntries(
        Object.entries<GeometryRect>(areas).map(([key, rect]) => [
            key,
            normalizeGeometryRect(rect, sourceWidth, sourceHeight),
        ])
    ) as Record<T, RatioRect>;
}
