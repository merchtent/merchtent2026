import { NextRequest } from "next/server";
import { z } from "zod";
import { noStoreJson } from "@/lib/api/no-store";
import { getServerSupabase } from "@/lib/supabase/server";

const querySchema = z.object({
    type: z.enum(["artist", "product"]),
    id: z.string().uuid(),
});

export async function GET(request: NextRequest) {
    const parsed = querySchema.safeParse({
        type: request.nextUrl.searchParams.get("type"),
        id: request.nextUrl.searchParams.get("id"),
    });

    if (!parsed.success) {
        return noStoreJson({ saved: false }, { status: 400 });
    }

    const supabase = getServerSupabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return noStoreJson({ saved: false });

    const table = parsed.data.type === "artist" ? "saved_artists" : "wishlisted_products";
    const idColumn = parsed.data.type === "artist" ? "artist_id" : "product_id";
    const { data } = await supabase
        .from(table)
        .select(idColumn)
        .eq("user_id", user.id)
        .eq(idColumn, parsed.data.id)
        .maybeSingle();

    return noStoreJson({ saved: Boolean(data) });
}
