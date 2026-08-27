// app/api/admin/polaroids/route.ts

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

const polaroidCreateSchema = z.object({
    image_path: z.string().trim().min(1).max(1_000),
    caption: z.string().trim().max(1_000).nullish(),
    instagram_url: z.string().trim().max(500).nullish(),
});

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAdmin(request);
        if (!auth.ok) return auth.response;

        const parsed = polaroidCreateSchema.safeParse(await request.json().catch(() => ({})));

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

        const { data, error } = await auth.supabase
            .from("backstage_polaroids")
            .insert({
                image_path,
                caption: caption ?? "",
                instagram_url: normaliseExternalUrl(instagram_url),
            })
            .select()
            .single();

        if (error) {
            logger.error("Admin polaroid create failed", {
                actor_user_id: auth.user.id,
                error: error.message,
            });

            return noStoreJson(
                {
                    success: false,
                    message: "Could not create backstage polaroid.",
                },
                {
                    status: 500,
                }
            );
        }

        await logAdminContentEvent({
            actorUserId: auth.user.id,
            action: "admin_polaroid_created",
            externalId: data.id,
            message: "Admin created backstage polaroid.",
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
        logger.error("Unexpected admin polaroid create error", {
            error: getErrorMessage(error),
        });

        return noStoreJson(
            {
                success: false,
                message: "Could not create backstage polaroid.",
            },
            {
                status: 500,
            }
        );
    }
}
