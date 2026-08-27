// app/api/artist-hero-upload/route.ts
import { randomUUID } from "node:crypto";
import { noStoreJson } from "@/lib/api/no-store";
import { imageExtensionForMimeType, requestExceedsImageUploadLimit, validateImageBytes, validateImageFile } from "@/lib/uploads";
import { getErrorMessage } from "@/lib/errors";
import { rejectCrossOriginRequest } from "@/lib/auth/request-origin";
import { requireArtistAction } from "@/lib/auth/artist";
import { logger } from "@/lib/logger";
import { publicStorageUrl } from "@/lib/storage";
import { checkDurableRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HERO_UPLOAD_LIMIT = 20;
const HERO_UPLOAD_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
    try {
        const originRejection = rejectCrossOriginRequest(req);
        if (originRejection) return originRejection;

        if (requestExceedsImageUploadLimit(req)) {
            return noStoreJson(
                { error: "Image upload is too large." },
                { status: 413 }
            );
        }

        let auth: Awaited<ReturnType<typeof requireArtistAction>>;
        try {
            auth = await requireArtistAction();
        } catch {
            return noStoreJson(
                { error: "Artist account required." },
                { status: 403 }
            );
        }

        const { supabase, user, artist } = auth;

        const allowed = await checkDurableRateLimit(
            supabase,
            `artist_hero_upload:${user.id}`,
            HERO_UPLOAD_LIMIT,
            HERO_UPLOAD_WINDOW_MS,
            "check_public_rate_limit",
            { fallback: "deny" }
        );

        if (!allowed) {
            return noStoreJson(
                { error: "Too many uploads. Try again later." },
                { status: 429 }
            );
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        if (!file) {
            return noStoreJson({ error: "No file" }, { status: 400 });
        }

        try {
            validateImageFile(file);
            const arrayBuffer = await file.arrayBuffer();
            const contentType = validateImageBytes(arrayBuffer, file.type);

            const fileName = `hero-${randomUUID()}.${imageExtensionForMimeType(contentType)}`;
            const objectPath = `artist/${artist.id}/${fileName}`;
            const { error: uploadErr } = await supabase.storage
                .from("artist-images")
                .upload(objectPath, Buffer.from(arrayBuffer), {
                    contentType,
                    upsert: false,
                });

            if (uploadErr) {
                logger.error("artist hero upload storage write failed", {
                    user_id: user.id,
                    artist_id: artist.id,
                    error: uploadErr.message,
                });
                return noStoreJson({ error: "Could not upload artist hero image." }, { status: 500 });
            }

            return noStoreJson(
                {
                    path: objectPath,
                    publicUrl: publicStorageUrl("artist-images", objectPath),
                },
                { status: 200 }
            );
        } catch (validationError) {
            if (
                validationError instanceof Error &&
                (validationError.message.startsWith("Image ") ||
                    validationError.message.startsWith("Unsupported image "))
            ) {
                return noStoreJson({ error: validationError.message }, { status: 400 });
            }
            throw validationError;
        }
    } catch (err: unknown) {
        logger.error("artist hero upload failed", {
            error: getErrorMessage(err, "Upload failed"),
        });
        return noStoreJson(
            { error: "Could not upload artist hero image." },
            { status: 500 }
        );
    }
}
