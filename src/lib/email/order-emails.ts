import type { OrderEmailPayload } from "@/lib/email/order-email-types";

type RenderedEmail = {
    subject: string;
    htmlBody: string;
    textBody: string;
};

type EmailOptions = {
    siteUrl: string;
    assetBaseUrl?: string;
};

const COLOURS = {
    black: "#050505",
    panel: "#111111",
    border: "#303030",
    cream: "#f4f1e8",
    muted: "#aaa8a1",
    lime: "#b7ff3c",
    red: "#f00000",
};

function escapeHtml(value: string | number | null | undefined) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function absoluteUrl(siteUrl: string, path: string) {
    return new URL(path, `${siteUrl.replace(/\/$/, "")}/`).toString();
}

function addressLines(payload: OrderEmailPayload) {
    return [
        payload.customer_name,
        payload.shipping_address_1,
        payload.shipping_address_2,
        [payload.shipping_city, payload.shipping_state, payload.shipping_postcode]
            .filter(Boolean)
            .join(" "),
        payload.shipping_country,
    ].filter((line): line is string => Boolean(line));
}

function textOrderSummary(payload: OrderEmailPayload) {
    const lines = payload.items.flatMap((item) => {
        const options = [item.size, item.color_label].filter(Boolean).join(" / ");
        return [
            `${item.qty} x ${item.title}${options ? ` (${options})` : ""}`,
            `  ${item.line_total}`,
        ];
    });

    return [
        ...lines,
        "",
        `Subtotal: ${payload.subtotal}`,
        `Shipping: ${payload.shipping_amount}`,
        ...(payload.discount_amount ? [`Discount: -${payload.discount_amount}`] : []),
        `Total: ${payload.total}`,
    ].join("\n");
}

function itemRows(payload: OrderEmailPayload) {
    return payload.items
        .map((item) => {
            const options = [item.size, item.color_label].filter(Boolean).join(" / ");
            return `
                <tr>
                    <td style="padding:18px 0;border-bottom:1px solid ${COLOURS.border};vertical-align:top;">
                        <div style="font-size:16px;font-weight:800;line-height:1.35;color:${COLOURS.cream};">${escapeHtml(item.title)}</div>
                        <div style="padding-top:5px;font-size:13px;line-height:1.45;color:${COLOURS.muted};">
                            Qty ${escapeHtml(item.qty)}${options ? ` &nbsp;/&nbsp; ${escapeHtml(options)}` : ""}
                        </div>
                    </td>
                    <td align="right" style="padding:18px 0;border-bottom:1px solid ${COLOURS.border};vertical-align:top;font-size:16px;font-weight:800;color:${COLOURS.cream};white-space:nowrap;">
                        ${escapeHtml(item.line_total)}
                    </td>
                </tr>`;
        })
        .join("");
}

function totalsRows(payload: OrderEmailPayload) {
    return `
        <tr>
            <td style="padding:16px 0 5px;font-size:14px;color:${COLOURS.muted};">Subtotal</td>
            <td align="right" style="padding:16px 0 5px;font-size:14px;color:${COLOURS.cream};">${escapeHtml(payload.subtotal)}</td>
        </tr>
        <tr>
            <td style="padding:5px 0;font-size:14px;color:${COLOURS.muted};">Shipping</td>
            <td align="right" style="padding:5px 0;font-size:14px;color:${COLOURS.cream};">${escapeHtml(payload.shipping_amount)}</td>
        </tr>
        ${payload.discount_amount ? `
        <tr>
            <td style="padding:5px 0;font-size:14px;color:${COLOURS.muted};">Discount</td>
            <td align="right" style="padding:5px 0;font-size:14px;color:${COLOURS.lime};">-${escapeHtml(payload.discount_amount)}</td>
        </tr>` : ""}
        <tr>
            <td style="padding:16px 0 0;border-top:1px solid ${COLOURS.border};font-size:18px;font-weight:900;color:${COLOURS.cream};">Total</td>
            <td align="right" style="padding:16px 0 0;border-top:1px solid ${COLOURS.border};font-size:22px;font-weight:900;color:${COLOURS.lime};">${escapeHtml(payload.total)}</td>
        </tr>`;
}

