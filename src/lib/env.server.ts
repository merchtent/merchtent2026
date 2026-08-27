import "server-only";
import {
    optionalEnv,
    optionalEnvWithDefault,
    optionalIntegerEnv,
    optionalIntegerListEnv,
    publicEnv,
    requireEnv,
} from "./env";

export const serverEnv = {
    ...publicEnv,
    supabaseServiceRoleKey: () => requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    stripeSecretKey: () => requireEnv("STRIPE_SECRET_KEY"),
    stripeWebhookSecret: () => requireEnv("STRIPE_WEBHOOK_SECRET"),
    mobileMessageUsername: () => requireEnv("MOBILEMESSAGE_USERNAME"),
    mobileMessagePassword: () => requireEnv("MOBILEMESSAGE_PASSWORD"),
    printifyApiToken: () => requireEnv("PRINTIFY_API_TOKEN"),
    printifyShopId: () => requireEnv("PRINTIFY_SHOP_ID"),
    printifyDefaultBlueprintId: () =>
        optionalIntegerEnv("PRINTIFY_DEFAULT_BLUEPRINT_ID") ??
        optionalIntegerEnv("PRINTIFY_DEFAULT_TEE_BLUEPRINT_ID"),
    printifyDefaultPrintProviderId: () =>
        optionalIntegerEnv("PRINTIFY_DEFAULT_PRINT_PROVIDER_ID") ??
        optionalIntegerEnv("PRINTIFY_DEFAULT_TEE_PRINT_PROVIDER_ID"),
    printifyDefaultVariantIds: () =>
        optionalIntegerListEnv("PRINTIFY_DEFAULT_VARIANT_IDS") ??
        optionalIntegerListEnv("PRINTIFY_DEFAULT_TEE_VARIANT_IDS"),
    requiredPrintifyDefaultBlueprintId: () =>
        requireOptionalValue(
            "PRINTIFY_DEFAULT_BLUEPRINT_ID",
            serverEnv.printifyDefaultBlueprintId()
        ),
    requiredPrintifyDefaultPrintProviderId: () =>
        requireOptionalValue(
            "PRINTIFY_DEFAULT_PRINT_PROVIDER_ID",
            serverEnv.printifyDefaultPrintProviderId()
        ),
    requiredPrintifyDefaultVariantIds: () =>
        requireOptionalValue(
            "PRINTIFY_DEFAULT_VARIANT_IDS",
            serverEnv.printifyDefaultVariantIds()
        ),
    postmarkServerToken: () => requireEnv("POSTMARK_SERVER_TOKEN"),
    postmarkFrom: () => requireEnv("POSTMARK_FROM"),
    postmarkAdminTo: () => requireEnv("POSTMARK_ADMIN_TO"),
    optionalPostmarkServerToken: () => optionalEnv("POSTMARK_SERVER_TOKEN"),
    optionalPostmarkFrom: () => optionalEnv("POSTMARK_FROM"),
    optionalPostmarkAdminTo: () => optionalEnv("POSTMARK_ADMIN_TO"),
    postmarkCustomerTemplateAlias: () =>
        optionalEnvWithDefault("POSTMARK_CUSTOMER_TEMPLATE_ALIAS", "order-confirmation"),
    postmarkAdminTemplateAlias: () =>
        optionalEnvWithDefault("POSTMARK_ADMIN_TEMPLATE_ALIAS", "order-admin-notify"),
    postmarkTestSecret: () => optionalEnv("POSTMARK_TEST_SECRET"),
    postmarkTestCustomerEmail: () => optionalEnv("POSTMARK_TEST_CUSTOMER_EMAIL"),
    postmarkSupportEmail: () =>
        optionalEnvWithDefault("POSTMARK_SUPPORT_EMAIL", "support@merchtent.com.au"),
    storeName: () => optionalEnvWithDefault("STORE_NAME", "Merch Tent"),
    companyAddress: () => optionalEnv("COMPANY_ADDRESS"),
    manageOrdersUrl: () => optionalEnv("MANAGE_ORDERS_URL"),
    operationalHealthSecret: () => requireEnv("OPERATIONAL_HEALTH_SECRET"),
};

function requireOptionalValue<T>(key: string, value: T | null) {
    if (value === null) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
