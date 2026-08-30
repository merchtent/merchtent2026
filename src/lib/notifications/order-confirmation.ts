import {
    buildOrderEmailPayloadFromStripe,
    sendOrderEmails,
    type OrderEmailItem,
} from "@/lib/postmark";
import { normalisePhone, sendSms } from "@/lib/sms";
import {
    finishNotificationDelivery,
    reserveNotificationDelivery,
} from "@/lib/notifications/delivery-ledger";
import { getServiceSupabase } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { recordPlatformEvent, type PlatformEventSeverity } from "@/lib/platform-events";
import { checkoutShippingAmountCents } from "@/lib/shipping-methods";

type OrderItemRow = {
    id: string;
    product_id: string | null;
    title: string | null;
    qty: number | null;
    unit_price_cents: number | null;
    currency: string | null;
    sku: string | null;
    color_label: string | null;
    size_label: string | null;
};

type OrderNotificationRow = {
    id: string;
    order_number: string | null;
    created_at: string | null;
    email: string | null;
    phone: string | null;
    first_name: string | null;
    last_name: string | null;
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
    stripe_session_id: string | null;
    stripe_payment_intent: string | null;
    subtotal_cents: number | null;
    total_cents: number | null;
    discount_cents?: number | null;
    currency: string | null;
    shipping_method: string | null;
    voucher_code: string | null;
    order_items: OrderItemRow[] | null;
};

function shippingCentsForMethod(method: string | null | undefined) {
    return checkoutShippingAmountCents(method);
}

function formatMoney(cents: number, currency: string) {
    return (cents / 100).toLocaleString("en-AU", {
        style: "currency",
        currency,
    });
}

function orderEmailItems(order: OrderNotificationRow): OrderEmailItem[] {
    const currency = order.currency ?? "AUD";
    return (order.order_items ?? [])
        .filter((item) => Number(item.unit_price_cents ?? 0) > 0)
        .map((item) => {
            const qty = Math.max(Number(item.qty ?? 1), 1);
            const unitCents = Number(item.unit_price_cents ?? 0);
            const lineTotalCents = unitCents * qty;

            return {
                title: item.title ?? "Item",
                qty,
                unit_price: formatMoney(unitCents, item.currency ?? currency),
                line_total: formatMoney(lineTotalCents, item.currency ?? currency),
                size: item.size_label,
                color_label: item.color_label,
                sku: item.sku,
                product_id: item.product_id ?? item.id,
            };
        });
}

async function logNotificationEvent(input: {
    action: string;
    severity: PlatformEventSeverity;
    actorUserId?: string | null;
    orderId: string;
    externalId?: string | null;
    message: string;
    metadata?: Record<string, unknown>;
}) {
    await recordPlatformEvent(
        {
            scope: "notifications",
            action: input.action,
            severity: input.severity,
            actorUserId: input.actorUserId ?? null,
            orderId: input.orderId,
            externalId: input.externalId ?? null,
            message: input.message,
            metadata: input.metadata ?? {},
        },
        {
            failureLogMessage: "Notification platform event failed",
            failureContext: {
                action: input.action,
                order_id: input.orderId,
            },
        }
    );
}

function notificationErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

