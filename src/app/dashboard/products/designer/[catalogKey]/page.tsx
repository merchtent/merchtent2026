import { notFound } from "next/navigation";
import { requireArtistPage } from "@/lib/auth/artist";
import { getDesignerCatalogProduct } from "@/lib/supplier-catalog";
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

    return (
        <main className="bg-black text-white">
            <section className="border-b border-neutral-800 bg-black px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff3c]">
                    Product designer / {product.supplier.name}
                </p>
                <h1 className="mt-1 text-xl font-black uppercase leading-tight md:text-2xl">
                    {product.brand} {product.model} / {product.name}
                </h1>
            </section>

            <DesignerClient catalogProduct={product} artistName={artist.display_name} />
        </main>
    );
}
