// app/api/admin/tour-dates/[id]/route.ts

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

const tourDateUpdateSchema = z.object({
    artist: z.string().trim().min(1).max(160),
    venue: z.string().trim().min(1).max(200),
    city: z.string().trim().min(1).max(160),
    event_date: z.string().trim().min(1).max(80),
    ticket_url: z.string().trim().min(1).max(500),
});

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireAdmin(request);

        if (!auth.ok) {
            return auth.response;
        }

        const supabase = auth.supabase!;

        const { id } = await params;

        const parsed = tourDateUpdateSchema.safeParse(await request.json().catch(() => ({})));

        if (!parsed.success) {
            return noStoreJson(
                {
                    success: false,
                    message: "Invalid tour date details.",
                },
                {
                    status: 400,
                }
            );
        }

        const { artist, venue, city, event_date } = parsed.data;
        const ticket_url = normaliseExternalUrl(parsed.data.ticket_url);

        if (!ticket_url) {
            return noStoreJson(
                {
                    success: false,
                    message: "Valid Ticket URL is required",
                },
                {
                    status: 400,
                }
            );
        }

        const { data, error } = await supabase
            .from("tour_dates")
            .update({
                artist,
                venue,
                city,
                event_date,
                ticket_url,
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            logger.error("Admin tour date update failed", {
                tour_date_id: id,
                actor_user_id: auth.user.id,
                error: error.message,
            });

            return noStoreJson(
                {
                    success: false,
                    message: "Could not update tour date.",
                },
                {
                    status: 500,
                }
            );
        }

        await logAdminContentEvent({
            actorUserId: auth.user.id,
            action: "admin_tour_date_updated",
            externalId: id,
            message: "Admin updated tour date.",
            metadata: {
                artist,
                venue,
                city,
                event_date,
            },
        });

        return noStoreJson({
            success: true,
            tourDate: data,
        });
    } catch (error: unknown) {
        logger.error("Unexpected admin tour date update error", {
            error: getErrorMessage(error),
        });

        return noStoreJson(
            {
                success: false,
                message: "Could not update tour date.",
            },
            {
                status: 500,
            }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireAdmin(request);

        if (!auth.ok) {
            return auth.response;
        }

        const { id } = await params;

        const supabase = auth.supabase!;

        const { error } = await supabase
            .from("tour_dates")
            .delete()
            .eq("id", id);

        if (error) {
            logger.error("Admin tour date delete failed", {
                tour_date_id: id,
                actor_user_id: auth.user.id,
                error: error.message,
            });

            return noStoreJson(
                {
                    success: false,
                    message: "Could not delete tour date.",
                },
                {
                    status: 500,
                }
            );
        }

        await logAdminContentEvent({
            actorUserId: auth.user.id,
            action: "admin_tour_date_deleted",
            severity: "warning",
            externalId: id,
            message: "Admin deleted tour date.",
        });

        return noStoreJson({
            success: true,
        });
    } catch (error: unknown) {
        logger.error("Unexpected admin tour date delete error", {
            error: getErrorMessage(error),
        });

        return noStoreJson(
            {
                success: false,
                message: "Could not delete tour date.",
            },
            {
                status: 500,
            }
        );
    }
}
