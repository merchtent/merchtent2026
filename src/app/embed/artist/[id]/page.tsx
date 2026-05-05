import { createClient } from "@supabase/supabase-js";
import ArtistProductsGrid from "@/app/artists/[id]/ArtistProductsGrid";

export const revalidate = 60;

function artistImage(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artist-images/${path}`;
}

function productImage(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}

export default async function ArtistEmbedPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
    );

    // 🔥 ARTIST
    const { data: artist } = await supabase
        .from("artists")
        .select("id, display_name, slug, hero_image_path, bio")
        .eq("slug", id)
        .single();

    if (!artist) {
        return <div style={{ padding: 20 }}>Artist not found</div>;
    }

    const heroUrl = artistImage(artist.hero_image_path);

    // 🔥 PRODUCTS
    const { data: productData } = await supabase
        .from("products")
        .select(`
      id,
      title,
      price_cents,
      slug,
      created_at,
      product_images ( path, sort_order )
    `)
        .eq("artist_id", artist.id)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

    const products =
        (productData ?? []).map((p: any) => {
            const imgs = (p.product_images ?? []).sort(
                (a: any, b: any) => (a.sort_order ?? 999) - (b.sort_order ?? 999)
            );

            const primary =
                productImage(imgs[0]?.path) ??
                "https://picsum.photos/seed/fallback/900/1200";

            return {
                id: String(p.id),
                title: p.title,
                price: (p.price_cents ?? 0) / 100,
                image: primary,
                slug: p.slug,
                sizes: ["S", "M", "L", "XL"],
                created_at: p.created_at,
            };
        }) ?? [];

    return (
        <main
            style={{
                fontFamily: "system-ui, sans-serif",
                background: "#0a0a0a",
                color: "white",
                paddingBottom: 40,
            }}
        >
            {/* 🔥 HERO */}
            <section style={{ position: "relative", height: 320 }}>
                {heroUrl && (
                    <img
                        src={heroUrl}
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                        }}
                    />
                )}

                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(0,0,0,0.6)",
                    }}
                />

                <div
                    style={{
                        position: "relative",
                        zIndex: 2,
                        padding: 20,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                        height: "100%",
                    }}
                >
                    <h1 style={{ fontSize: 32, fontWeight: 900 }}>
                        {artist.display_name}
                    </h1>

                    <p style={{ opacity: 0.7, maxWidth: 500 }}>
                        {artist.bio || "Official merch. Limited runs."}
                    </p>
                </div>
            </section>

            {/* 🔥 PRODUCTS */}
            <section style={{ padding: 20 }}>
                <h2 style={{ marginBottom: 10 }}>Merch</h2>

                <ArtistProductsGrid products={products} />
            </section>

            {/* 🔥 CTA */}
            <section style={{ textAlign: "center", padding: 20 }}>
                <p style={{ opacity: 0.7 }}>
                    Every purchase supports {artist.display_name}
                </p>

                <a
                    href={`https://merchtent.com.au/artists/${artist.slug}`}
                    target="_blank"
                    style={{
                        display: "inline-block",
                        marginTop: 12,
                        background: "#e11d48",
                        padding: "10px 16px",
                        borderRadius: 8,
                        textDecoration: "none",
                        color: "white",
                        fontWeight: 600,
                    }}
                >
                    View Full Store →
                </a>
            </section>
        </main>
    );
}