// app/api/artist-hero-upload/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // make sure we can use FormData buffers

export async function POST(req: Request) {
    try {
        // 1. check auth (from cookies)
        const supaFromCookie = getServerSupabase();
        const {
            data: { user },
        } = await supaFromCookie.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Not signed in" }, { status: 401 });
        }

        // 2. get artist for this user
        const { data: artist, error: artistErr } = await supaFromCookie
            .from("artists")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (artistErr) {
            return NextResponse.json(
                { error: artistErr.message },
                { status: 500 }
            );
        }
        if (!artist) {
            return NextResponse.json(
                { error: "No artist profile for this user" },
                { status: 400 }
            );
        }

        // 3. parse form data
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        if (!file) {
            return NextResponse.json({ error: "No file" }, { status: 400 });
        }

        // 4. make a server-side supabase client with service key
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !serviceKey) {
            return NextResponse.json(
                { error: "Supabase env vars missing" },
                { status: 500 }
            );
        }

        const supabaseSrv = createClient(url, serviceKey, {
            auth: { persistSession: false },
        });

        // 5. build a path — you can tweak this
        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `hero-${Date.now()}.${ext}`;
        const objectPath = `artist/${artist.id}/${fileName}`; // 👈 stored path

        // 6. upload
        const arrayBuffer = await file.arrayBuffer();
        const { error: uploadErr } = await supabaseSrv.storage
            .from("artist-images") // 👈 bucket name
            .upload(objectPath, Buffer.from(arrayBuffer), {
                contentType: file.type || "image/jpeg",
                upsert: true,
            });

        if (uploadErr) {
            return NextResponse.json({ error: uploadErr.message }, { status: 500 });
        }

        // 7. return the path (not public url)
        return NextResponse.json(
            {
                path: objectPath,
                publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artist-images/${encodeURIComponent(
                    objectPath
                )}`,
            },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("upload error", err);
        return NextResponse.json(
            { error: err?.message ?? "Upload failed" },
            { status: 500 }
        );
    }
}
