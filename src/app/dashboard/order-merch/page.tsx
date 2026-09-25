import { AlertTriangle, BadgePercent, PackageCheck, ShoppingBag } from "lucide-react";
import { requireArtistPage } from "@/lib/auth/artist";
import { logger } from "@/lib/logger";
import ArtistMerchOrderClient, { type ArtistOrderProduct } from "./ArtistMerchOrderClient";

export const revalidate = 0;

export default async function ArtistOrderMerchPage() {
    const { supabase, artist } = await requireArtistPage();

    const { data: products, error } = await supabase
        .from("products")
        .select("id, title, price_cents, artist_cut_cents, currency, category, created_at")
        .eq("artist_id", artist.id)
        .eq("fulfillment_flow", "supplier_on_demand")
        .is("artist_archived_at", null)
        .order("created_at", { ascending: false });

    if (error) {
        logger.error("Artist order catalogue failed to load", {
            artist_id: artist.id,
            error: error.message,
        });
    }

    const productIds = (products ?? []).map((product) => product.id);
    const [{ data: variants }, { data: images }, { data: colors }] = productIds.length
        ? await Promise.all([
            supabase
                .from("product_printify_variants")
                .select("product_id, size_label, color_label, sku, is_enabled")
                .in("product_id", productIds)
                .eq("is_enabled", true),
            supabase
                .from("product_images")
                .select("product_id, path, sort_order")
                .in("product_id", productIds)
                .order("sort_order", { ascending: true }),
            supabase
                .from("product_colors")
                .select("product_id, label, sort_order")
                .in("product_id", productIds)
                .order("sort_order", { ascending: true }),
        ])
        : [{ data: [] }, { data: [] }, { data: [] }];

    const firstImageByProduct = new Map<string, string>();
    for (const image of images ?? []) {
        if (!firstImageByProduct.has(image.product_id)) {
            firstImageByProduct.set(image.product_id, image.path);
        }
    }

    const variantsByProduct = new Map<string, ArtistOrderProduct["variants"]>();
    for (const variant of variants ?? []) {
        const size = variant.size_label?.trim();
        const color = variant.color_label?.trim();
        if (!size || !color) continue;
        variantsByProduct.set(variant.product_id, [
            ...(variantsByProduct.get(variant.product_id) ?? []),
            { size, color, sku: variant.sku ?? null },
        ]);
    }

    const colorsByProduct = new Map<string, string[]>();
    for (const color of colors ?? []) {
        const label = color.label?.trim();
        if (!label) continue;
        colorsByProduct.set(color.product_id, [
            ...(colorsByProduct.get(color.product_id) ?? []),
            label,
        ]);
    }

    const fallbackSizes = (category: string | null) =>
        ["hats", "bags", "posters"].includes((category ?? "").toLowerCase())
            ? ["One size"]
            : ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

    const orderableProducts: ArtistOrderProduct[] = (products ?? [])
        .map((product) => ({
            id: product.id,
            title: product.title,
            price_cents: Number(product.price_cents ?? 0),
            artist_cut_cents: Number(product.artist_cut_cents ?? 0),
            currency: product.currency ?? "AUD",
            image_path: firstImageByProduct.get(product.id) ?? null,
            variants: variantsByProduct.get(product.id) ??
                (colorsByProduct.get(product.id) ?? ["Default"]).flatMap((color) =>
                    fallbackSizes(product.category).map((size) => ({ color, size, sku: null }))
                ),
        }));

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 p-5 md:p-8">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-lime-300">
                    Artist pricing
                </p>
                <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h1 className="text-3xl font-black uppercase leading-tight md:text-5xl">
                            Order your merch.
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
                            Buy your own live products at RRP minus your artist cut. The discount is applied now, so these units do not create a later artist payout.
                        </p>
                        <div className="mt-5 border-l-4 border-lime-300 bg-lime-300/10 px-4 py-3">
                            <p className="text-sm font-black uppercase text-lime-300">Order 10+ and save another 10%</p>
                            <p className="mt-1 text-xs leading-5 text-neutral-400">
                                Mix colours, sizes and your products in one artist order. The volume saving appears automatically in your cart.
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 border border-neutral-800 bg-neutral-950 text-xs uppercase tracking-[0.12em]">
                        <div className="border-r border-neutral-800 p-4">
                            <BadgePercent className="h-4 w-4 text-lime-300" />
                            <p className="mt-2 text-neutral-400">Cut removed</p>
                        </div>
                        <div className="p-4">
                            <PackageCheck className="h-4 w-4 text-red-500" />
                            <p className="mt-2 text-neutral-400">Normal fulfilment</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="p-5 md:p-8">
                {error ? (
                    <div className="flex items-center gap-3 border border-red-500/40 bg-red-500/10 p-5 text-red-200">
                        <AlertTriangle className="h-5 w-5" />
                        Could not load your artist catalogue right now.
                    </div>
                ) : orderableProducts.length ? (
                    <ArtistMerchOrderClient products={orderableProducts} />
                ) : (
                    <div className="border border-neutral-800 bg-neutral-950 p-8">
                        <ShoppingBag className="h-8 w-8 text-red-500" />
                        <h2 className="mt-4 text-2xl font-black uppercase">No orderable products yet.</h2>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-400">
                            Products you create on Merch Tent will appear here.
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
}
