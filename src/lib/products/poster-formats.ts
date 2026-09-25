import type { PixelRect } from "./design-geometry";

export type PosterFormat = {
    key: string;
    label: string;
    width: number;
    height: number;
    variantIds: number[];
};

type PosterLayer = {
    x: number;
    y: number;
    width?: number;
    height?: number;
};

export function posterCanvasArea(width: number, height: number): PixelRect {
    const maxWidth = 700;
    const maxHeight = 900;
    const scale = Math.min(maxWidth / width, maxHeight / height);
    const areaWidth = width * scale;
    const areaHeight = height * scale;

    return {
        x: (900 - areaWidth) / 2,
        y: (1200 - areaHeight) / 2,
        width: areaWidth,
        height: areaHeight,
    };
}

export function remapPosterLayers<T extends PosterLayer>(
    layers: T[],
    source: PixelRect,
    target: PixelRect,
): T[] {
    const scale = Math.min(target.width / source.width, target.height / source.height);
    const sourceCenterX = source.x + source.width / 2;
    const sourceCenterY = source.y + source.height / 2;
    const targetCenterX = target.x + target.width / 2;
    const targetCenterY = target.y + target.height / 2;

    return layers.map((layer) => ({
        ...layer,
        x: targetCenterX + (layer.x - sourceCenterX) * scale,
        y: targetCenterY + (layer.y - sourceCenterY) * scale,
        ...(layer.width === undefined ? {} : { width: layer.width * scale }),
        ...(layer.height === undefined ? {} : { height: layer.height * scale }),
    }));
}

export function posterFormatForKey(formats: PosterFormat[], key?: string | null) {
    return formats.find((format) => format.key === key) ?? formats[0] ?? null;
}
