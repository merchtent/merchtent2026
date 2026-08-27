const required = [
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_PROJECT_REF",
  "POSTMARK_SERVER_TOKEN",
];

const missing = required.filter((key) => !read(key));
if (missing.length) {
  console.error("Missing required environment variables:");
  for (const key of missing) console.error(`- ${key}`);
  process.exit(1);
}

const projectRef = read("SUPABASE_PROJECT_REF");
const fromEmail = read("SUPABASE_AUTH_SMTP_FROM") || read("POSTMARK_FROM") || "support@merchtent.com.au";
const senderName = read("SUPABASE_AUTH_SMTP_SENDER_NAME") || "Merch Tent";
const smtpHost = read("SUPABASE_AUTH_SMTP_HOST") || "smtp.postmarkapp.com";
const smtpPort = Number(read("SUPABASE_AUTH_SMTP_PORT") || "587");
const smtpUser = read("SUPABASE_AUTH_SMTP_USER") || read("POSTMARK_SERVER_TOKEN");
const smtpPass = read("SUPABASE_AUTH_SMTP_PASS") || read("POSTMARK_SERVER_TOKEN");

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
  console.error("SUPABASE_AUTH_SMTP_FROM or POSTMARK_FROM must be a valid email address.");
  process.exit(1);
}

if (!Number.isSafeInteger(smtpPort) || smtpPort <= 0) {
  console.error("SUPABASE_AUTH_SMTP_PORT must be a valid positive integer.");
  process.exit(1);
}

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${read("SUPABASE_ACCESS_TOKEN")}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    external_email_enabled: true,
    mailer_secure_email_change_enabled: true,
    mailer_autoconfirm: false,
    smtp_admin_email: fromEmail,
    smtp_host: smtpHost,
    smtp_port: smtpPort,
    smtp_user: smtpUser,
    smtp_pass: smtpPass,
    smtp_sender_name: senderName,
  }),
});

if (!response.ok) {
  const body = await response.text();
  console.error(`Supabase Auth SMTP configuration failed: HTTP ${response.status}`);
  console.error(body);
  process.exit(1);
}

console.log("Supabase Auth SMTP configured.");
console.log(`Project: ${projectRef}`);
console.log(`From: ${fromEmail}`);
console.log(`Host: ${smtpHost}:${smtpPort}`);
console.log(`Sender: ${senderName}`);

function read(key) {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : "";
}
