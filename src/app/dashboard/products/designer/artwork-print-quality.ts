export type ArtworkPrintQuality = {
    dpi: number;
    level: "low" | "medium" | "high";
};

type ArtworkPrintQualityInput = {
    sourceWidth: number;
    sourceHeight: number;
    layerWidth: number;
    layerHeight: number;
    printAreaWidth: number;
    printAreaHeight: number;
    targetPixelWidth: number;
    targetPixelHeight: number;
};

export function estimateArtworkPrintQuality({
    sourceWidth,
    sourceHeight,
    layerWidth,
    layerHeight,
    printAreaWidth,
    printAreaHeight,
    targetPixelWidth,
    targetPixelHeight,
}: ArtworkPrintQualityInput): ArtworkPrintQuality | null {
    const values = [
        sourceWidth,
        sourceHeight,
        layerWidth,
        layerHeight,
        printAreaWidth,
        printAreaHeight,
        targetPixelWidth,
        targetPixelHeight,
    ];
    if (values.some((value) => !Number.isFinite(value) || value <= 0)) return null;

    const widthAt300Dpi = (layerWidth / printAreaWidth) * targetPixelWidth;
    const heightAt300Dpi = (layerHeight / printAreaHeight) * targetPixelHeight;
    const dpi = Math.max(1, Math.round(Math.min(
        300 * sourceWidth / widthAt300Dpi,
        300 * sourceHeight / heightAt300Dpi,
    )));

    return {
        dpi,
        level: dpi >= 250 ? "high" : dpi >= 150 ? "medium" : "low",
    };
}
