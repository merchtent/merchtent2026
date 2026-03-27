import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);

    const artistId = searchParams.get("artist_id");
    const productId = searchParams.get("product_id");

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 🔥 base query
    let query = supabase
        .from("fan_shouts")
        .select(`
            id,
            name,
            text,
            rating,
            artist:artists (
                display_name,
                hero_image_path
            ),
            product:products (
                slug,
                title,
                product_images ( path, sort_order )
            )
        `)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(6);

    // 🔥 filtering
    if (productId) {
        query = query.eq("product_id", productId);
    } else if (artistId) {
        query = query.eq("artist_id", artistId);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ shouts: [], avgRating: null });
    }

    // 🔥 calculate average
    const ratings = (data ?? []).map((r: any) => r.rating ?? 5);

    const avg =
        ratings.length > 0
            ? ratings.reduce((a, b) => a + b, 0) / ratings.length
            : null;

    return NextResponse.json({
        shouts: data ?? [],
        avgRating: avg,
        count: ratings.length,
    });
}