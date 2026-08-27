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
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-400">
                            Product editor
                        </p>
                        <h1 className="mt-3 text-5xl font-black uppercase leading-[0.86] md:text-7xl">
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
                        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-red-400">
                            Current gallery images
                        </p>
                        <div className="flex gap-3 flex-wrap">
                            {productImages.map((img) => {
                                const imageUrl = publicImageUrl(img.path);

                                return (
                                    <div
                                        key={`${img.path}-${img.side ?? "none"}`}
                                        className="w-20 h-20 rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950 text-[10px] text-neutral-500 grid place-items-center relative"
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
                                            <span className="absolute bottom-0 left-0 bg-neutral-900/80 text-[9px] px-1 py-0.5 rounded-tr">
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
