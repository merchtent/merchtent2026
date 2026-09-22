import nextEnv from "@next/env";
import { ServerClient } from "postmark";
import { buildAuthEmailConfig } from "./lib/auth-email-templates.mjs";

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

const config = buildAuthEmailConfig(siteUrl, emailAssetBaseUrl);
const confirmationUrl = `${siteUrl.replace(/\/$/, "")}/auth/callback?code=sample-only`;
const samples = [
  ["confirmation", config.mailer_subjects_confirmation, config.mailer_templates_confirmation_content],
  ["recovery", config.mailer_subjects_recovery, config.mailer_templates_recovery_content],
  ["email-change", config.mailer_subjects_email_change, config.mailer_templates_email_change_content],
  ["magic-link", config.mailer_subjects_magic_link, config.mailer_templates_magic_link_content],
  ["invite", config.mailer_subjects_invite, config.mailer_templates_invite_content],
  ["reauthentication", "482913 is your Merch Tent verification code", config.mailer_templates_reauthentication_content],
];

const client = new ServerClient(serverToken);

for (const [name, subject, template] of samples) {
  const htmlBody = template
    .replaceAll("{{ .ConfirmationURL }}", confirmationUrl)
    .replaceAll("{{ .SiteURL }}", siteUrl)
    .replaceAll("{{ .Token }}", "482913");
  const response = await client.sendEmail({
    From: from,
    To: recipient,
    ReplyTo: process.env.POSTMARK_SUPPORT_EMAIL || from,
    Subject: `[SAMPLE] ${subject}`,
    HtmlBody: htmlBody,
    TextBody: `Merch Tent email template sample: ${name}. No action is required.`,
    MessageStream: "outbound",
    Tag: `auth-${name}-sample`,
  });

  console.log(`${name}: ${response.MessageID}`);
}
