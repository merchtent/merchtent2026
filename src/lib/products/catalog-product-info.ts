export type CatalogProductFeature = {
    title: string;
    description: string;
};

export type CatalogSizeMeasurement = {
    size: string;
    width?: number;
    length?: number;
    sleeveLength?: number;
    sizeTolerance?: number;
    metrics?: Array<{
        label: string;
        value: string | number;
    }>;
};

export type CatalogProductInfo = {
    about?: string;
    features: CatalogProductFeature[];
    careInstructions: string[];
    sizeGuide?: {
        unit: "cm";
        measurementNote: string;
        lengthLabel?: string;
        sleeveLabel?: string;
        measurements: CatalogSizeMeasurement[];
    };
};

function recordValue(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

function shortText(value: unknown, maxLength: number) {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function parseCatalogProductInfo(value: unknown): CatalogProductInfo | undefined {
    const source = recordValue(value);
    if (!source) return undefined;
    const about = shortText(source.about, 800) || undefined;

    const features = Array.isArray(source.features)
        ? source.features.flatMap((entry) => {
            const feature = recordValue(entry);
            const title = shortText(feature?.title, 80);
            const description = shortText(feature?.description, 320);
            return title && description ? [{ title, description }] : [];
        }).slice(0, 12)
        : [];

    const careValue = source.careInstructions ?? source.care_instructions;
    const careInstructions = Array.isArray(careValue)
        ? careValue.map((entry) => shortText(entry, 160)).filter(Boolean).slice(0, 12)
        : [];

    const rawSizeGuide = recordValue(source.sizeGuide ?? source.size_guide);
    const rawMeasurements = rawSizeGuide?.measurements;
    const measurements = Array.isArray(rawMeasurements)
        ? rawMeasurements.flatMap((entry) => {
            const measurement = recordValue(entry);
            const size = shortText(measurement?.size, 20);
            const width = Number(measurement?.width);
            const length = Number(measurement?.length);
            const rawSleeveLength = measurement?.sleeveLength ?? measurement?.sleeve_length;
            const rawSizeTolerance = measurement?.sizeTolerance ?? measurement?.size_tolerance;
            const sleeveLength = Number(rawSleeveLength);
            const sizeTolerance = Number(rawSizeTolerance);
            const metrics = Array.isArray(measurement?.metrics)
                ? measurement.metrics.flatMap((entry) => {
                    const metric = recordValue(entry);
                    const label = shortText(metric?.label, 80);
                    const value = typeof metric?.value === "number"
                        ? metric.value
                        : shortText(metric?.value, 80);
                    return label && value !== "" && Number.isFinite(typeof value === "number" ? value : 0)
                        ? [{ label, value }]
                        : [];
                }).slice(0, 12)
                : [];
            const hasWidth = Number.isFinite(width) && width > 0;
            const hasLength = Number.isFinite(length) && length > 0;
            return size && (hasWidth || hasLength || metrics.length > 0)
                ? [{
                    size,
                    ...(hasWidth ? { width } : {}),
                    ...(hasLength ? { length } : {}),
                    ...(rawSleeveLength !== undefined && Number.isFinite(sleeveLength) && sleeveLength > 0
                        ? { sleeveLength }
                        : {}),
                    ...(rawSizeTolerance !== undefined && Number.isFinite(sizeTolerance) && sizeTolerance > 0
                        ? { sizeTolerance }
                        : {}),
                    ...(metrics.length ? { metrics } : {}),
                }]
                : [];
        }).slice(0, 20)
        : [];

    const sizeGuide = measurements.length
        ? {
            unit: "cm" as const,
            measurementNote: shortText(
                rawSizeGuide?.measurementNote ?? rawSizeGuide?.measurement_note,
                180
            ) || "Measurements refer to the garment itself.",
            lengthLabel: shortText(rawSizeGuide?.lengthLabel ?? rawSizeGuide?.length_label, 80) || undefined,
            sleeveLabel: shortText(rawSizeGuide?.sleeveLabel ?? rawSizeGuide?.sleeve_label, 80) || undefined,
            measurements,
        }
        : undefined;

    return about || features.length || careInstructions.length || sizeGuide
        ? { about, features, careInstructions, sizeGuide }
        : undefined;
}