export async function sendOrderConfirmationEmail(input: {
    orderId: string;
    actorUserId?: string | null;
}) {
    const supabase = getServiceSupabase();
    const { data: order, error } = await supabase
        .from("orders")
        .select(
            "id, order_number, created_at, email, phone, first_name, last_name, line1, line2, city, state, postal_code, country, stripe_session_id, stripe_payment_intent, subtotal_cents, total_cents, discount_cents, currency, shipping_method, voucher_code, order_items ( id, product_id, title, qty, unit_price_cents, currency, sku, color_label, size_label )"
        )
        .eq("id", input.orderId)
        .maybeSingle();

    if (error) {
        logger.error("Order confirmation email order lookup failed", {
            order_id: input.orderId,
            actor_user_id: input.actorUserId ?? null,
            error: error.message,
        });
        throw new Error("Could not load order for confirmation email.");
    }

    if (!order) {
        throw new Error("Order not found.");
    }

    const typedOrder = order as OrderNotificationRow;
    if (!typedOrder.email) {
        throw new Error("Order has no customer email address.");
    }

    const currency = typedOrder.currency ?? "AUD";
    const orderNumber = typedOrder.order_number ?? typedOrder.id;
    const shippingCents = shippingCentsForMethod(typedOrder.shipping_method);
    const subtotalInclShipping = Number(typedOrder.subtotal_cents ?? 0);
    const subtotalCents = Math.max(subtotalInclShipping - shippingCents, 0);
    const discountCents =
        Number(typedOrder.discount_cents ?? 0) ||
        Math.max(subtotalInclShipping - Number(typedOrder.total_cents ?? subtotalInclShipping), 0);
    const customerName = [typedOrder.first_name, typedOrder.last_name]
        .filter(Boolean)
        .join(" ") || null;
    const idempotencyKey = `order:${typedOrder.id}:email:confirmation`;
    const shouldSend = await reserveNotificationDelivery({
        orderId: typedOrder.id,
        channel: "email",
        recipient: typedOrder.email,
        idempotencyKey,
        provider: "postmark",
    });

    if (!shouldSend) {
        return { sent: false, skipped: true };
    }

    try {
        const payload = buildOrderEmailPayloadFromStripe({
            order_number: orderNumber,
            createdAt: typedOrder.created_at ? new Date(typedOrder.created_at) : new Date(),
            currency,
            subtotal_cents: subtotalCents,
            shipping_cents: shippingCents,
            discount_cents: discountCents,
            shipping_method: typedOrder.shipping_method,
            voucher: typedOrder.voucher_code,
            customer_name: customerName,
            customer_email: typedOrder.email,
            shipping_address_1: typedOrder.line1,
            shipping_address_2: typedOrder.line2,
            shipping_city: typedOrder.city,
            shipping_state: typedOrder.state,
            shipping_postcode: typedOrder.postal_code,
            shipping_country: typedOrder.country,
            payment_method: "Stripe",
            last4: null,
            stripe_session_id: typedOrder.stripe_session_id,
            stripe_payment_intent_id: typedOrder.stripe_payment_intent,
            notes: null,
            items: orderEmailItems(typedOrder),
        });

        await sendOrderEmails({
            customerEmail: typedOrder.email,
            payload,
        });
        await finishNotificationDelivery(idempotencyKey, "sent");
        await logNotificationEvent({
            action: "order_email_resent",
            severity: "info",
            actorUserId: input.actorUserId,
            orderId: typedOrder.id,
            externalId: typedOrder.stripe_session_id,
            message: "Order confirmation email sent from persisted order data.",
            metadata: { order_number: orderNumber },
        });
        return { sent: true, skipped: false };
    } catch (sendError) {
        const errorMessage = notificationErrorMessage(sendError);
        await finishNotificationDelivery(idempotencyKey, "failed", sendError);
        await logNotificationEvent({
            action: "order_email_retry_failed",
            severity: "warning",
            actorUserId: input.actorUserId,
            orderId: typedOrder.id,
            externalId: typedOrder.stripe_session_id,
            message: "Order confirmation email retry failed.",
            metadata: { error: errorMessage },
        });
        logger.error("Order confirmation email send failed", {
            order_id: typedOrder.id,
            order_number: orderNumber,
            actor_user_id: input.actorUserId ?? null,
            error: errorMessage,
        });
        throw new Error("Could not send order confirmation email.");
    }
}

export async function sendOrderConfirmationSms(input: {
    orderId: string;
    actorUserId?: string | null;
}) {
    const supabase = getServiceSupabase();
    const { data: order, error } = await supabase
        .from("orders")
        .select("id, order_number, first_name, last_name, phone, stripe_session_id")
        .eq("id", input.orderId)
        .maybeSingle();

    if (error) {
        logger.error("Order confirmation SMS order lookup failed", {
            order_id: input.orderId,
            actor_user_id: input.actorUserId ?? null,
            error: error.message,
        });
        throw new Error("Could not load order for confirmation SMS.");
    }

    if (!order) {
        throw new Error("Order not found.");
    }

    const typedOrder = order as Pick<
        OrderNotificationRow,
        "id" | "order_number" | "first_name" | "last_name" | "phone" | "stripe_session_id"
    >;
    const phone = normalisePhone(typedOrder.phone);

    if (!phone) {
        throw new Error("Order has no deliverable phone number.");
    }

    const orderNumber = typedOrder.order_number ?? typedOrder.id;
    const customerName = [typedOrder.first_name, typedOrder.last_name]
        .filter(Boolean)
        .join(" ") || null;
    const idempotencyKey = `order:${typedOrder.id}:sms:confirmation`;
    const shouldSend = await reserveNotificationDelivery({
        orderId: typedOrder.id,
        channel: "sms",
        recipient: phone,
        idempotencyKey,
        provider: "mobilemessage",
    });

    if (!shouldSend) {
        return { sent: false, skipped: true };
    }

    const smsMessage = `Merch Tent

Thanks for your order ${customerName ?? ""}!

Order ${orderNumber} confirmed.

We'll send tracking once it ships.`;

    try {
        await sendSms(phone, smsMessage, `order:${typedOrder.id}`);
        await finishNotificationDelivery(idempotencyKey, "sent");
        await logNotificationEvent({
            action: "order_sms_resent",
            severity: "info",
            actorUserId: input.actorUserId,
            orderId: typedOrder.id,
            externalId: typedOrder.stripe_session_id,
            message: "Order confirmation SMS sent from persisted order data.",
            metadata: { order_number: orderNumber },
        });
        return { sent: true, skipped: false };
    } catch (sendError) {
        const errorMessage = notificationErrorMessage(sendError);
        await finishNotificationDelivery(idempotencyKey, "failed", sendError);
        await logNotificationEvent({
            action: "order_sms_retry_failed",
            severity: "warning",
            actorUserId: input.actorUserId,
            orderId: typedOrder.id,
            externalId: typedOrder.stripe_session_id,
            message: "Order confirmation SMS retry failed.",
            metadata: { error: errorMessage },
        });
        logger.error("Order confirmation SMS send failed", {
            order_id: typedOrder.id,
            order_number: orderNumber,
            actor_user_id: input.actorUserId ?? null,
            error: errorMessage,
        });
        throw new Error("Could not send order confirmation SMS.");
    }
}
