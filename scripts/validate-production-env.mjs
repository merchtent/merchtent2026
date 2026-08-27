const required = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", kind: "url" },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", minLength: 32 },
  { key: "NEXT_PUBLIC_SITE_URL", kind: "url" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", minLength: 32 },
  { key: "STRIPE_SECRET_KEY", prefix: "sk_", minLength: 16 },
  { key: "STRIPE_WEBHOOK_SECRET", prefix: "whsec_", minLength: 16 },
  { key: "POSTMARK_SERVER_TOKEN", minLength: 16 },
  { key: "POSTMARK_FROM", kind: "email" },
  { key: "POSTMARK_ADMIN_TO", kind: "email" },
  { key: "MOBILEMESSAGE_USERNAME" },
  { key: "MOBILEMESSAGE_PASSWORD", minLength: 12 },
  { key: "PRINTIFY_API_TOKEN", minLength: 16 },
  { key: "PRINTIFY_SHOP_ID" },
  { key: "OPERATIONAL_HEALTH_SECRET", minLength: 32 },
];

const printifyDefaults = [
  { key: "PRINTIFY_DEFAULT_BLUEPRINT_ID", fallback: "PRINTIFY_DEFAULT_TEE_BLUEPRINT_ID" },
  { key: "PRINTIFY_DEFAULT_PRINT_PROVIDER_ID", fallback: "PRINTIFY_DEFAULT_TEE_PRINT_PROVIDER_ID" },
  { key: "PRINTIFY_DEFAULT_VARIANT_IDS", fallback: "PRINTIFY_DEFAULT_TEE_VARIANT_IDS", kind: "integer-list" },
];

const optionalUrl = ["MANAGE_ORDERS_URL"];
const failures = [];

for (const rule of required) {
  validate(rule);
}

for (const rule of printifyDefaults) {
  const primary = read(rule.key);
  const fallback = read(rule.fallback);

  if (!primary && !fallback) {
    failures.push(`${rule.key} or ${rule.fallback} is required`);
    continue;
  }

  validateValue(primary ? rule.key : rule.fallback, primary || fallback, rule.kind ?? "integer");
}

for (const key of optionalUrl) {
  const value = read(key);
  if (value) validateValue(key, value, "url");
}

if (failures.length > 0) {
  console.error("Production environment validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Production environment validation passed.");

function validate(rule) {
  const value = read(rule.key);
  if (!value) {
    failures.push(`${rule.key} is required`);
    return;
  }

  validateValue(rule.key, value, rule.kind);

  if (rule.prefix && !value.startsWith(rule.prefix)) {
    failures.push(`${rule.key} must start with ${rule.prefix}`);
  }

  if (rule.minLength && value.length < rule.minLength) {
    failures.push(`${rule.key} must be at least ${rule.minLength} characters`);
  }

  if (isPlaceholderValue(value)) {
    failures.push(`${rule.key} must not use a placeholder or example value`);
  }
}

function validateValue(key, value, kind) {
  if (!kind) return;

  if (kind === "url") {
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "https:") {
        failures.push(`${key} must use https in production`);
      }
      if (key === "NEXT_PUBLIC_SITE_URL" && isLocalOrPrivateHost(parsed.hostname)) {
        failures.push(`${key} must be a public production hostname`);
      }
      if (key === "NEXT_PUBLIC_SITE_URL" && isReservedDocumentationHost(parsed.hostname)) {
        failures.push(`${key} must not use a reserved documentation hostname`);
      }
    } catch {
      failures.push(`${key} must be a valid URL`);
    }
    return;
  }

  if (kind === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      failures.push(`${key} must be a valid email address`);
    }
    return;
  }

  if (kind === "integer") {
    if (!isStrictInteger(value)) {
      failures.push(`${key} must be an integer`);
    }
    return;
  }

  if (kind === "integer-list") {
    const values = value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (!values.length || values.some((entry) => !isStrictInteger(entry))) {
      failures.push(`${key} must be a comma-separated list of integers`);
    }
  }
}

function read(key) {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : "";
}

function isStrictInteger(value) {
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value));
}

function isLocalOrPrivateHost(hostname) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) return true;
  if (host === "0.0.0.0" || host === "127.0.0.1" || host === "::1") return true;
  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return false;
}

function isReservedDocumentationHost(hostname) {
  const host = hostname.toLowerCase();
  return (
    host === "example.com" ||
    host === "example.org" ||
    host === "example.net" ||
    host.endsWith(".example") ||
    host.endsWith(".invalid") ||
    host.endsWith(".test")
  );
}

function isPlaceholderValue(value) {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "changeme" ||
    normalized === "change-me" ||
    normalized === "change_me" ||
    normalized === "todo" ||
    normalized === "placeholder" ||
    normalized === "example" ||
    normalized === "secret" ||
    normalized === "password" ||
    normalized.startsWith("your_") ||
    normalized.startsWith("your-") ||
    normalized.includes("replace-me")
  );
}
