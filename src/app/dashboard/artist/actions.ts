// app/dashboard/artist/actions.ts
"use server";

import { logger } from "@/lib/logger";
import { requireArtistAction } from "@/lib/auth/artist";
import { normaliseExternalUrl } from "@/lib/urls";

type UpdateArtistPayload = {
    artistId: string;
    hero_image_path?: string | null;
    bio?: string | null;
    facebook_url?: string | null;
    instagram_url?: string | null;
    bandcamp_url?: string | null;
    spotify_url?: string | null;
    website_url?: string | null;
};

export async function updateArtistProfile(payload: UpdateArtistPayload) {
    let auth: Awaited<ReturnType<typeof requireArtistAction>>;

    try {
        auth = await requireArtistAction();
    } catch (error) {
        const message = error instanceof Error ? error.message : "Could not verify artist ownership.";
        return {
            error: message === "Sign in required." ? "Not signed in" : "Could not verify artist ownership.",
        };
    }

    const { supabase, user, artist } = auth;

    if (payload.artistId !== artist.id) {
        return { error: "Not allowed to edit this artist" };
    }

    // build update object – only include what we got
    const update: Partial<Omit<UpdateArtistPayload, "artistId">> = {};
    if (typeof payload.hero_image_path !== "undefined")
        update.hero_image_path = payload.hero_image_path;
    if (typeof payload.bio !== "undefined") update.bio = payload.bio;
    if (typeof payload.facebook_url !== "undefined")
        update.facebook_url = normaliseExternalUrl(payload.facebook_url);
    if (typeof payload.instagram_url !== "undefined")
        update.instagram_url = normaliseExternalUrl(payload.instagram_url);
    if (typeof payload.bandcamp_url !== "undefined")
        update.bandcamp_url = normaliseExternalUrl(payload.bandcamp_url);
    if (typeof payload.spotify_url !== "undefined")
        update.spotify_url = normaliseExternalUrl(payload.spotify_url);
    if (typeof payload.website_url !== "undefined")
        update.website_url = normaliseExternalUrl(payload.website_url);

    const { error: updateErr } = await supabase
        .from("artists")
        .update(update)
        .eq("id", artist.id)
        .eq("user_id", user.id);

    if (updateErr) {
        logger.error("artist profile update failed", {
            artist_id: payload.artistId,
            user_id: user.id,
            error: updateErr.message,
        });
        return { error: "Could not update artist profile." };
    }

    return { ok: true };
}
