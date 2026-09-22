"use server";

import { redirect } from "next/navigation";
import { logger } from "@/lib/logger";
import { getWritableServerSupabase } from "@/lib/supabase/server-action";

const ACCOUNT_TYPES = new Set(["fan", "artist"]);

function readString(formData: FormData, key: string) {
    return String(formData.get(key) || "").trim();
}

export async function completeAccountSetup(formData: FormData) {
    const supabase = getWritableServerSupabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Sign in required.");

    const accountType = readString(formData, "account_type");
    const displayName = readString(formData, "display_name").slice(0, 80);
    const artistName = readString(formData, "artist_name").slice(0, 60);
    const attributionRaw = readString(formData, "marketing_attribution").slice(0, 4000);
    let marketingAttribution: Record<string, unknown> = {};
    try {
        marketingAttribution = attributionRaw ? JSON.parse(attributionRaw) : {};
    } catch {
        marketingAttribution = {};
    }

    if (!ACCOUNT_TYPES.has(accountType)) {
        throw new Error("Choose fan or artist account.");
    }

    if (accountType === "artist" && artistName.length < 2) {
        throw new Error("Artist or band name is required.");
    }

    const { error } = await supabase.rpc("complete_account_onboarding", {
        p_account_type: accountType,
        p_display_name: displayName || artistName || user.email || null,
        p_artist_name: artistName || null,
    });

    if (error) {
        logger.error("account setup onboarding failed", {
            user_id: user.id,
            account_type: accountType,
            error: error.message,
        });
        throw new Error("Could not complete account setup.");
    }

    await supabase
        .from("profiles")
        .update({ marketing_attribution: marketingAttribution })
        .eq("id", user.id);

    await supabase.rpc("record_account_marketing_event", {
        p_event_name: accountType === "artist" ? "artist_activation" : "sign_up",
        p_attribution: marketingAttribution,
        p_properties: { account_type: accountType },
    });

    redirect("/dashboard");
}
