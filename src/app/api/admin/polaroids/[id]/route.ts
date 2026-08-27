// app/api/admin/polaroids/[id]/route.ts

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

const polaroidUpdateSchema = z.object({
    image_path: z.string().trim().min(1).max(1_000),
    caption: z.string().trim().max(1_000).nullish(),
    instagram_url: z.string().trim().max(500).nullish(),
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

        const parsed = polaroidUpdateSchema.safeParse(await request.json().catch(() => ({})));

        if (!parsed.success) {
            return noStoreJson(
                {
                    success: false,
                    message: "Invalid backstage polaroid details.",
                },
                {
                    status: 400,
                }
            );
        }

        const { image_path, caption, instagram_url } = parsed.data;

        const { data, error } = await supabase
            .from("backstage_polaroids")
            .update({
                image_path,
                caption: caption ?? "",
                instagram_url: normaliseExternalUrl(instagram_url),
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            logger.error("Admin polaroid update failed", {
                polaroid_id: id,
                actor_user_id: auth.user.id,
                error: error.message,
            });

            return noStoreJson(
                {
                    success: false,
                    message: "Could not update backstage polaroid.",
                },
                {
                    status: 500,
                }
            );
        }

        await logAdminContentEvent({
            actorUserId: auth.user.id,
            action: "admin_polaroid_updated",
            externalId: id,
            message: "Admin updated backstage polaroid.",
            metadata: {
                has_caption: Boolean(caption),
                has_instagram_url: Boolean(normaliseExternalUrl(instagram_url)),
            },
        });

        return noStoreJson({
            success: true,
            polaroid: data,
        });
    } catch (error: unknown) {
        logger.error("Unexpected admin polaroid update error", {
            error: getErrorMessage(error),
        });

        return noStoreJson(
            {
                success: false,
                message: "Could not update backstage polaroid.",
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

        const supabase = auth.supabase!;
        const { id } = await params;

        const { error } = await supabase
            .from("backstage_polaroids")
            .delete()
            .eq("id", id);

        if (error) {
            logger.error("Admin polaroid delete failed", {
                polaroid_id: id,
                actor_user_id: auth.user.id,
                error: error.message,
            });

            return noStoreJson(
                {
                    success: false,
                    message: "Could not delete backstage polaroid.",
                },
                {
                    status: 500,
                }
            );
        }

        await logAdminContentEvent({
            actorUserId: auth.user.id,
            action: "admin_polaroid_deleted",
            severity: "warning",
            externalId: id,
            message: "Admin deleted backstage polaroid.",
        });

        return noStoreJson({
            success: true,
        });
    } catch (error: unknown) {
        logger.error("Unexpected admin polaroid delete error", {
            error: getErrorMessage(error),
        });

        return noStoreJson(
            {
                success: false,
                message: "Could not delete backstage polaroid.",
            },
            {
                status: 500,
            }
        );
    }
}
