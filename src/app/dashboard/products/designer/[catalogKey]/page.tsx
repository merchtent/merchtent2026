import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireArtistPage } from "@/lib/auth/artist";
import { getDesignerCatalogProduct } from "@/lib/supplier-catalog";
import { listArtistArtworkLibrary } from "@/lib/products/artist-artwork-library";
import DesignerClient from "../DesignerClient";

export default async function ProductDesignerForCatalogPage({
    params,
}: {
    params: Promise<{ catalogKey: string }>;
}) {
    const { artist } = await requireArtistPage();
    const { catalogKey } = await params;
    const product = await getDesignerCatalogProduct(catalogKey);

    if (!product) notFound();
    if (catalogKey !== product.key) redirect(`/dashboard/products/designer/${product.key}`);
    const recentArtwork = await listArtistArtworkLibrary(artist.id);

    return (
        <main className="flex h-full min-h-0 flex-col overflow-hidden bg-black text-white">
            <section className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-800 bg-black px-4 py-3">
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff3c]">
                        Product designer
                    </p>
                    <h1 className="mt-1 truncate text-xl font-black uppercase leading-tight md:text-2xl">
                        {product.brand} {product.model} / {product.name}
                    </h1>
                </div>
                <Link
                    href="/dashboard/products"
                    className="inline-flex h-10 shrink-0 items-center gap-2 border border-neutral-700 bg-neutral-950 px-4 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:border-lime-300 hover:bg-lime-300 hover:text-black"
                >
                    <LogOut className="h-4 w-4" />
                    Exit designer
                </Link>
            </section>

            <DesignerClient catalogProduct={product} artistName={artist.display_name} recentArtwork={recentArtwork} />
        </main>
    );
}
