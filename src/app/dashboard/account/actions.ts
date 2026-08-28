"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { recordPlatformEvent } from "@/lib/platform-events";
import { getWritableServerSupabase } from "@/lib/supabase/server-action";

const displayNameSchema = z.object({
    displayName: z.string().trim().min(2, "Display name must be at least 2 characters.").max(80, "Display name is too long."),
});

const closeAccountSchema = z.object({
    confirmation: z.string().trim(),
    reason: z.string().trim().max(1000, "Reason is too long.").optional(),
});

const artistUpgradeSchema = z.object({
    artistName: z.string().trim().min(2, "Artist or band name is required.").max(60, "Artist or band name is too long."),
});

export type AccountActionState = {
    ok?: boolean;
    error?: string;
};

async function requireUser() {
    const supabase = getWritableServerSupabase();
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        return { supabase, user: null };
    }

    return { supabase, user };
}

export async function updateDisplayName(_prevState: AccountActionState, formData: FormData): Promise<AccountActionState> {
    const { supabase, user } = await requireUser();
    if (!user) return { error: "Please sign in again before changing account details." };

    const parsed = displayNameSchema.safeParse({
        displayName: formData.get("displayName"),
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Check the display name and try again." };
    }

    const { error } = await supabase
        .from("profiles")
        .update({ display_name: parsed.data.displayName })
        .eq("id", user.id);

    if (error) {
        logger.error("Account display name update failed", {
            user_id: user.id,
            error: error.message,
        });
        return { error: "Could not update display name." };
    }

    await recordPlatformEvent(
        {
            scope: "account",
            action: "profile_display_name_updated",
            actorUserId: user.id,
            message: "User updated their account display name.",
        },
        {
            failureLogMessage: "Account display name audit failed",
            failureContext: { actor_user_id: user.id },
        }
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/account");
    return { ok: true };
}

export async function requestAccountClosure(_prevState: AccountActionState, formData: FormData): Promise<AccountActionState> {
    const { user } = await requireUser();
    if (!user) return { error: "Please sign in again before requesting account closure." };

    const parsed = closeAccountSchema.safeParse({
        confirmation: formData.get("confirmation"),
        reason: formData.get("reason") || undefined,
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Check the closure request and try again." };
    }

    if (parsed.data.confirmation !== "CLOSE ACCOUNT") {
        return { error: "Type CLOSE ACCOUNT to confirm this request." };
    }

    const audit = await recordPlatformEvent(
        {
            scope: "account",
            action: "account_closure_requested",
            severity: "warning",
            actorUserId: user.id,
            message: "User requested account closure from dashboard.",
            metadata: {
                reason: parsed.data.reason ?? null,
            },
        },
        {
            failureLogMessage: "Account closure request audit failed",
            failureContext: { actor_user_id: user.id },
        }
    );

    if (!audit.ok) {
        return { error: "Could not record the closure request. Please contact support." };
    }

    return { ok: true };
}

export async function upgradeToArtistAccount(_prevState: AccountActionState, formData: FormData): Promise<AccountActionState> {
    const { supabase, user } = await requireUser();
    if (!user) return { error: "Please sign in again before switching account type." };

    const parsed = artistUpgradeSchema.safeParse({
        artistName: formData.get("artistName"),
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Enter your artist or band name." };
    }

    const { error } = await supabase.rpc("upgrade_account_to_artist", {
        p_artist_name: parsed.data.artistName,
    });

    if (error) {
        logger.error("Account artist upgrade failed", {
            user_id: user.id,
            error: error.message,
        });
        return { error: "Could not switch this account to artist mode." };
    }

    await recordPlatformEvent(
        {
            scope: "account",
            action: "account_upgraded_to_artist",
            actorUserId: user.id,
            message: "User switched their account from fan to artist.",
            metadata: {
                artist_name: parsed.data.artistName,
            },
        },
        {
            failureLogMessage: "Account artist upgrade audit failed",
            failureContext: { actor_user_id: user.id },
        }
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/account");
    revalidatePath("/dashboard/artist");
    return { ok: true };
}
