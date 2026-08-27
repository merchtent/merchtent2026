export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { noStoreJson } from "@/lib/api/no-store";
import { rejectCrossOriginRequest } from "@/lib/auth/request-origin";
import { logger } from "@/lib/logger";
import { recordPlatformEvent } from "@/lib/platform-events";
import { checkDurableRateLimit } from "@/lib/rate-limit";
import { requireArtistAction } from "@/lib/auth/artist";
import { getServiceSupabase } from "@/lib/supabase/service";
import {
    createArtistOnboardingLink,
    createArtistStripeAccount,
    snapshotStripeAccount,
    type StripeConnectSnapshot,
} from "@/lib/stripe/connect";
import { stripe } from "@/lib/stripe/client";

const CONNECT_LINK_LIMIT = 10;
const CONNECT_LINK_WINDOW_MS = 60 * 60 * 1000;

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
            `stripe_connect:${user.id}:account_link`,
            CONNECT_LINK_LIMIT,
            CONNECT_LINK_WINDOW_MS,
            "check_public_rate_limit",
            { fallback: "deny" }
        );

        if (!allowed) {
            return noStoreJson({ error: "Too many Stripe Connect attempts. Try again later." }, { status: 429 });
        }

        const serviceSupabase = getServiceSupabase();
        const { data: existing, error: existingError } = await serviceSupabase
            .from("artist_payment_accounts")
            .select("stripe_account_id")
            .eq("artist_id", artist.id)
            .maybeSingle();

        if (existingError) {
            logger.error("Stripe Connect payment account lookup failed", {
                user_id: user.id,
                artist_id: artist.id,
                error: existingError.message,
            });
            return noStoreJson({ error: "Could not prepare Stripe Connect account." }, { status: 400 });
        }

        let accountId = existing?.stripe_account_id ?? null;
        if (!accountId) {
            const account = await createArtistStripeAccount(user.email);
            const snapshot = snapshotStripeAccount(account);

            const { error: insertError } = await serviceSupabase
                .from("artist_payment_accounts")
                .insert({
                    artist_id: artist.id,
                    ...snapshot,
                });

            if (insertError) {
                logger.error("Stripe Connect payment account insert failed", {
                    user_id: user.id,
                    artist_id: artist.id,
                    stripe_account_id: account.id,
                    error: insertError.message,
                });
                return noStoreJson({ error: "Could not save Stripe Connect account." }, { status: 400 });
            }

            accountId = account.id;
            await recordStripeConnectAuditEvent(serviceSupabase, {
                action: "stripe_connect_account_created",
                userId: user.id,
                artistId: artist.id,
                snapshot,
            });
        } else {
            const account = await stripe.accounts.retrieve(accountId);
            const snapshot = snapshotStripeAccount(account);

            const { error: updateError } = await serviceSupabase
                .from("artist_payment_accounts")
                .update(snapshot)
                .eq("artist_id", artist.id);

            if (updateError) {
                logger.error("Stripe Connect payment account update failed", {
                    user_id: user.id,
                    artist_id: artist.id,
                    stripe_account_id: accountId,
                    error: updateError.message,
                });
                return noStoreJson({ error: "Could not update Stripe Connect account." }, { status: 400 });
            }

            await recordStripeConnectAuditEvent(serviceSupabase, {
                action: "stripe_connect_account_synced",
                userId: user.id,
                artistId: artist.id,
                snapshot,
            });
        }

        const link = await createArtistOnboardingLink(accountId);
        await recordPlatformEvent(
            {
                scope: "payouts",
                action: "stripe_connect_onboarding_link_created",
                severity: "info",
                actorUserId: user.id,
                artistId: artist.id,
                externalId: accountId,
                message: "Artist Stripe Connect onboarding link was created.",
                metadata: {
                    source: "artist_dashboard",
                },
            },
            {
                supabase: serviceSupabase,
                failureLogMessage: "Stripe Connect onboarding link platform event failed",
                failureContext: {
                    actor_user_id: user.id,
                    artist_id: artist.id,
                    stripe_account_id: accountId,
                },
                throwOnFailure: true,
                failurePublicMessage: "Could not audit Stripe Connect onboarding.",
            }
        );
        return noStoreJson({ url: link.url });
    } catch (error) {
        logger.error("Stripe Connect account link failed", {
            error: error instanceof Error ? error.message : "Unknown Stripe Connect error",
        });
        return noStoreJson({ error: "Could not start Stripe Connect onboarding." }, { status: 500 });
    }
}

async function recordStripeConnectAuditEvent(
    supabase: ReturnType<typeof getServiceSupabase>,
    input: {
        action: "stripe_connect_account_created" | "stripe_connect_account_synced";
        userId: string;
        artistId: string;
        snapshot: StripeConnectSnapshot;
    }
) {
    await recordPlatformEvent(
        {
            scope: "payouts",
            action: input.action,
            severity: input.snapshot.onboarding_status === "restricted" ? "warning" : "info",
            actorUserId: input.userId,
            artistId: input.artistId,
            externalId: input.snapshot.stripe_account_id,
            message: "Artist Stripe Connect account state changed.",
            metadata: {
                onboarding_status: input.snapshot.onboarding_status,
                charges_enabled: input.snapshot.charges_enabled,
                payouts_enabled: input.snapshot.payouts_enabled,
                details_submitted: input.snapshot.details_submitted,
                disabled_reason: input.snapshot.disabled_reason,
            },
        },
        {
            supabase,
            failureLogMessage: "Stripe Connect account platform event failed",
            failureContext: {
                actor_user_id: input.userId,
                artist_id: input.artistId,
                stripe_account_id: input.snapshot.stripe_account_id,
                action: input.action,
            },
            throwOnFailure: true,
            failurePublicMessage: "Could not audit Stripe Connect account state.",
        }
    );
}
