// app/dashboard/products/[id]/edit/page.tsx
import EditProductFormClient from "./EditProductFormClient";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { logger } from "@/lib/logger";
import { requireArtistPage } from "@/lib/auth/artist";
import { publicImageUrl } from "@/lib/storage";
import { getDesignerCatalogProduct, listDesignerCatalogProducts } from "@/lib/supplier-catalog";
import { listArtistArtworkLibrary } from "@/lib/products/artist-artwork-library";
import DesignerClient, { type DesignerInitialProduct } from "../../designer/DesignerClient";
import { LogOut } from "lucide-react";

export const revalidate = 0;

export default async function EditProductPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const { supabase, artist } = await requireArtistPage();

    // ---- 1) try WITH category ----
    let product:
        | {
            id: string;
            artist_id: string;
            title: string;
            description: string | null;
            price_cents: number;
            currency: string | null;
            is_published: boolean;
            slug: string | null;
            category?: string | null;
        }
        | null = null;

    let loadErr: unknown = null;

    {
        const { data, error } = await supabase
            .from("products")
            .select(
                "id, artist_id, title, description, price_cents, currency, is_published, slug, category"
            )
            .eq("id", id)
            .eq("artist_id", artist.id)
            .is("artist_archived_at", null)
            .maybeSingle();
        if (!error) {
            product = data;
        } else {
            // likely: column "category" does not exist
            loadErr = error;
        }
    }

    // ---- 2) fallback WITHOUT category ----
    if (!product) {
        const { data, error } = await supabase
            .from("products")
            .select(
                "id, artist_id, title, description, price_cents, currency, is_published, slug"
            )
            .eq("id", id)
            .eq("artist_id", artist.id)
            .is("artist_archived_at", null)
            .maybeSingle();

        if (error) {
            logger.error("dashboard product edit load failed", {
                productId: id,
                artist_id: artist.id,
                error: loadErr ?? error,
            });
            return notFound();
        }

        product = {
            ...data!,
            category: null, // so the client still gets a field
        };
    }

    if (!product) {
        return notFound();
    }

    const { data: savedDesign } = await supabase
        .from("product_designs")
        .select("design_data")
        .eq("product_id", id)
        .eq("provider", "merch_tent")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    const designData = savedDesign?.design_data as {
        catalogProduct?: { key?: string };
        garment?: { color?: string; supplierColorName?: string; colorLabel?: string };
        layers?: DesignerInitialProduct["layers"];
        posterFormatKey?: string | null;
        posterLayouts?: DesignerInitialProduct["posterLayouts"];
    } | null;
    const catalogProduct = designData?.catalogProduct?.key
        ? await getDesignerCatalogProduct(designData.catalogProduct.key)
        : (await listDesignerCatalogProducts()).find((item) =>
            item.category === product.category && product.title.toLowerCase().endsWith(item.name.toLowerCase())
        );

    if (catalogProduct) {
        const recentArtwork = await listArtistArtworkLibrary(artist.id);
        const { data: existingSaleColors } = await supabase
            .from("product_colors")
            .select("label")
            .eq("product_id", id)
            .order("sort_order", { ascending: true });
        const { data: referenceImage } = await supabase
            .from("product_images")
            .select("path")
            .eq("product_id", id)
            .order("sort_order", { ascending: true })
            .limit(1)
            .maybeSingle();
        return (
            <main className="flex h-full min-h-0 flex-col overflow-hidden bg-black text-white">
                <section className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-800 bg-black px-4 py-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff3c]">Product designer</p>
                        <h1 className="mt-1 truncate text-xl font-black uppercase leading-tight md:text-2xl">
                            {catalogProduct.brand} {catalogProduct.model} / {catalogProduct.name}
                        </h1>
                    </div>
                    <Link href="/dashboard/products" className="inline-flex h-10 shrink-0 items-center gap-2 border border-neutral-700 bg-neutral-950 px-4 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:border-lime-300 hover:bg-lime-300 hover:text-black">
                        <LogOut className="h-4 w-4" /> Exit designer
                    </Link>
                </section>
                <DesignerClient
                    catalogProduct={catalogProduct}
                    artistName={artist.display_name}
                    recentArtwork={recentArtwork}
                    initialProduct={{
                        id: product.id,
                        title: product.title,
                        description: product.description,
                        color: designData?.garment?.color,
                        colorLabel: designData?.garment?.supplierColorName ?? designData?.garment?.colorLabel,
                        saleColorNames: existingSaleColors?.map((color) => color.label) ?? [],
                        layers: Array.isArray(designData?.layers) ? designData.layers : [],
                        posterFormatKey: designData?.posterFormatKey,
                        posterLayouts: Array.isArray(designData?.posterLayouts) ? designData.posterLayouts : [],
                        referenceImageUrl: !designData ? publicImageUrl(referenceImage?.path) : null,
                    }}
                />
            </main>
        );
    }

    // 2) colours
    const { data: colorsData } = await supabase
        .from("product_colors")
        .select(
            `
        id,
        hex,
        label,
        sort_order,
        front_image_path,
        back_image_path
      `
        )
        .eq("product_id", id)
        .order("sort_order", { ascending: true });

    // 3) images
    const { data: productImages } = await supabase
        .from("product_images")
        .select("path, sort_order, side")
        .eq("product_id", id)
        .order("sort_order", { ascending: true });

    const frontImg =
        productImages?.find((p) => p.side === "front") ?? productImages?.[0];
    const backImg =
        productImages?.find((p) => p.side === "back") ??
        (productImages && productImages.length > 1 ? productImages[1] : undefined);

    const initialColors =
        colorsData?.map((c) => ({
            id: c.id,
            hex: c.hex,
            label: c.label,
            front_image_url: c.front_image_path
                ? publicImageUrl(c.front_image_path)
                : null,
            back_image_url: c.back_image_path
                ? publicImageUrl(c.back_image_path)
                : null,
            front_image_path: c.front_image_path ?? "",
            back_image_path: c.back_image_path ?? "",
        })) ?? [];

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 bg-black">
                <div className="grid lg:grid-cols-[1fr_auto]">
                    <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#b7ff3c]">
                            Product editor
                        </p>
                        <h1 className="mt-3 text-3xl font-black uppercase leading-tight md:text-5xl">
                            Edit product.
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                            {product.title}
                        </p>
                    </div>
                    <div className="flex items-end p-5 md:p-8">
                        <Button asChild>
                            <Link href="/dashboard/products" className="inline-flex items-center gap-2">
                                <ArrowLeft className="h-4 w-4" /> Back to products
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section className="p-5 md:p-8">
                <div className="border border-neutral-800 bg-neutral-950 p-6 md:p-8">
                    <EditProductFormClient
                        productId={product.id}
                        initialProduct={{
                            ...product,
                            // make sure the form always sees a string
                            category: product.category ?? "",
                        }}
                        initialColors={initialColors}
                        productImages={{
                            front: frontImg?.path ? publicImageUrl(frontImg.path) : null,
                            back: backImg?.path ? publicImageUrl(backImg.path) : null,
                        }}
                    />
                </div>

                {productImages && productImages.length > 0 ? (
                    <div className="mt-8 border border-neutral-800 bg-neutral-950 p-5">
                        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#b7ff3c]">
                            Current gallery images
                        </p>
                        <div className="flex gap-3 flex-wrap">
                            {productImages.map((img) => {
                                const imageUrl = publicImageUrl(img.path);

                                return (
                                    <div
                                        key={`${img.path}-${img.side ?? "none"}`}
                                        className="relative grid h-20 w-20 place-items-center overflow-hidden border border-neutral-800 bg-black text-[10px] text-neutral-500"
                                    >
                                        {imageUrl ? (
                                            <Image
                                                src={imageUrl}
                                                alt={img.side ?? "image"}
                                                width={80}
                                                height={80}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <span>no img</span>
                                        )}
                                        {img.side ? (
                                            <span className="absolute bottom-0 left-0 bg-neutral-900/80 px-1 py-0.5 text-[9px]">
                                                {img.side}
                                            </span>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            </section>
        </main>
    );
}
