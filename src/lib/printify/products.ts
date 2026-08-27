import "server-only";
import { printifyRequest, printifyShopId } from "@/lib/printify/client";

export type PrintifyCreateProductVariant = {
    id: number;
    price: number;
    is_enabled: boolean;
};

export type PrintifyCreateProductImage = {
    id: string;
    x: number;
    y: number;
    scale: number;
    angle: number;
};

export type PrintifyCreateProductPayload = {
    title: string;
    description: string;
    blueprint_id: number;
    print_provider_id: number;
    variants: PrintifyCreateProductVariant[];
    print_areas: Array<{
        variant_ids: number[];
        placeholders: Array<{
            position: string;
            images: PrintifyCreateProductImage[];
        }>;
    }>;
};

export type PrintifyUploadedImage = {
    id: string;
    file_name: string;
    height: number;
    width: number;
    size: number;
    mime_type: string;
    preview_url: string;
    upload_time: string;
};

export type PrintifyProduct = {
    id: string;
    title: string;
    description: string;
    variants?: Array<{
        id: number;
        sku?: string | null;
        title?: string | null;
        is_enabled?: boolean | null;
        options?: number[] | null;
    }>;
};

export async function uploadPrintifyImageFromUrl(fileName: string, url: string) {
    return printifyRequest<PrintifyUploadedImage>("/uploads/images.json", {
        method: "POST",
        body: {
            file_name: fileName,
            url,
        },
    });
}

export async function createPrintifyProduct(payload: PrintifyCreateProductPayload) {
    return printifyRequest<PrintifyProduct>(`/shops/${printifyShopId()}/products.json`, {
        method: "POST",
        body: payload,
    });
}
