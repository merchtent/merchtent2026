import { noStoreJson } from "@/lib/api/no-store";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { logger } from "@/lib/logger";
import { getServiceSupabase } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Check = {
    name: string;
    ok: boolean;
    message?: string;
};

function checkEnv(name: string, read: () => string): Check {
    try {
        read();
        return { name, ok: true };
    } catch (error) {
        logger.error("health check runtime configuration failed", {
            check: name,
            error: error instanceof Error ? error.message : "Missing configuration",
        });

        return {
            name,
            ok: false,
            message: "Missing required runtime configuration.",
        };
    }
}

export async function GET() {
    const checks: Check[] = [
        checkEnv("NEXT_PUBLIC_SUPABASE_URL", publicEnv.supabaseUrl),
        checkEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", publicEnv.supabaseAnonKey),
        checkEnv("NEXT_PUBLIC_SITE_URL", publicEnv.siteUrl),
        checkEnv("SUPABASE_SERVICE_ROLE_KEY", serverEnv.supabaseServiceRoleKey),
        checkEnv("STRIPE_SECRET_KEY", serverEnv.stripeSecretKey),
        checkEnv("STRIPE_WEBHOOK_SECRET", serverEnv.stripeWebhookSecret),
        checkEnv("POSTMARK_SERVER_TOKEN", serverEnv.postmarkServerToken),
        checkEnv("POSTMARK_FROM", serverEnv.postmarkFrom),
        checkEnv("POSTMARK_ADMIN_TO", serverEnv.postmarkAdminTo),
        checkEnv("MOBILEMESSAGE_USERNAME", serverEnv.mobileMessageUsername),
        checkEnv("MOBILEMESSAGE_PASSWORD", serverEnv.mobileMessagePassword),
        checkEnv("PRINTIFY_API_TOKEN", serverEnv.printifyApiToken),
        checkEnv("PRINTIFY_SHOP_ID", serverEnv.printifyShopId),
        checkEnv("PRINTIFY_DEFAULT_BLUEPRINT_ID", () => String(serverEnv.requiredPrintifyDefaultBlueprintId())),
        checkEnv("PRINTIFY_DEFAULT_PRINT_PROVIDER_ID", () => String(serverEnv.requiredPrintifyDefaultPrintProviderId())),
        checkEnv("PRINTIFY_DEFAULT_VARIANT_IDS", () => String(serverEnv.requiredPrintifyDefaultVariantIds())),
        checkEnv("OPERATIONAL_HEALTH_SECRET", serverEnv.operationalHealthSecret),
    ];

    try {
        const supabase = getServiceSupabase();
        const { error } = await supabase
            .from("stripe_webhook_events")
            .select("id", { count: "exact", head: true });

        checks.push({
            name: "supabase_database",
            ok: !error,
            message: error ? "Database reachability check failed." : undefined,
        });

        if (error) {
            logger.error("health check database query failed", {
                check: "supabase_database",
                error: error.message,
            });
        }
    } catch (error) {
        logger.error("health check database connection failed", {
            check: "supabase_database",
            error: error instanceof Error ? error.message : "Database check failed",
        });

        checks.push({
            name: "supabase_database",
            ok: false,
            message: "Database reachability check failed.",
        });
    }

    const ok = checks.every((check) => check.ok);

    return noStoreJson(
        {
            ok,
            status: ok ? "ok" : "degraded",
            checked_at: new Date().toISOString(),
            checks,
        },
        {
            status: ok ? 200 : 503,
        }
    );
}
