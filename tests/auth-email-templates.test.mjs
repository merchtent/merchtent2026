import assert from "node:assert/strict";
import test from "node:test";

import { buildAuthEmailConfig } from "../scripts/lib/auth-email-templates.mjs";

test("auth email templates carry the Merch Tent brand and required Supabase variables", () => {
  const config = buildAuthEmailConfig(
    "http://localhost:3000",
    "https://www.merchtent.com.au"
  );

  assert.match(config.mailer_templates_confirmation_content, /Merch Tent/);
  assert.match(config.mailer_templates_confirmation_content, /#b7ff3c/);
  assert.match(config.mailer_templates_confirmation_content, /{{ \.ConfirmationURL }}/);
  assert.match(config.mailer_templates_recovery_content, /{{ \.ConfirmationURL }}/);
  assert.match(config.mailer_templates_email_change_content, /{{ \.ConfirmationURL }}/);
  assert.match(config.mailer_templates_magic_link_content, /{{ \.ConfirmationURL }}/);
  assert.match(config.mailer_templates_invite_content, /{{ \.ConfirmationURL }}/);
  assert.match(config.mailer_templates_reauthentication_content, /{{ \.Token }}/);
  assert.match(
    config.mailer_templates_confirmation_content,
    /https:\/\/www\.merchtent\.com\.au\/images\/merch-tent-logo-badge-192\.png/
  );
});
