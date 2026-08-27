export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { noStoreJson } from "@/lib/api/no-store";
import { logAdminContentEvent } from "@/lib/admin/content-audit";
import { requireAdmin } from "@/lib/auth/admin";
import { getErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { normaliseExternalUrl } from "@/lib/urls";

const artistUpdateSchema = z.object({
    display_name: z.string().trim().min(1).max(120),
    slug: z.string().trim().max(160).nullish(),
    bio: z.string().trim().max(5_000).nullish(),
    instagram_url: z.string().trim().max(500).nullish(),
    spotify_url: z.string().trim().max(500).nullish(),
    bandcamp_url: z.string().trim().max(500).nullish(),
    website_url: z.string().trim().max(500).nullish(),
});

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const auth = await requireAdmin(request);
        if (!auth.ok) return auth.response;

        const parsed = artistUpdateSchema.safeParse(await request.json().catch(() => ({})));

        if (!parsed.success) {
            return noStoreJson(
                {
                    success: false,
                    message: "Invalid artist details.",
                },
                {
                    status: 400,
                }
            );
        }

        const {
            display_name,
            slug,
            bio,
            instagram_url,
            spotify_url,
            bandcamp_url,
            website_url,
        } = parsed.data;

        const { data, error } = await auth.supabase
            .from("artists")
            .update({
                display_name,
                slug: slug || null,
                bio: bio || null,
                instagram_url: normaliseExternalUrl(instagram_url),
                spotify_url: normaliseExternalUrl(spotify_url),
                bandcamp_url: normaliseExternalUrl(bandcamp_url),
                website_url: normaliseExternalUrl(website_url),
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            logger.error("Admin artist update failed", {
                artist_id: id,
                actor_user_id: auth.user.id,
                error: error.message,
            });

            return noStoreJson(
                {
                    success: false,
                    message: "Could not update artist.",
                },
                {
                    status: 500,
                }
            );
        }

        await logAdminContentEvent({
            actorUserId: auth.user.id,
            action: "admin_artist_updated",
            artistId: id,
            message: "Admin updated artist profile content.",
            metadata: {
                display_name,
                slug: slug || null,
                has_bio: Boolean(bio),
                has_instagram_url: Boolean(normaliseExternalUrl(instagram_url)),
                has_spotify_url: Boolean(normaliseExternalUrl(spotify_url)),
                has_bandcamp_url: Boolean(normaliseExternalUrl(bandcamp_url)),
                has_website_url: Boolean(normaliseExternalUrl(website_url)),
            },
        });

        return noStoreJson({
            success: true,
            artist: data,
        });
    } catch (error: unknown) {
        logger.error("Unexpected admin artist update error", {
            error: getErrorMessage(error),
        });

        return noStoreJson(
            {
                success: false,
                message: "Could not update artist.",
            },
            {
                status: 500,
            }
        );
    }
}
