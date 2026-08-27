import "server-only";

import { redirect } from "next/navigation";
import { logger } from "@/lib/logger";
import { getServerSupabase } from "@/lib/supabase/server";

export async function requireArtistPage() {
    const supabase = getServerSupabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/sign-in");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("account_type, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

    if (!profile?.account_type || !profile.onboarding_completed) {
        redirect("/account/setup");
    }

    if (profile.account_type !== "artist") {
        redirect("/dashboard");
    }

    const { data: artist } = await supabase
        .from("artists")
        .select("id, display_name")
        .eq("user_id", user.id)
        .maybeSingle();

    if (!artist) {
        redirect("/account/setup");
    }

    return {
        supabase,
        user,
        profile,
        artist,
    };
}

export async function requireArtistAction() {
    const supabase = getServerSupabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Sign in required.");
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("account_type, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
        logger.error("artist action profile lookup failed", {
            user_id: user.id,
            error: profileError.message,
        });
        throw new Error("Could not verify artist profile.");
    }

    if (!profile?.onboarding_completed || profile.account_type !== "artist") {
        throw new Error("Artist account required.");
    }

    const { data: artist, error: artistError } = await supabase
        .from("artists")
        .select("id, display_name")
        .eq("user_id", user.id)
        .maybeSingle();

    if (artistError) {
        logger.error("artist action artist lookup failed", {
            user_id: user.id,
            error: artistError.message,
        });
        throw new Error("Could not verify artist profile.");
    }

    if (!artist) {
        throw new Error("Artist profile not found.");
    }

    return {
        supabase,
        user,
        profile,
        artist,
    };
}