function shell(input: {
    eyebrow: string;
    heading: string;
    preheader: string;
    body: string;
    footerNote: string;
    payload: OrderEmailPayload;
    options: EmailOptions;
}) {
    const logoUrl = absoluteUrl(
        input.options.assetBaseUrl ?? input.options.siteUrl,
        "/images/merch-tent-logo-badge-192.png"
    );
    const shopUrl = absoluteUrl(input.options.siteUrl, "/");
    const supportEmail = input.payload.support_email ?? "support@merchtent.com.au";
    const storeName = input.payload.store_name ?? "Merch Tent";

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(input.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${COLOURS.black};color:${COLOURS.cream};font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(input.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:${COLOURS.black};">
        <tr>
            <td align="center" style="padding:24px 12px 40px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;">
                    <tr>
                        <td style="padding:0 0 18px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td style="vertical-align:middle;">
                                        <a href="${escapeHtml(shopUrl)}" style="text-decoration:none;">
                                            <img src="${escapeHtml(logoUrl)}" width="58" height="58" alt="Merch Tent" style="display:block;width:58px;height:58px;border:0;">
                                        </a>
                                    </td>
                                    <td align="right" style="vertical-align:middle;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${COLOURS.lime};">
                                        Built for the scene
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="border:1px solid ${COLOURS.border};background:${COLOURS.panel};">
                            <div style="height:7px;background:${COLOURS.red};line-height:7px;font-size:7px;">&nbsp;</div>
                            <div style="padding:34px 34px 18px;">
                                <div style="font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:${COLOURS.lime};">${escapeHtml(input.eyebrow)}</div>
                                <h1 style="margin:9px 0 0;font-size:34px;line-height:1.05;letter-spacing:0;color:${COLOURS.cream};font-family:Arial Black,Arial,Helvetica,sans-serif;text-transform:uppercase;">${escapeHtml(input.heading)}</h1>
                            </div>
                            <div style="padding:0 34px 36px;">${input.body}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 12px 0;text-align:center;font-size:12px;line-height:1.6;color:${COLOURS.muted};">
                            ${escapeHtml(input.footerNote)}<br>
                            <a href="mailto:${escapeHtml(supportEmail)}" style="color:${COLOURS.cream};">${escapeHtml(supportEmail)}</a>
                            ${input.payload.company_address ? `<br>${escapeHtml(input.payload.company_address)}` : ""}
                            <br>&copy; ${new Date().getUTCFullYear()} ${escapeHtml(storeName)}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

function orderTable(payload: OrderEmailPayload) {
    return `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-top:26px;">
            ${itemRows(payload)}
            ${totalsRows(payload)}
        </table>`;
}

function detailBox(label: string, lines: string[]) {
    if (!lines.length) return "";
    return `
        <div style="margin-top:26px;padding:20px;border:1px solid ${COLOURS.border};background:${COLOURS.black};">
            <div style="font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:${COLOURS.lime};">${escapeHtml(label)}</div>
            <div style="padding-top:10px;font-size:14px;line-height:1.65;color:${COLOURS.cream};">${lines.map(escapeHtml).join("<br>")}</div>
        </div>`;
}

export function renderCustomerOrderEmail(
    payload: OrderEmailPayload,
    options: EmailOptions
): RenderedEmail {
    const greeting = payload.customer_name ? `Hey ${payload.customer_name},` : "Hey there,";
    const address = addressLines(payload);
    const body = `
        <p style="margin:0;font-size:17px;line-height:1.65;color:${COLOURS.cream};">${escapeHtml(greeting)}</p>
        <p style="margin:8px 0 0;font-size:17px;line-height:1.65;color:${COLOURS.cream};">Your order is locked in. We&rsquo;ll send another update when it is on the move.</p>
        <div style="margin-top:24px;padding:14px 16px;border-left:4px solid ${COLOURS.red};background:${COLOURS.black};font-size:14px;color:${COLOURS.muted};">
            Order <strong style="color:${COLOURS.cream};">${escapeHtml(payload.order_number)}</strong> &nbsp;/&nbsp; ${escapeHtml(payload.order_date)}
        </div>
        ${orderTable(payload)}
        ${detailBox("Shipping to", address)}
        ${payload.shipping_method ? detailBox("Delivery", [payload.shipping_method]) : ""}`;

    return {
        subject: `Order confirmed: ${payload.order_number}`,
        htmlBody: shell({
            eyebrow: "Order confirmed",
            heading: "Your merch is in the queue.",
            preheader: `Order ${payload.order_number} is confirmed.`,
            body,
            footerNote: "Questions about your order? Talk to a real person.",
            payload,
            options,
        }),
        textBody: [
            "MERCH TENT",
            "",
            `${greeting}`,
            "Your order is locked in. We'll send another update when it is on the move.",
            "",
            `Order: ${payload.order_number}`,
            `Date: ${payload.order_date}`,
            "",
            textOrderSummary(payload),
            ...(address.length ? ["", "Shipping to", ...address] : []),
            ...(payload.shipping_method ? ["", `Delivery: ${payload.shipping_method}`] : []),
            "",
            `Questions? ${payload.support_email ?? "support@merchtent.com.au"}`,
        ].join("\n"),
    };
}

export function renderAdminOrderEmail(
    payload: OrderEmailPayload,
    options: EmailOptions
): RenderedEmail {
    const address = addressLines(payload);
    const manageUrl = payload.manage_orders_url ?? absoluteUrl(options.siteUrl, "/admin/orders");
    const body = `
        <p style="margin:0;font-size:17px;line-height:1.65;color:${COLOURS.cream};">A new order has landed and is ready for operations.</p>
        <div style="margin-top:24px;padding:14px 16px;border-left:4px solid ${COLOURS.red};background:${COLOURS.black};font-size:14px;color:${COLOURS.muted};">
            Order <strong style="color:${COLOURS.cream};">${escapeHtml(payload.order_number)}</strong> &nbsp;/&nbsp; ${escapeHtml(payload.order_date)}
        </div>
        ${orderTable(payload)}
        ${detailBox("Customer", [payload.customer_name, payload.customer_email].filter((line): line is string => Boolean(line)))}
        ${detailBox("Shipping to", address)}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
            <tr><td bgcolor="${COLOURS.lime}" style="background:${COLOURS.lime};">
                <a href="${escapeHtml(manageUrl)}" style="display:inline-block;padding:14px 22px;font-size:14px;font-weight:900;color:${COLOURS.black};text-decoration:none;text-transform:uppercase;">Open order</a>
            </td></tr>
        </table>`;

    return {
        subject: `New order ${payload.order_number} - ${payload.total}`,
        htmlBody: shell({
            eyebrow: "New order",
            heading: `${payload.total} just landed.`,
            preheader: `New Merch Tent order ${payload.order_number}.`,
            body,
            footerNote: "Internal order notification from Merch Tent.",
            payload,
            options,
        }),
        textBody: [
            "MERCH TENT - NEW ORDER",
            "",
            `Order: ${payload.order_number}`,
            `Date: ${payload.order_date}`,
            `Customer: ${payload.customer_name ?? "-"}`,
            `Email: ${payload.customer_email ?? "-"}`,
            "",
            textOrderSummary(payload),
            ...(address.length ? ["", "Shipping to", ...address] : []),
            "",
            `Open order: ${manageUrl}`,
        ].join("\n"),
    };
}
