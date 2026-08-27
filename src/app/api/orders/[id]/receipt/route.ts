import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, noStoreJson } from "@/lib/api/no-store";
import { getServerSupabase } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { recordPlatformEvent } from "@/lib/platform-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrderItem = {
    title: string | null;
    qty: number | null;
    unit_price_cents: number | null;
    currency: string | null;
    sku: string | null;
    color_label: string | null;
    size_label: string | null;
};

type OrderRow = {
    id: string;
    order_number: string | null;
    created_at: string | null;
    status: string | null;
    currency: string | null;
    subtotal_cents: number | null;
    total_cents: number | null;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
    tracking_code: string | null;
    tracking_carrier: string | null;
    tracking_url: string | null;
    order_items: OrderItem[] | null;
};

function escapeHtml(value: string | number | null | undefined) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatMoney(cents: number | null | undefined, currency: string | null | undefined) {
    return new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: currency || "AUD",
    }).format(Number(cents ?? 0) / 100);
}

function formatDate(value: string | null | undefined) {
    if (!value) return "";
    return new Date(value).toLocaleString("en-AU", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function receiptFilename(orderLabel: string) {
    const safeLabel = orderLabel.replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-");
    return `merch-tent-receipt-${safeLabel || "order"}.html`;
}

function createReceiptCspNonce() {
    return randomBytes(16).toString("base64");
}

function receiptCsp(nonce: string) {
    return [
        "default-src 'none'",
        `style-src 'nonce-${nonce}'`,
        "base-uri 'none'",
        "form-action 'none'",
        "frame-ancestors 'none'",
    ].join("; ");
}

function receiptHtml(order: OrderRow, nonce: string) {
    const items = Array.isArray(order.order_items) ? order.order_items : [];
    const orderLabel = order.order_number ?? order.id;
    const customerName = [order.first_name, order.last_name].filter(Boolean).join(" ");
    const addressLines = [
        order.line1,
        order.line2,
        [order.city, order.state, order.postal_code].filter(Boolean).join(" "),
        order.country,
    ].filter(Boolean);
    const trackingRows = [
        order.tracking_carrier
            ? `<div><span class="muted">Carrier</span> ${escapeHtml(order.tracking_carrier)}</div>`
            : "",
        order.tracking_code
            ? `<div><span class="muted">Tracking</span> ${escapeHtml(order.tracking_code)}</div>`
            : "",
        order.tracking_url
            ? `<div><span class="muted">Tracking URL</span> ${escapeHtml(order.tracking_url)}</div>`
            : "",
    ]
        .filter(Boolean)
        .join("");

    const itemRows = items
        .map((item) => {
            const qty = Math.max(Number(item.qty ?? 1), 1);
            const unit = Number(item.unit_price_cents ?? 0);
            const lineTotal = qty * unit;
            const detail = [item.size_label, item.color_label, item.sku]
                .filter(Boolean)
                .join(" / ");

            return `
                <tr>
                    <td>
                        <strong>${escapeHtml(item.title || "Item")}</strong>
                        ${detail ? `<div class="muted">${escapeHtml(detail)}</div>` : ""}
                    </td>
                    <td>${qty}</td>
                    <td>${escapeHtml(formatMoney(unit, item.currency ?? order.currency))}</td>
                    <td>${escapeHtml(formatMoney(lineTotal, item.currency ?? order.currency))}</td>
                </tr>`;
        })
        .join("");

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Receipt ${escapeHtml(orderLabel)}</title>
    <style nonce="${escapeHtml(nonce)}">
        body { color: #111; font-family: Arial, sans-serif; margin: 40px; }
        h1 { margin: 0 0 8px; }
        .muted { color: #555; font-size: 12px; }
        .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 32px; }
        .box { border: 1px solid #ddd; padding: 16px; }
        table { border-collapse: collapse; margin-top: 24px; width: 100%; }
        th, td { border-bottom: 1px solid #ddd; padding: 10px; text-align: left; vertical-align: top; }
        th:nth-child(n+2), td:nth-child(n+2) { text-align: right; }
        .total { font-size: 18px; font-weight: 700; text-align: right; }
        @media print { body { margin: 20mm; } }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>Merch Tent Receipt</h1>
            <div class="muted">Order ${escapeHtml(orderLabel)}</div>
            <div class="muted">Placed ${escapeHtml(formatDate(order.created_at))}</div>
            <div class="muted">Status ${escapeHtml(order.status ?? "unknown")}</div>
        </div>
        <div class="box">
            <strong>${escapeHtml(customerName || order.email || "Customer")}</strong>
            ${order.email ? `<div>${escapeHtml(order.email)}</div>` : ""}
            ${addressLines.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}
        </div>
    </div>

    ${
        trackingRows
            ? `<div class="box">
        <strong>Fulfilment</strong>
        ${trackingRows}
    </div>`
            : ""
    }

    <table>
        <thead>
            <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>${itemRows}</tbody>
    </table>

    <p class="total">Total ${escapeHtml(formatMoney(order.total_cents ?? order.subtotal_cents, order.currency))}</p>
</body>
</html>`;
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = getServerSupabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return noStoreJson({ error: "Sign in required." }, { status: 401 });
    }

    const { data: order, error } = await supabase
        .from("orders")
        .select(
            "id, order_number, created_at, status, currency, subtotal_cents, total_cents, email, first_name, last_name, line1, line2, city, state, postal_code, country, tracking_code, tracking_carrier, tracking_url, order_items ( title, qty, unit_price_cents, currency, sku, color_label, size_label )"
        )
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (error || !order) {
        if (error) {
            logger.error("customer order receipt load failed", {
                order_id: id,
                user_id: user.id,
                error: error.message,
            });
        }

        return noStoreJson(
            { error: error ? "Could not load this receipt." : "Order not found." },
            { status: error ? 500 : 404 }
        );
    }

    const typedOrder = order as OrderRow;
    const orderLabel = typedOrder.order_number ?? typedOrder.id;
    const nonce = createReceiptCspNonce();

    await recordPlatformEvent(
        {
            scope: "orders",
            action: "customer_receipt_viewed",
            severity: "info",
            actorUserId: user.id,
            orderId: typedOrder.id,
            message: "Customer viewed an order receipt.",
            metadata: {
                order_number: typedOrder.order_number,
                order_status: typedOrder.status,
                has_tracking: Boolean(typedOrder.tracking_code || typedOrder.tracking_url),
                tracking_carrier: typedOrder.tracking_carrier,
            },
        },
        {
            failureLogMessage: "Customer receipt access audit failed",
            failureContext: {
                order_id: typedOrder.id,
                user_id: user.id,
            },
        }
    );

    return new NextResponse(receiptHtml(typedOrder, nonce), {
        status: 200,
        headers: {
            ...NO_STORE_HEADERS,
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": `inline; filename="${receiptFilename(orderLabel)}"`,
            "Content-Security-Policy": receiptCsp(nonce),
            "X-Robots-Tag": "noindex, noarchive",
        },
    });
}
