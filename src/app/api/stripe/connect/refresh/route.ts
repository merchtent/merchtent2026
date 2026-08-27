export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { noStoreJson } from "@/lib/api/no-store";
import { rejectCrossOriginRequest } from "@/lib/auth/request-origin";
import { logger } from "@/lib/logger";
import { recordPlatformEvent } from "@/lib/platform-events";
import { checkDurableRateLimit } from "@/lib/rate-limit";
import { requireArtistAction } from "@/lib/auth/artist";
import { getServiceSupabase } from "@/lib/supabase/service";
import { snapshotStripeAccount } from "@/lib/stripe/connect";
import { stripe } from "@/lib/stripe/client";

const CONNECT_REFRESH_LIMIT = 20;
const CONNECT_REFRESH_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
    try {
        const originRejection = rejectCrossOriginRequest(req);
        if (originRejection) return originRejection;

        let auth: Awaited<ReturnType<typeof requireArtistAction>>;
        try {
            auth = await requireArtistAction();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Artist account required.";
            return noStoreJson(
                { error: message === "Sign in required." ? "Unauthorised" : "Artist account required." },
                { status: message === "Sign in required." ? 401 : 403 }
            );
        }
        const { supabase, user, artist } = auth;

        const allowed = await checkDurableRateLimit(
            supabase,
            `stripe_connect:${user.id}:refresh`,
            CONNECT_REFRESH_LIMIT,
            CONNECT_REFRESH_WINDOW_MS,
            "check_public_rate_limit",
            { fallback: "deny" }
        );

        if (!allowed) {
            return noStoreJson({ error: "Too many Stripe Connect refresh attempts. Try again later." }, { status: 429 });
        }

        const serviceSupabase = getServiceSupabase();
        const { data: paymentAccount, error: accountError } = await serviceSupabase
            .from("artist_payment_accounts")
            .select("stripe_account_id")
            .eq("artist_id", artist.id)
            .maybeSingle();

        if (accountError) {
            logger.error("Stripe Connect refresh payment account lookup failed", {
                user_id: user.id,
                artist_id: artist.id,
                error: accountError.message,
            });
            return noStoreJson({ error: "Could not load Stripe Connect account." }, { status: 400 });
        }
        if (!paymentAccount?.stripe_account_id) {
            return noStoreJson({ error: "Stripe account not connected" }, { status: 404 });
        }

        const account = await stripe.accounts.retrieve(paymentAccount.stripe_account_id);
        const snapshot = snapshotStripeAccount(account);

        const { error: updateError } = await serviceSupabase
            .from("artist_payment_accounts")
            .update(snapshot)
            .eq("artist_id", artist.id);

        if (updateError) {
            logger.error("Stripe Connect refresh payment account update failed", {
                user_id: user.id,
                artist_id: artist.id,
                stripe_account_id: paymentAccount.stripe_account_id,
                error: updateError.message,
            });
            return noStoreJson({ error: "Could not update Stripe Connect account." }, { status: 400 });
        }

        await recordPlatformEvent(
            {
                scope: "payouts",
                action: "stripe_connect_account_refreshed",
                severity: snapshot.onboarding_status === "restricted" ? "warning" : "info",
                actorUserId: user.id,
                artistId: artist.id,
                externalId: snapshot.stripe_account_id,
                message: "Artist Stripe Connect account state was refreshed.",
                metadata: {
                    onboarding_status: snapshot.onboarding_status,
                    charges_enabled: snapshot.charges_enabled,
                    payouts_enabled: snapshot.payouts_enabled,
                    details_submitted: snapshot.details_submitted,
                    disabled_reason: snapshot.disabled_reason,
                },
            },
            {
                supabase: serviceSupabase,
                failureLogMessage: "Stripe Connect refresh platform event failed",
                failureContext: {
                    actor_user_id: user.id,
                    artist_id: artist.id,
                    stripe_account_id: snapshot.stripe_account_id,
                },
                throwOnFailure: true,
                failurePublicMessage: "Could not audit Stripe Connect refresh.",
            }
        );

        return noStoreJson({ ok: true, account: snapshot });
    } catch (error) {
        logger.error("Stripe Connect refresh failed", {
            error: error instanceof Error ? error.message : "Unknown Stripe Connect error",
        });
        return noStoreJson({ error: "Could not refresh Stripe Connect account." }, { status: 500 });
    }
}
