// app/dashboard/products/[id]/edit/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import EditProductFormClient from "./EditProductFormClient";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const revalidate = 0;

function publicImageUrl(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${encodeURIComponent(
        path
    )}`;
}

export default async function EditProductPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = getServerSupabase();

    // auth
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                PRODUCT EDIT // ACCESS
                            </h1>
                            <span className="text-xs bg-neutral-900 text-white px-2 py-1 rounded rotate-[-2deg]">
                                SIGN IN REQUIRED
                            </span>
                        </div>
                    </div>
                </section>

                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        Please{" "}
                        <Link href="/auth/sign-in" className="underline">
                            sign in
                        </Link>
                        .
                    </div>
                </div>
            </main>
        );
    }

    // ---- 1) try WITH category ----
    let product:
        | {
            id: string;
            title: string;
            description: string | null;
            price_cents: number;
            currency: string | null;
            is_published: boolean;
            slug: string | null;
            category?: string | null;
        }
        | null = null;

    let loadErr: any = null;

    {
        const { data, error } = await supabase
            .from("products")
            .select(
                "id, title, description, price_cents, currency, is_published, slug, category"
            )
            .eq("id", id)
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
                "id, title, description, price_cents, currency, is_published, slug"
            )
            .eq("id", id)
            .maybeSingle();

        if (error) {
            console.error("failed to load product", loadErr ?? error);
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
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* angled banner */}
            <section className="relative py-0 mb-6">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">
                                Artist Dashboard
                            </p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                Edit product
                            </h1>
                            <p className="text-xs text-neutral-600 mt-1">{product.title}</p>
                        </div>
                        <Button asChild>
                            <Link
                                href="/dashboard/products"
                                className="inline-flex items-center gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" /> Back to Products
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section className="max-w-5xl mx-auto px-4 pb-10">
                <div
                    className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8"
                    style={{ clipPath: "polygon(1% 0,100% 0,99% 100%,0 100%)" }}
                >
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
                    <div className="mt-8">
                        <p className="text-xs uppercase tracking-wide text-neutral-400 mb-3">
                            Current gallery images
                        </p>
                        <div className="flex gap-3 flex-wrap">
                            {productImages.map((img) => (
                                <div
                                    key={`${img.path}-${img.side ?? "none"}`}
                                    className="w-20 h-20 rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950 text-[10px] text-neutral-500 grid place-items-center relative"
                                >
                                    {img.path ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={publicImageUrl(img.path)!}
                                            alt={img.side ?? "image"}
                                            className="w-full h-full object-cover"
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
                            ))}
                        </div>
                    </div>
                ) : null}
            </section>
        </main>
    );
}
