import nextEnv from "@next/env";
import { ServerClient } from "postmark";
import {
  renderAdminOrderEmail,
  renderCustomerOrderEmail,
} from "../src/lib/email/order-emails.ts";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const recipient = process.argv[2] || process.env.POSTMARK_TEST_CUSTOMER_EMAIL;
const serverToken = process.env.POSTMARK_SERVER_TOKEN;
const from = process.env.POSTMARK_FROM;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://merchtent.com.au";
const emailAssetBaseUrl = process.env.EMAIL_ASSET_BASE_URL || "https://www.merchtent.com.au";

if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
  throw new Error("Pass a valid recipient or set POSTMARK_TEST_CUSTOMER_EMAIL.");
}

if (!serverToken || !from) {
  throw new Error("POSTMARK_SERVER_TOKEN and POSTMARK_FROM are required.");
}

const payload = {
  order_number: "TEST-ORDER-1234",
  order_date: new Date().toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }),
  subtotal: "A$78.00",
  shipping_amount: "A$10.00",
  discount_amount: null,
  total: "A$88.00",
  shipping_method: "Standard shipping",
  customer_name: "Dan Littlejohn",
  customer_email: recipient,
  shipping_address_1: "123 Test Street",
  shipping_address_2: null,
  shipping_city: "Melbourne",
  shipping_state: "VIC",
  shipping_postcode: "3000",
  shipping_country: "Australia",
  payment_method: "Stripe",
  last4: "4242",
  support_email: process.env.POSTMARK_SUPPORT_EMAIL || from,
  store_name: process.env.STORE_NAME || "Merch Tent",
  company_address: process.env.COMPANY_ADDRESS || null,
  manage_orders_url: process.env.MANAGE_ORDERS_URL || `${siteUrl}/admin/orders`,
  items: [
    {
      title: "Local Noise Classic Tee",
      qty: 2,
      unit_price: "A$39.00",
      line_total: "A$78.00",
      size: "L",
      color_label: "Black",
      sku: "TEST-TEE-BLK-L",
      product_id: "test-product",
    },
  ],
};

const samples = [
  ["customer-order", renderCustomerOrderEmail(payload, { siteUrl, assetBaseUrl: emailAssetBaseUrl })],
  ["admin-order", renderAdminOrderEmail(payload, { siteUrl, assetBaseUrl: emailAssetBaseUrl })],
];
const client = new ServerClient(serverToken);

for (const [name, email] of samples) {
  const response = await client.sendEmail({
    From: from,
    To: recipient,
    ReplyTo: payload.support_email,
    Subject: `[SAMPLE] ${email.subject}`,
    HtmlBody: email.htmlBody,
    TextBody: email.textBody,
    MessageStream: "outbound",
    Tag: `${name}-sample`,
  });

  console.log(`${name}: ${response.MessageID}`);
}
