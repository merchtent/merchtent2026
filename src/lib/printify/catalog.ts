import "server-only";

import { printifyRequest } from "@/lib/printify/client";

export type PrintifyBlueprint = {
    id: number;
    title: string;
    brand?: string | null;
    model?: string | null;
    images?: string[];
};

export type PrintifyPrintProvider = {
    id: number;
    title: string;
    location?: {
        address1?: string | null;
        address2?: string | null;
        city?: string | null;
        country?: string | null;
        region?: string | null;
        zip?: string | null;
        address?: {
            country?: string | null;
            region?: string | null;
        } | null;
    } | null;
};

export type PrintifyVariant = {
    id: number;
    title: string;
    cost?: number | null;
    price?: number | null;
    grams?: number | null;
    is_enabled?: boolean | null;
    options?: number[] | null;
    placeholders?: Array<{
        position: string;
        height?: number | null;
        width?: number | null;
    }> | null;
};

export type PrintifyVariantsResponse = {
    variants?: PrintifyVariant[];
};

export type PrintifyShippingResponse = {
    handling_time?: {
        value?: number;
        unit?: string;
    };
    profiles?: Array<{
        variant_ids: number[];
        first_item: {
            cost: number;
            currency: string;
        };
        additional_items: {
            cost: number;
            currency: string;
        };
        countries: string[];
    }>;
};

export async function listPrintifyBlueprints() {
    return printifyRequest<PrintifyBlueprint[]>("/catalog/blueprints.json");
}

export async function getPrintifyBlueprint(blueprintId: number) {
    return printifyRequest<PrintifyBlueprint>(`/catalog/blueprints/${blueprintId}.json`);
}

export async function listPrintifyPrintProviders(blueprintId: number) {
    return printifyRequest<PrintifyPrintProvider[]>(
        `/catalog/blueprints/${blueprintId}/print_providers.json`
    );
}

export async function listAllPrintifyPrintProviders() {
    return printifyRequest<PrintifyPrintProvider[]>("/catalog/print_providers.json");
}

export async function listPrintifyVariants(blueprintId: number, printProviderId: number) {
    const response = await printifyRequest<PrintifyVariantsResponse | PrintifyVariant[]>(
        `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`
    );

    return Array.isArray(response) ? response : response.variants ?? [];
}

export async function getPrintifyShipping(blueprintId: number, printProviderId: number) {
    return printifyRequest<PrintifyShippingResponse>(
        `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/shipping.json`
    );
}
