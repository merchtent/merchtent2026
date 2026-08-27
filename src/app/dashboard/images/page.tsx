// app/dashboard/images/page.tsx
import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, ArrowRight, Image as ImageIcon } from "lucide-react";
import { requireArtistPage } from "@/lib/auth/artist";
import { publicImageUrl } from "@/lib/storage";
import { logger } from "@/lib/logger";

export const revalidate = 0;

type Product = { id: string; title: string | null };
type ImgRow = {
    id: string;
    product_id: string;
    path: string | null;
    sort_order: number | null;
    created_at?: string | null;
};

function fmtDate(iso?: string | null) {
    if (!iso) return "--";
    try {
        return new Date(iso).toLocaleString("en-AU", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return iso ?? "--";
    }
}

function ErrorPage({ message }: { message: string }) {
    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 p-5 md:p-8">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-400">Artist backstage</p>
                <h1 className="mt-3 text-5xl font-black uppercase leading-none md:text-7xl">Images error.</h1>
            </section>
            <div className="p-5 md:p-8">
                <div className="flex items-center gap-2 border border-neutral-800 bg-neutral-950 p-6 text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    {message}
                </div>
            </div>
        </main>
    );
}

export default async function MyImagesPage() {
    const { supabase, artist } = await requireArtistPage();

    const { data: products, error: prodErr } = await supabase
        .from("products")
        .select("id, title")
        .eq("artist_id", artist.id);

    if (prodErr) {
        logger.error("Dashboard images page failed to load products", {
            artist_id: artist.id,
            error: prodErr.message,
        });

        return <ErrorPage message="Could not load products for your images." />;
    }

    const productMap = new Map<string, Product>();
    const productIds = (products ?? []).map((product) => {
        productMap.set(product.id as string, product as Product);
        return product.id as string;
    });

    if (productIds.length === 0) {
        return (
            <main className="min-h-screen bg-black text-white">
                <AssetHeader total={0} />
                <section className="p-5 md:p-8">
                    <div className="border border-neutral-800 bg-neutral-950 p-6">
                        <p className="text-neutral-300">No products yet. Images appear here after a product exists.</p>
                        <Link
                            href="/dashboard/products/designer"
                            className="mt-4 inline-flex items-center gap-2 text-sm font-black text-red-400 hover:text-red-300"
                        >
                            Design product <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </section>
            </main>
        );
    }

    const { data: imgs, error: imgErr } = await supabase
        .from("product_images")
        .select("id, product_id, path, sort_order, created_at")
        .in("product_id", productIds);

    if (imgErr) {
        logger.error("Dashboard images page failed to load product images", {
            artist_id: artist.id,
            product_count: productIds.length,
            error: imgErr.message,
        });

        return <ErrorPage message="Could not load your product images right now." />;
    }

    const images = (imgs ?? []) as ImgRow[];
    const total = images.length;

    return (
        <main className="min-h-screen bg-black text-white">
            <AssetHeader total={total} />

            <section className="p-5 md:p-8">
                {total === 0 ? (
                    <div className="border border-neutral-800 bg-neutral-950 p-6">
                        <p className="text-neutral-300">No images yet.</p>
                        <Link
                            href="/dashboard/products/designer"
                            className="mt-4 inline-flex items-center gap-2 text-sm font-black text-red-400 hover:text-red-300"
                        >
                            Design product <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                ) : (
                    <ul className="grid border border-neutral-800 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {images.map((img) => {
                            const url = publicImageUrl(img.path);
                            const fileName = img.path?.split("/").slice(-1)[0] ?? "--";
                            const product = productMap.get(img.product_id);

                            return (
                                <li key={img.id} className="group overflow-hidden border-b border-r border-neutral-800 bg-neutral-950 transition hover:bg-neutral-900">
                                    <div className="relative">
                                        {url ? (
                                            <Image
                                                src={url}
                                                alt={fileName}
                                                width={800}
                                                height={800}
                                                className="aspect-square w-full object-cover"
                                            />
                                        ) : (
                                            <div className="grid aspect-square w-full place-items-center bg-black text-neutral-500">
                                                <ImageIcon className="h-8 w-8" />
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between border-t border-neutral-800 bg-black px-3 py-2 text-xs">
                                            <span className="truncate text-neutral-300">{fileName}</span>
                                            <span className="text-neutral-500">{fmtDate(img.created_at)}</span>
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-black md:text-base">
                                                    {product?.title ?? "Untitled product"}
                                                </p>
                                                <p className="text-xs text-neutral-500">
                                                    Sort #{img.sort_order ?? 0}
                                                </p>
                                            </div>
                                            {product?.id ? (
                                                <Link href={`/product/${product.id}`} className="shrink-0 text-sm font-black text-red-400">
                                                    View
                                                </Link>
                                            ) : null}
                                        </div>
                                        {url && (
                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-3 inline-flex text-xs font-bold text-neutral-400 underline hover:text-neutral-200"
                                            >
                                                Open original
                                            </a>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </main>
    );
}

function AssetHeader({ total }: { total: number }) {
    return (
        <section className="border-b border-neutral-800 bg-black">
            <div className="grid lg:grid-cols-[1fr_auto]">
                <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-400">Asset wall</p>
                    <h1 className="mt-3 text-5xl font-black uppercase leading-[0.86] md:text-7xl">My images.</h1>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                        Product mockups, uploaded artwork, and generated storefront images.
                    </p>
                </div>
                <div className="flex items-end p-5 md:p-8">
                    <span className="bg-red-600 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white">
                        {total} {total === 1 ? "image" : "images"}
                    </span>
                </div>
            </div>
        </section>
    );
}
