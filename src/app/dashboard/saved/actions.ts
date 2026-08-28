"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { recordPlatformEvent } from "@/lib/platform-events";
import { getWritableServerSupabase } from "@/lib/supabase/server-action";

export type SavedActionState = {
    ok?: boolean;
    saved?: boolean;
    error?: string;
};

const idSchema = z.string().uuid();

const addressSchema = z.object({
    id: z.string().uuid().optional(),
    label: z.string().trim().min(1).max(80).default("Default"),
    first_name: z.string().trim().min(1, "First name is required.").max(80),
    last_name: z.string().trim().min(1, "Last name is required.").max(80),
    line1: z.string().trim().min(3, "Address line 1 is required.").max(160),
    line2: z.string().trim().max(160).optional(),
    city: z.string().trim().min(1, "City or suburb is required.").max(100),
    state: z.string().trim().min(1, "State is required.").max(100),
    postal_code: z.string().trim().min(2, "Postcode is required.").max(20),
    country: z.string().trim().length(2, "Use a 2-letter country code.").transform((value) => value.toUpperCase()),
    phone: z.string().trim().max(40).optional(),
});

async function requireUser() {
    const supabase = getWritableServerSupabase();
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) return { supabase, user: null };
    return { supabase, user };
}

export async function toggleSavedArtist(artistId: string): Promise<SavedActionState> {
    const parsed = idSchema.safeParse(artistId);
    if (!parsed.success) return { error: "Artist could not be saved." };

    const { supabase, user } = await requireUser();
    if (!user) return { error: "Sign in to save artists." };

    const { data: existing, error: existingError } = await supabase
        .from("saved_artists")
        .select("artist_id")
        .eq("user_id", user.id)
        .eq("artist_id", parsed.data)
        .maybeSingle();

    if (existingError) {
        logger.error("Saved artist lookup failed", {
            user_id: user.id,
            artist_id: parsed.data,
            error: existingError.message,
        });
        return { error: "Could not update saved artists." };
    }

    if (existing) {
        const { error } = await supabase
            .from("saved_artists")
            .delete()
            .eq("user_id", user.id)
            .eq("artist_id", parsed.data);

        if (error) {
            logger.error("Saved artist delete failed", {
                user_id: user.id,
                artist_id: parsed.data,
                error: error.message,
            });
            return { error: "Could not remove saved artist." };
        }
    } else {
        const { error } = await supabase
            .from("saved_artists")
            .insert({ user_id: user.id, artist_id: parsed.data });

        if (error) {
            logger.error("Saved artist insert failed", {
                user_id: user.id,
                artist_id: parsed.data,
                error: error.message,
            });
            return { error: "Could not save artist." };
        }
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/saved");
    return { ok: true, saved: !existing };
}

export async function toggleWishlistedProduct(productId: string): Promise<SavedActionState> {
    const parsed = idSchema.safeParse(productId);
    if (!parsed.success) return { error: "Product could not be saved." };

    const { supabase, user } = await requireUser();
    if (!user) return { error: "Sign in to add products to your wishlist." };

    const { data: existing, error: existingError } = await supabase
        .from("wishlisted_products")
        .select("product_id")
        .eq("user_id", user.id)
        .eq("product_id", parsed.data)
        .maybeSingle();

    if (existingError) {
        logger.error("Wishlist lookup failed", {
            user_id: user.id,
            product_id: parsed.data,
            error: existingError.message,
        });
        return { error: "Could not update wishlist." };
    }

    if (existing) {
        const { error } = await supabase
            .from("wishlisted_products")
            .delete()
            .eq("user_id", user.id)
            .eq("product_id", parsed.data);

        if (error) {
            logger.error("Wishlist delete failed", {
                user_id: user.id,
                product_id: parsed.data,
                error: error.message,
            });
            return { error: "Could not remove wishlist item." };
        }
    } else {
        const { error } = await supabase
            .from("wishlisted_products")
            .insert({ user_id: user.id, product_id: parsed.data });

        if (error) {
            logger.error("Wishlist insert failed", {
                user_id: user.id,
                product_id: parsed.data,
                error: error.message,
            });
            return { error: "Could not add to wishlist." };
        }
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/saved");
    return { ok: true, saved: !existing };
}

export async function saveDefaultAddress(_prevState: SavedActionState, formData: FormData): Promise<SavedActionState> {
    const { supabase, user } = await requireUser();
    if (!user) return { error: "Sign in to save your delivery address." };

    const parsed = addressSchema.safeParse({
        id: formData.get("id") || undefined,
        label: formData.get("label") || "Default",
        first_name: formData.get("first_name"),
        last_name: formData.get("last_name"),
        line1: formData.get("line1"),
        line2: formData.get("line2") || undefined,
        city: formData.get("city"),
        state: formData.get("state"),
        postal_code: formData.get("postal_code"),
        country: formData.get("country") || "AU",
        phone: formData.get("phone") || undefined,
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Check your address and try again." };
    }

    const { id: _id, ...addressFields } = parsed.data;
    void _id;

    const cleanAddress = {
        ...addressFields,
        line2: parsed.data.line2 || null,
        phone: parsed.data.phone || null,
        user_id: user.id,
        is_default: true,
        updated_at: new Date().toISOString(),
    };

    const existingAddress = parsed.data.id
        ? { id: parsed.data.id }
        : (
            await supabase
                .from("customer_addresses")
                .select("id")
                .eq("user_id", user.id)
                .eq("is_default", true)
                .maybeSingle()
        ).data;

    const { error } = existingAddress?.id
        ? await supabase
            .from("customer_addresses")
            .update(cleanAddress)
            .eq("id", existingAddress.id)
            .eq("user_id", user.id)
        : await supabase
            .from("customer_addresses")
            .insert(cleanAddress);

    if (error) {
        logger.error("Customer default address save failed", {
            user_id: user.id,
            error: error.message,
        });
        return { error: "Could not save your delivery address." };
    }

    await recordPlatformEvent(
        {
            scope: "account",
            action: "default_shipping_address_saved",
            actorUserId: user.id,
            message: "Customer saved a default shipping address.",
        },
        {
            failureLogMessage: "Default address save audit failed",
            failureContext: { actor_user_id: user.id },
        }
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/saved");
    revalidatePath("/checkout");
    return { ok: true, saved: true };
}
