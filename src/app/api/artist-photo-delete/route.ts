import { z } from "zod";
import { noStoreJson } from "@/lib/api/no-store";
import { rejectCrossOriginRequest } from "@/lib/auth/request-origin";
import { requireArtistAction } from "@/lib/auth/artist";
import { getErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    id: z.uuid(),
});

export async function POST(req: Request) {
    try {
        const originRejection = rejectCrossOriginRequest(req);
        if (originRejection) return originRejection;

        let auth: Awaited<ReturnType<typeof requireArtistAction>>;
        try {
            auth = await requireArtistAction();
        } catch {
            return noStoreJson({ error: "Artist account required." }, { status: 403 });
        }

        const body = schema.safeParse(await req.json());
        if (!body.success) {
            return noStoreJson({ error: "Invalid photo request." }, { status: 400 });
        }

        const { supabase, user, artist } = auth;
        const { data: photo, error: readErr } = await supabase
            .from("artist_photos")
            .select("id, artist_id, image_path")
            .eq("id", body.data.id)
            .eq("artist_id", artist.id)
            .maybeSingle();

        if (readErr) {
            logger.error("artist promo photo delete lookup failed", {
                user_id: user.id,
                artist_id: artist.id,
                photo_id: body.data.id,
                error: readErr.message,
            });
            return noStoreJson({ error: "Could not delete artist photo." }, { status: 500 });
        }

        if (!photo) {
            return noStoreJson({ error: "Photo not found." }, { status: 404 });
        }

        const { error: deleteErr } = await supabase
            .from("artist_photos")
            .delete()
            .eq("id", photo.id)
            .eq("artist_id", artist.id);

        if (deleteErr) {
            logger.error("artist promo photo delete failed", {
                user_id: user.id,
                artist_id: artist.id,
                photo_id: body.data.id,
                error: deleteErr.message,
            });
            return noStoreJson({ error: "Could not delete artist photo." }, { status: 500 });
        }

        await supabase.storage.from("artist-images").remove([photo.image_path]);

        return noStoreJson({ ok: true });
    } catch (err: unknown) {
        logger.error("artist promo photo delete route failed", {
            error: getErrorMessage(err, "Delete failed"),
        });
        return noStoreJson({ error: "Could not delete artist photo." }, { status: 500 });
    }
}
