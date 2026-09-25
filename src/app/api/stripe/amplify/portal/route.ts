export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { noStoreJson } from "@/lib/api/no-store";
import { requireLaunchedAmplifyConfig } from "@/lib/amplify/config";
import { requireArtistAction } from "@/lib/auth/artist";
import { rejectCrossOriginRequest } from "@/lib/auth/request-origin";
import { publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getServiceSupabase } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe/client";

export async function POST(request: Request) {
    const originRejection = rejectCrossOriginRequest(request);
    if (originRejection) return originRejection;

    try {
        requireLaunchedAmplifyConfig();
        const { artist } = await requireArtistAction();
        const { data, error } = await getServiceSupabase()
            .from("artist_subscriptions")
            .select("stripe_customer_id")
            .eq("artist_id", artist.id)
            .maybeSingle();
        if (error || !data?.stripe_customer_id) {
            return noStoreJson({ error: "No Amplify billing account was found." }, { status: 404 });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: data.stripe_customer_id,
            return_url: `${publicEnv.siteUrl()}/dashboard/amplify`,
        });
        return noStoreJson({ url: session.url });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Could not open billing.";
        logger.error("Amplify billing portal failed", { error: message });
        return noStoreJson(
            { error: message === "Merch Tent Amplify is not available yet." ? message : "Could not open billing." },
            { status: message === "Merch Tent Amplify is not available yet." ? 404 : 500 }
        );
    }
}
