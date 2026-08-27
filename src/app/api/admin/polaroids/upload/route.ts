import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { noStoreJson } from "@/lib/api/no-store";
import { requireAdmin } from "@/lib/auth/admin";
import { getServiceSupabase } from "@/lib/supabase/service";
import { imageExtensionForMimeType, requestExceedsImageUploadLimit, validateImageBytes, validateImageFile } from "@/lib/uploads";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAdmin(request);
        if (!auth.ok) return auth.response;

        if (requestExceedsImageUploadLimit(request)) {
            return noStoreJson(
                { success: false, message: "Image upload is too large." },
                { status: 413 }
            );
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return noStoreJson(
                { success: false, message: "No file uploaded" },
                { status: 400 }
            );
        }

        try {
            validateImageFile(file);
            const bytes = await file.arrayBuffer();
            const contentType = validateImageBytes(bytes, file.type);
            const path = `polaroids/${randomUUID()}.${imageExtensionForMimeType(contentType)}`;

            const serviceSupabase = getServiceSupabase();
            const { error } = await serviceSupabase
                .storage
                .from("backstage-polaroids")
                .upload(path, Buffer.from(bytes), {
                    contentType,
                    upsert: false,
                });

            if (error) {
                logger.error("admin polaroid upload storage write failed", {
                    admin_user_id: auth.user.id,
                    path,
                    error: error.message,
                });
                return noStoreJson(
                    { success: false, message: "Could not upload backstage polaroid." },
                    { status: 500 }
                );
            }

            const { data } = serviceSupabase
                .storage
                .from("backstage-polaroids")
                .getPublicUrl(path);

            return noStoreJson({
                success: true,
                path,
                publicUrl: data.publicUrl,
            });
        } catch (validationError) {
            if (
                !(validationError instanceof Error) ||
                (!validationError.message.startsWith("Image ") &&
                    !validationError.message.startsWith("Unsupported image "))
            ) {
                throw validationError;
            }

            return noStoreJson(
                {
                    success: false,
                    message: validationError.message,
                },
                { status: 400 }
            );
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Upload failed";
        logger.error("admin polaroid upload failed", {
            error: message,
        });

        return noStoreJson(
            {
                success: false,
                message: "Could not upload backstage polaroid.",
            },
            { status: 500 }
        );
    }
}
