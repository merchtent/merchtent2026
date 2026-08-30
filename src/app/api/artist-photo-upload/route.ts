import { randomUUID } from "node:crypto";
import { noStoreJson } from "@/lib/api/no-store";
import { rejectCrossOriginRequest } from "@/lib/auth/request-origin";
import { requireArtistAction } from "@/lib/auth/artist";
import { checkDurableRateLimit } from "@/lib/rate-limit";
import { getErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { publicStorageUrl } from "@/lib/storage";
import { imageExtensionForMimeType, requestExceedsImageUploadLimit, validateImageBytes, validateImageFile } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHOTO_UPLOAD_LIMIT = 30;
const PHOTO_UPLOAD_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
    try {
        const originRejection = rejectCrossOriginRequest(req);
        if (originRejection) return originRejection;

        if (requestExceedsImageUploadLimit(req)) {
            return noStoreJson({ error: "Image upload is too large." }, { status: 413 });
        }

        let auth: Awaited<ReturnType<typeof requireArtistAction>>;
        try {
            auth = await requireArtistAction();
        } catch {
            return noStoreJson({ error: "Artist account required." }, { status: 403 });
        }

        const { supabase, user, artist } = auth;
        const allowed = await checkDurableRateLimit(
            supabase,
            `artist_hero_upload:${user.id}`,
            PHOTO_UPLOAD_LIMIT,
            PHOTO_UPLOAD_WINDOW_MS,
            "check_public_rate_limit",
            { fallback: "deny" }
        );

        if (!allowed) {
            return noStoreJson({ error: "Too many uploads. Try again later." }, { status: 429 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const caption = String(formData.get("caption") ?? "").trim().slice(0, 220);
        if (!file) {
            return noStoreJson({ error: "No file selected." }, { status: 400 });
        }

        try {
            validateImageFile(file);
            const arrayBuffer = await file.arrayBuffer();
            const contentType = validateImageBytes(arrayBuffer, file.type);
            const fileName = `photo-${randomUUID()}.${imageExtensionForMimeType(contentType)}`;
            const objectPath = `artist/${artist.id}/photos/${fileName}`;

            const { error: uploadErr } = await supabase.storage
                .from("artist-images")
                .upload(objectPath, Buffer.from(arrayBuffer), {
                    contentType,
                    upsert: false,
                });

            if (uploadErr) {
                logger.error("artist promo photo storage write failed", {
                    user_id: user.id,
                    artist_id: artist.id,
                    error: uploadErr.message,
                });
                return noStoreJson({ error: "Could not upload artist photo." }, { status: 500 });
            }

            const { data, error: insertErr } = await supabase
                .from("artist_photos")
                .insert({
                    artist_id: artist.id,
                    image_path: objectPath,
                    caption: caption || null,
                    is_featured: true,
                })
                .select("id, image_path, caption, sort_order, is_featured")
                .single();

            if (insertErr) {
                logger.error("artist promo photo insert failed", {
                    user_id: user.id,
                    artist_id: artist.id,
                    error: insertErr.message,
                });
                await supabase.storage.from("artist-images").remove([objectPath]);
                return noStoreJson({ error: "Could not save artist photo." }, { status: 500 });
            }

            return noStoreJson({
                photo: {
                    ...data,
                    publicUrl: publicStorageUrl("artist-images", objectPath),
                },
            });
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
        logger.error("artist promo photo upload failed", {
            error: getErrorMessage(err, "Upload failed"),
        });
        return noStoreJson({ error: "Could not upload artist photo." }, { status: 500 });
    }
}
