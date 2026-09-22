import { publicCatalogProductQuery } from "@/lib/catalog/public-product-query";
import { publicEnv } from "@/lib/env";
import { publicImageUrl } from "@/lib/storage";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";
import { SHIPPING_METHOD_OPTIONS } from "@/lib/shipping-methods";

export const revalidate = 3600;

type FeedArtist = {
    display_name?: string | null;
};

type FeedProduct = {
    id: string;
    slug?: string | null;
    title?: string | null;
    description?: string | null;
    price_cents?: number | null;
    currency?: string | null;
    category?: string | null;
    product_images?: Array<{
        path?: string | null;
        sort_order?: number | null;
    }> | null;
    product_colors?: Array<{ label?: string | null; sort_order?: number | null }> | null;
    artist?: FeedArtist | FeedArtist[] | null;
};

function xml(value: unknown) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function text(value: string | null | undefined) {
    return (value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function googleCategory(category: string | null | undefined) {
    const value = (category ?? "").toLowerCase();
    if (value.includes("hood")) return "Apparel & Accessories > Clothing > Outerwear";
    if (value.includes("tee") || value.includes("tank")) return "Apparel & Accessories > Clothing > Shirts & Tops";
    if (value.includes("hat")) return "Apparel & Accessories > Clothing Accessories > Hats";
    if (value.includes("bag")) return "Apparel & Accessories > Handbags, Wallets & Cases > Handbags";
    if (value.includes("poster")) return "Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork";
    if (value.includes("vinyl")) return "Media > Music & Sound Recordings > Records & LPs";
    return "Arts & Entertainment > Hobbies & Creative Arts > Musical Instrument Accessories";
}

export async function GET() {
    const supabase = getPublicServerSupabase();
    const { data, error } = await publicCatalogProductQuery(supabase
        .from("products")
        .select(`
            id,
            slug,
            title,
            description,
            price_cents,
            currency,
            category,
            created_at,
            product_images ( path, sort_order ),
            product_colors ( label, sort_order ),
            artist:artists ( display_name )
        `)
    )
        .order("created_at", { ascending: false })
        .limit(5000);

    if (error) {
        return new Response("Catalogue feed is temporarily unavailable.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
    }

    const siteUrl = publicEnv.siteUrl();
    const standardShipping = SHIPPING_METHOD_OPTIONS.find((method) => method.id === "standard")
        ?? SHIPPING_METHOD_OPTIONS[0];
    const items = ((data ?? []) as FeedProduct[])
        .map((product) => {
            const primaryImagePath = [...(product.product_images ?? [])]
                .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))[0]?.path;
            const image = publicImageUrl(primaryImagePath);
            const additionalImages = [...(product.product_images ?? [])]
                .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
                .slice(1, 11)
                .map((item) => publicImageUrl(item.path))
                .filter((item): item is string => Boolean(item));
            const colors = [...(product.product_colors ?? [])]
                .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
                .map((item) => text(item.label))
                .filter(Boolean);
            const title = text(product.title);
            if (!image || !title || !product.price_cents) return null;

            const artist = Array.isArray(product.artist) ? product.artist[0] : product.artist;
            const artistName = text(artist?.display_name) || "Merch Tent";
            const suppliedDescription = text(product.description);
            const description = suppliedDescription.length >= 80
                ? suppliedDescription
                : `${suppliedDescription ? `${suppliedDescription}. ` : ""}Official made-to-order merch from ${artistName} on Merch Tent.`;
            const link = `${siteUrl}/product/${product.slug ?? product.id}`;
            const currency = product.currency || "AUD";
            const isApparel = ["tees", "tee", "hoodies", "hoodie", "tanks", "tank", "hats", "hat"]
                .some((value) => (product.category ?? "").toLowerCase().includes(value));
            const availability = colors.length > 0 ? "in_stock" : "out_of_stock";

            return `
        <item>
            <g:id>${xml(product.id)}</g:id>
            <title>${xml(title)}</title>
            <description>${xml(description)}</description>
            <link>${xml(link)}</link>
            <g:image_link>${xml(image)}</g:image_link>
            ${additionalImages.map((url) => `<g:additional_image_link>${xml(url)}</g:additional_image_link>`).join("\n            ")}
            <g:availability>${availability}</g:availability>
            <g:condition>new</g:condition>
            <g:price>${xml(`${(product.price_cents / 100).toFixed(2)} ${currency}`)}</g:price>
            <g:brand>${xml(artistName)}</g:brand>
            <g:product_type>${xml(product.category || "Band merchandise")}</g:product_type>
            <g:google_product_category>${xml(googleCategory(product.category))}</g:google_product_category>
            ${colors.length ? `<g:color>${xml(colors.join("/"))}</g:color>` : ""}
            ${isApparel ? "<g:age_group>adult</g:age_group>\n            <g:gender>unisex</g:gender>" : ""}
            <g:identifier_exists>no</g:identifier_exists>
            <g:shipping>
                <g:country>AU</g:country>
                <g:service>${xml(standardShipping.label)}</g:service>
                <g:price>${xml(`${(standardShipping.checkoutAmountCents / 100).toFixed(2)} AUD`)}</g:price>
            </g:shipping>
        </item>`;
        })
        .filter((item): item is string => Boolean(item))
        .join("");

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
    <channel>
        <title>Merch Tent</title>
        <link>${xml(siteUrl)}</link>
        <description>Official merch from Australian local and unsigned artists.</description>${items}
    </channel>
</rss>`;

    return new Response(body, {
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
    });
}
