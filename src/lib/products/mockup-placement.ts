export type MockupPlacement = {
    left: number;
    top: number;
    width: number;
    height: number;
};

export type ClippedMockupPlacement = {
    sourceLeft: number;
    sourceTop: number;
    width: number;
    height: number;
    destinationLeft: number;
    destinationTop: number;
};

type CanvasRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export function mapCanvasRectToMockupPlacement(
    rect: CanvasRect,
    placement: MockupPlacement,
    canvasWidth: number,
    canvasHeight: number,
): MockupPlacement {
    const scaleX = placement.width / canvasWidth;
    const scaleY = placement.height / canvasHeight;

    return {
        left: Math.round(placement.left + rect.x * scaleX),
        top: Math.round(placement.top + rect.y * scaleY),
        width: Math.max(1, Math.round(rect.width * scaleX)),
        height: Math.max(1, Math.round(rect.height * scaleY)),
    };
}

export function clipMockupPlacement(
    placement: MockupPlacement,
    canvasWidth: number,
    canvasHeight: number,
): ClippedMockupPlacement | null {
    const sourceLeft = Math.max(0, -placement.left);
    const sourceTop = Math.max(0, -placement.top);
    const destinationLeft = Math.max(0, placement.left);
    const destinationTop = Math.max(0, placement.top);
    const width = Math.min(
        placement.width - sourceLeft,
        canvasWidth - destinationLeft,
    );
    const height = Math.min(
        placement.height - sourceTop,
        canvasHeight - destinationTop,
    );

    if (width <= 0 || height <= 0) return null;

    return {
        sourceLeft,
        sourceTop,
        width,
        height,
        destinationLeft,
        destinationTop,
    };
}
