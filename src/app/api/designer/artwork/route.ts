import { randomUUID } from "node:crypto";
import { noStoreJson } from "@/lib/api/no-store";
import { requireArtistAction } from "@/lib/auth/artist";
import { rejectCrossOriginRequest } from "@/lib/auth/request-origin";
import { getErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { checkDurableRateLimit } from "@/lib/rate-limit";
import { getServiceSupabase } from "@/lib/supabase/service";
import {
    imageExtensionForMimeType,
    requestExceedsImageUploadLimit,
    validateImageBytes,
    validateImageFile,
} from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ARTWORK_UPLOAD_LIMIT = 60;
const ARTWORK_UPLOAD_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
    try {
        const originRejection = rejectCrossOriginRequest(request);
        if (originRejection) return originRejection;

        if (requestExceedsImageUploadLimit(request)) {
            return noStoreJson({ error: "Artwork must be 8MB or smaller." }, { status: 413 });
        }

        let auth: Awaited<ReturnType<typeof requireArtistAction>>;
        try {
            auth = await requireArtistAction();
        } catch {
            return noStoreJson({ error: "Artist account required." }, { status: 403 });
        }

        const service = getServiceSupabase();
        const allowed = await checkDurableRateLimit(
            service,
            `designer_artwork_upload:${auth.user.id}`,
            ARTWORK_UPLOAD_LIMIT,
            ARTWORK_UPLOAD_WINDOW_MS,
            "check_rate_limit",
            { fallback: "deny" }
        );
        if (!allowed) {
            return noStoreJson({ error: "Too many artwork uploads. Try again later." }, { status: 429 });
        }

        const formData = await request.formData();
        const file = formData.get("file");
        if (!(file instanceof File)) {
            return noStoreJson({ error: "Choose an artwork file." }, { status: 400 });
        }

        try {
            validateImageFile(file);
            const bytes = await file.arrayBuffer();
            const contentType = validateImageBytes(bytes, file.type);
            const path = `designer-assets/${auth.user.id}/${randomUUID()}.${imageExtensionForMimeType(contentType)}`;
            const { error } = await service.storage.from("product-images").upload(path, Buffer.from(bytes), {
                contentType,
                upsert: false,
                cacheControl: "31536000",
            });
            if (error) throw error;

            return noStoreJson({ path });
        } catch (error) {
            if (error instanceof Error && (
                error.message.startsWith("Image ") ||
                error.message.startsWith("Unsupported image ")
            )) {
                return noStoreJson({ error: error.message }, { status: 400 });
            }
            throw error;
        }
    } catch (error) {
        logger.error("designer artwork upload failed", {
            error: getErrorMessage(error, "Artwork upload failed"),
        });
        return noStoreJson({ error: "Could not upload artwork." }, { status: 500 });
    }
}
