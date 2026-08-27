export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { noStoreJson } from "@/lib/api/no-store";
import { logAdminContentEvent } from "@/lib/admin/content-audit";
import { requireAdmin } from "@/lib/auth/admin";
import { getErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const auth = await requireAdmin(request);
        if (!auth.ok) return auth.response;

        const { data: artist, error: findError } = await auth.supabase
            .from("artists")
            .select("id, featured")
            .eq("id", id)
            .single();

        if (findError || !artist) {
            return noStoreJson(
                { success: false, message: "Artist not found" },
                { status: 404 }
            );
        }

        const { data, error } = await auth.supabase
            .from("artists")
            .update({
                featured: !artist.featured,
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            logger.error("Admin artist featured toggle failed", {
                artist_id: id,
                actor_user_id: auth.user.id,
                error: error.message,
            });

            return noStoreJson(
                { success: false, message: "Could not update artist." },
                { status: 500 }
            );
        }

        await logAdminContentEvent({
            actorUserId: auth.user.id,
            action: "admin_artist_featured_toggled",
            artistId: id,
            message: "Admin toggled artist featured status.",
            metadata: {
                previous_featured: artist.featured,
                featured: data.featured,
            },
        });

        return noStoreJson({
            success: true,
            artist: data,
        });
    } catch (error: unknown) {
        logger.error("Unexpected admin artist featured toggle error", {
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
