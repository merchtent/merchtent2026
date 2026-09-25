export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { noStoreJson } from "@/lib/api/no-store";
import { requireLaunchedAmplifyConfig } from "@/lib/amplify/config";
import { requireArtistAction } from "@/lib/auth/artist";
import { rejectCrossOriginRequest } from "@/lib/auth/request-origin";
import { publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { recordPlatformEvent } from "@/lib/platform-events";
import { checkDurableRateLimit } from "@/lib/rate-limit";
import { getServiceSupabase } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe/client";

const CHECKOUT_LIMIT = 5;
const CHECKOUT_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
    const originRejection = rejectCrossOriginRequest(request);
    if (originRejection) return originRejection;

    try {
        const config = requireLaunchedAmplifyConfig();
        const { supabase, user, artist } = await requireArtistAction();
        const allowed = await checkDurableRateLimit(
            supabase,
            `amplify:${user.id}:checkout`,
            CHECKOUT_LIMIT,
            CHECKOUT_WINDOW_MS,
            "check_public_rate_limit",
            { fallback: "deny" }
        );
        if (!allowed) return noStoreJson({ error: "Too many attempts. Try again later." }, { status: 429 });

        const serviceSupabase = getServiceSupabase();
        const { data: existing, error: existingError } = await serviceSupabase
            .from("artist_subscriptions")
            .select("status, stripe_customer_id")
            .eq("artist_id", artist.id)
            .maybeSingle();
        if (existingError) throw new Error("Could not load Amplify billing state.");
        if (existing && ["active", "trialing", "past_due", "unpaid", "paused"].includes(existing.status)) {
            return noStoreJson({ error: "Amplify billing already exists. Manage the existing membership instead." }, { status: 409 });
        }

        const price = await stripe.prices.retrieve(config.stripePriceId);
        const validPrice = price.active &&
            price.currency.toUpperCase() === "AUD" &&
            price.unit_amount === config.monthlyPriceCents &&
            price.recurring?.interval === "month" &&
            price.recurring.interval_count === 1;
        if (!validPrice) {
            logger.error("Amplify Stripe Price does not match approved configuration", {
                stripe_price_id: price.id,
                active: price.active,
                currency: price.currency,
                unit_amount: price.unit_amount,
                interval: price.recurring?.interval ?? null,
                interval_count: price.recurring?.interval_count ?? null,
            });
            return noStoreJson({ error: "Amplify billing is not configured correctly." }, { status: 503 });
        }

        const siteUrl = publicEnv.siteUrl();
        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            line_items: [{ price: config.stripePriceId, quantity: 1 }],
            customer: existing?.stripe_customer_id ?? undefined,
            customer_email: existing?.stripe_customer_id ? undefined : user.email,
            success_url: `${siteUrl}/dashboard/amplify?billing=success`,
            cancel_url: `${siteUrl}/dashboard/amplify?billing=canceled`,
            metadata: {
                checkout_type: "artist_amplify",
                artist_id: artist.id,
                user_id: user.id,
                plan_key: "amplify",
            },
            subscription_data: {
                metadata: {
                    artist_id: artist.id,
                    user_id: user.id,
                    plan_key: "amplify",
                },
            },
        }, {
            idempotencyKey: `amplify-checkout:${artist.id}:${config.stripePriceId}:${Math.floor(Date.now() / 600_000)}`,
        });

        await recordPlatformEvent({
            scope: "amplify",
            action: "amplify_checkout_created",
            actorUserId: user.id,
            artistId: artist.id,
            externalId: session.id,
            message: "Artist started Merch Tent Amplify checkout.",
        }, { supabase: serviceSupabase, failureLogMessage: "Amplify checkout audit failed" });

        return noStoreJson({ url: session.url });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Could not start Amplify checkout.";
        const unavailable = message === "Merch Tent Amplify is not available yet.";
        logger.error("Amplify checkout failed", { error: message });
        return noStoreJson(
            { error: unavailable ? message : "Could not start Amplify checkout." },
            { status: unavailable ? 404 : message === "Sign in required." ? 401 : 500 }
        );
    }
}
