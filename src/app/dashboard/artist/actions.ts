// app/dashboard/artist/actions.ts
"use server";

import { getServerSupabase } from "@/lib/supabase/server";

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
    const supabase = getServerSupabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Not signed in" };
    }

    // make sure the artist is owned by this user
    const { data: artist, error: fetchErr } = await supabase
        .from("artists")
        .select("id, user_id")
        .eq("id", payload.artistId)
        .maybeSingle();

    if (fetchErr) {
        return { error: fetchErr.message };
    }
    if (!artist) {
        return { error: "Artist not found" };
    }
    if (artist.user_id !== user.id) {
        return { error: "Not allowed to edit this artist" };
    }

    // build update object – only include what we got
    const update: Record<string, any> = {};
    if (typeof payload.hero_image_path !== "undefined")
        update.hero_image_path = payload.hero_image_path;
    if (typeof payload.bio !== "undefined") update.bio = payload.bio;
    if (typeof payload.facebook_url !== "undefined")
        update.facebook_url = payload.facebook_url;
    if (typeof payload.instagram_url !== "undefined")
        update.instagram_url = payload.instagram_url;
    if (typeof payload.bandcamp_url !== "undefined")
        update.bandcamp_url = payload.bandcamp_url;
    if (typeof payload.spotify_url !== "undefined")
        update.spotify_url = payload.spotify_url;
    if (typeof payload.website_url !== "undefined")
        update.website_url = payload.website_url;

    const { error: updateErr } = await supabase
        .from("artists")
        .update(update)
        .eq("id", payload.artistId);

    if (updateErr) {
        return { error: updateErr.message };
    }

    return { ok: true };
}
