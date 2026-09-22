export type PrintifyPlacementImage = {
    id: string;
    x: number;
    y: number;
    scale: number;
    angle: number;
};

export type PrintifyProductContract = {
    blueprint_id: number;
    print_provider_id: number;
    variants: Array<{ id: number; is_enabled: boolean }>;
    print_areas: Array<{
        variant_ids: number[];
        placeholders: Array<{
            position: string;
            images: PrintifyPlacementImage[];
        }>;
    }>;
};

export type PrintifyProductSnapshot = {
    id: string;
    blueprint_id?: number;
    print_provider_id?: number;
    variants?: Array<{
        id: number;
        sku?: string | null;
        title?: string | null;
        is_enabled?: boolean | null;
        options?: number[] | null;
    }>;
    print_areas?: Array<{
        variant_ids: number[];
        placeholders: Array<{
            position: string;
            images: PrintifyPlacementImage[];
        }>;
    }>;
    images?: Array<{
        src: string;
        variant_ids: number[];
        position: string;
        is_default?: boolean;
    }>;
};

export type PrintifyContractVerification = {
    ok: boolean;
    issues: string[];
    mockupUrls: string[];
};

const TRANSFORM_EPSILON = 0.0001;

function sameNumber(actual: number, expected: number) {
    return Number.isFinite(actual) && Math.abs(actual - expected) <= TRANSFORM_EPSILON;
}

function placementMatches(actual: PrintifyPlacementImage, expected: PrintifyPlacementImage) {
    return actual.id === expected.id
        && sameNumber(actual.x, expected.x)
        && sameNumber(actual.y, expected.y)
        && sameNumber(actual.scale, expected.scale)
        && sameNumber(actual.angle, expected.angle);
}

export function verifyPrintifyProductContract(
    actual: PrintifyProductSnapshot,
    expected: PrintifyProductContract,
): PrintifyContractVerification {
    const issues: string[] = [];
    const expectedVariantIds = expected.variants
        .filter((variant) => variant.is_enabled)
        .map((variant) => variant.id);

    if (actual.blueprint_id !== expected.blueprint_id) {
        issues.push(`blueprint ${actual.blueprint_id ?? "missing"} does not match ${expected.blueprint_id}`);
    }
    if (actual.print_provider_id !== expected.print_provider_id) {
        issues.push(`provider ${actual.print_provider_id ?? "missing"} does not match ${expected.print_provider_id}`);
    }

    for (const variantId of expectedVariantIds) {
        const variant = actual.variants?.find((candidate) => candidate.id === variantId);
        if (!variant) {
            issues.push(`variant ${variantId} is missing`);
        } else if (variant.is_enabled === false) {
            issues.push(`variant ${variantId} is disabled`);
        }
    }

    const expectedPositions = new Set<string>();
    for (const expectedArea of expected.print_areas) {
        for (const expectedPlaceholder of expectedArea.placeholders) {
            expectedPositions.add(expectedPlaceholder.position);

            for (const variantId of expectedArea.variant_ids) {
                const matchingArea = actual.print_areas?.find((area) =>
                    area.variant_ids.includes(variantId)
                    && area.placeholders.some((placeholder) =>
                        placeholder.position === expectedPlaceholder.position
                        && expectedPlaceholder.images.every((expectedImage) =>
                            placeholder.images.some((actualImage) => placementMatches(actualImage, expectedImage))
                        )
                    )
                );

                if (!matchingArea) {
                    issues.push(`variant ${variantId} is missing the verified ${expectedPlaceholder.position} placement`);
                }
            }
        }
    }

    const mockupUrls: string[] = [];
    for (const position of expectedPositions) {
        const mockup = actual.images?.find((image) =>
            image.position === position
            && image.variant_ids.some((variantId) => expectedVariantIds.includes(variantId))
        );
        if (!mockup?.src) {
            issues.push(`Printify did not generate a ${position} mockup`);
        } else {
            mockupUrls.push(mockup.src);
        }
    }

    return {
        ok: issues.length === 0,
        issues,
        mockupUrls,
    };
}

export function isPrintifyProductContract(value: unknown): value is PrintifyProductContract {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Partial<PrintifyProductContract>;
    return Number.isInteger(candidate.blueprint_id)
        && Number.isInteger(candidate.print_provider_id)
        && Array.isArray(candidate.variants)
        && Array.isArray(candidate.print_areas);
}
