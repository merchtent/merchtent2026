// app/dashboard/products/new/page.tsx
import { requireArtistPage } from "@/lib/auth/artist";
import NewProductFormClient from "./NewProductFormClient";

export default async function NewProductPage() {
    await requireArtistPage();

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 bg-black">
                <div className="grid lg:grid-cols-[1fr_auto]">
                    <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-400">
                            Manual product
                        </p>
                        <h1 className="mt-3 text-3xl font-black uppercase leading-tight md:text-5xl">
                            Add product.
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                            Keep the original manual creator for stock, imports, and products that do not start in the designer.
                        </p>
                    </div>
                    <div className="flex items-end p-5 md:p-8">
                        <span className="bg-red-600 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white">
                            Classic flow
                        </span>
                    </div>
                </div>
            </section>

            <section className="p-5 md:p-8">
                <div className="border border-neutral-800 bg-neutral-950 p-6 md:p-8">
                    <NewProductFormClient />
                </div>
            </section>
        </main>
    );
}
