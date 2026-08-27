import "server-only";
import { printifyRequest, printifyShopId } from "@/lib/printify/client";

export type PrintifyOrderPayload = {
    external_id: string;
    label: string;
    line_items: Array<{
        product_id: string;
        variant_id: number;
        quantity: number;
        external_id: string;
    }>;
    shipping_method: number;
    is_printify_express: boolean;
    is_economy_shipping: boolean;
    send_shipping_notification: boolean;
    address_to: {
        first_name: string;
        last_name: string;
        email: string;
        phone?: string;
        country: string;
        region?: string;
        address1: string;
        address2?: string;
        city: string;
        zip: string;
    };
};

export type PrintifyOrderResponse = {
    id: string;
    status?: string;
    app_order_id?: string;
};

export async function submitPrintifyOrder(payload: PrintifyOrderPayload) {
    return printifyRequest<PrintifyOrderResponse>(`/shops/${printifyShopId()}/orders.json`, {
        method: "POST",
        body: payload,
    });
}
