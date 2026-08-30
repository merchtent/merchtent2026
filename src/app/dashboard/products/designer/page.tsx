import { requireArtistPage } from "@/lib/auth/artist";
import { listDesignerCatalogProducts } from "@/lib/supplier-catalog";
import CatalogChooser from "./CatalogChooser";

export default async function ProductDesignerPage() {
    await requireArtistPage();
    const products = await listDesignerCatalogProducts();

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 bg-black">
                <div className="p-5 md:p-8">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#b7ff3c]">
                        Product designer
                    </p>
                    <h1 className="mt-3 text-3xl font-black uppercase leading-tight md:text-5xl">
                        Choose a product.
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                        Start with a supplier-backed blank, then open the designer with the right print areas,
                        colours, sizes and automation metadata already attached.
                    </p>
                </div>
            </section>

            <section className="p-5 md:p-8">
                <CatalogChooser products={products} />
            </section>
        </main>
    );
}
