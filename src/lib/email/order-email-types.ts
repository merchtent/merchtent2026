export type OrderEmailItem = {
    title: string;
    qty: number;
    unit_price: string;
    line_total: string;
    size: string | null;
    color_label: string | null;
    sku: string | null;
    product_id: string;
};

export type OrderEmailPayload = {
    order_number: string;
    order_date: string;

    subtotal: string;
    shipping_amount: string;
    discount_amount: string | null;
    total: string;

    shipping_method: string | null;

    customer_name: string | null;
    customer_email: string | null;

    shipping_address_1: string | null;
    shipping_address_2: string | null;
    shipping_city: string | null;
    shipping_state: string | null;
    shipping_postcode: string | null;
    shipping_country: string | null;

    payment_method: string | null;
    last4: string | null;

    support_email: string | null;
    store_name: string | null;
    company_address: string | null;
    manage_orders_url: string | null;

    items: OrderEmailItem[];
};
