import Image from "next/image";
import ArtistProductsGrid from "@/app/artists/[id]/ArtistProductsGrid";
import { publicImageUrl, publicStorageUrl } from "@/lib/storage";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";
import { publicCatalogProductQuery } from "@/lib/catalog/public-product-query";

export const revalidate = 60;

type ProductImageRow = {
    path?: string | null;
    sort_order?: number | null;
};

type ProductRow = {
    id: string;
    title?: string | null;
    price_cents?: number | null;
    slug?: string | null;
    created_at?: string | null;
    product_images?: ProductImageRow[] | null;
};

export default async function ArtistEmbedPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const supabase = getPublicServerSupabase();

    // 🔥 ARTIST
    const { data: artist } = await supabase
        .from("artists")
        .select("id, display_name, slug, hero_image_path, bio")
        .eq("slug", id)
        .single();

    if (!artist) {
        return <div style={{ padding: 20 }}>Artist not found</div>;
    }

    const heroUrl = publicStorageUrl("artist-images", artist.hero_image_path);

    // 🔥 PRODUCTS
    const { data: productData } = await publicCatalogProductQuery(supabase
        .from("products")
        .select(`
      id,
      title,
      price_cents,
      slug,
      created_at,
      product_images ( path, sort_order )
    `)
    )
        .eq("artist_id", artist.id)
        .order("created_at", { ascending: false });

    const products =
        ((productData ?? []) as ProductRow[]).map((p) => {
            const imgs = (p.product_images ?? []).sort(
                (a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999)
            );

            const primary =
                publicImageUrl(imgs[0]?.path) ??
                "/merch-placeholder.svg";

            return {
                id: String(p.id),
                title: p.title ?? "Untitled product",
                price: (p.price_cents ?? 0) / 100,
                image: primary,
                slug: p.slug ?? String(p.id),
                sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
                created_at: p.created_at ?? undefined,
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
                    <Image
                        src={heroUrl}
                        alt={`${artist.display_name ?? "Artist"} hero`}
                        fill
                        sizes="100vw"
                        style={{
                            position: "absolute",
                            inset: 0,
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
                    rel="noopener noreferrer"
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
