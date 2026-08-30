import "server-only";
import { publicApiJson } from "@/lib/api/public-error";
import { mapCatalogProductCard, type CatalogProductRow } from "@/lib/catalog/product-card";
import { publicCatalogProductQuery } from "@/lib/catalog/public-product-query";
import { publicStorageUrl } from "@/lib/storage";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";

type ArtistRow = {
    id: string;
    display_name: string | null;
    slug: string | null;
    hero_image_path: string | null;
    bio: string | null;
};

type PhotoRow = {
    id: string;
    artist_id: string;
    image_path: string;
    caption: string | null;
};

type ProductRowWithArtist = CatalogProductRow & {
    artist_id?: string | null;
};

function isPlatformArtist(artist: ArtistRow) {
    const name = (artist.display_name ?? "").trim().toLowerCase();
    const slug = (artist.slug ?? "").trim().toLowerCase();

    return name === "merch tent" || slug === "merch-tent";
}

export async function GET() {
    const supabase = getPublicServerSupabase();

    const { data: artists } = await supabase
        .from("artists_public")
        .select("id, display_name, slug, hero_image_path, bio")
        .order("featured", { ascending: false })
        .order("display_name", { ascending: true })
        .limit(12);

    const artistRows = ((artists ?? []) as ArtistRow[])
        .filter((artist) => !isPlatformArtist(artist))
        .slice(0, 8);
    const artistIds = artistRows.map((artist) => artist.id);

    const { data: photoData } = artistIds.length
        ? await supabase
            .from("artist_photos")
            .select("id, artist_id, image_path, caption")
            .in("artist_id", artistIds)
            .eq("is_featured", true)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: false })
            .limit(32)
        : { data: [] };

    const { data: productData } = artistIds.length
        ? await publicCatalogProductQuery(supabase
            .from("products")
            .select(`
                id,
                artist_id,
                title,
                slug,
                price_cents,
                currency,
                is_published,
                product_images:product_images ( path, sort_order ),
                product_colors:product_colors ( hex, label, sort_order, front_image_path, back_image_path ),
                artist:artists ( display_name )
            `)
            .in("artist_id", artistIds)
        ).order("created_at", { ascending: false })
        : { data: [] };

    const photos = ((photoData ?? []) as PhotoRow[]).reduce<Record<string, Array<{ id: string; image: string; caption: string | null }>>>(
        (acc, photo) => {
            const image = publicStorageUrl("artist-images", photo.image_path);
            if (!image) return acc;
            acc[photo.artist_id] = acc[photo.artist_id] ?? [];
            acc[photo.artist_id].push({
                id: photo.id,
                image,
                caption: photo.caption,
            });
            return acc;
        },
        {}
    );

    const products = ((productData ?? []) as ProductRowWithArtist[]).reduce<Record<string, ReturnType<typeof mapCatalogProductCard>[]>>(
        (acc, product) => {
            if (!product.artist_id) return acc;
            acc[product.artist_id] = acc[product.artist_id] ?? [];
            if (acc[product.artist_id].length < 4) {
                acc[product.artist_id].push(mapCatalogProductCard(product));
            }
            return acc;
        },
        {}
    );

    const features = artistRows.map((artist) => {
        const artistName = artist.display_name ?? "Artist";
        const artistImage =
            publicStorageUrl("artist-images", artist.hero_image_path) ??
            "/merch-placeholder.svg";
        const artistPhotos = photos[artist.id]?.length
            ? photos[artist.id]
            : [
                {
                    id: `artist-image-${artist.id}`,
                    image: artistImage,
                    caption: `${artistName} artist image.`,
                },
            ];

        return {
            id: artist.id,
            name: artistName,
            slug: artist.slug ?? artist.id,
            bio: artist.bio,
            image: artistPhotos[0]?.image ?? artistImage,
            photos: artistPhotos,
            products: products[artist.id] ?? [],
        };
    });

    return publicApiJson({ features });
}
