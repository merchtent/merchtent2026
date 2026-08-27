import Link from "next/link";
import { requireArtistPage } from "@/lib/auth/artist";
import DesignerClient from "./DesignerClient";

export default async function ProductDesignerPage() {
    await requireArtistPage();

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 bg-black">
                <div className="grid lg:grid-cols-[1fr_auto]">
                    <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-400">
                            Product designer
                        </p>
                        <h1 className="mt-3 text-5xl font-black uppercase leading-[0.86] md:text-7xl">
                            Build the drop.
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                            Place artwork, text, and production data before turning the design into a live listing.
                        </p>
                    </div>
                    <div className="flex items-end p-5 md:p-8">
                        <Link
                            href="/dashboard/products/new"
                            className="inline-flex items-center gap-2 border border-neutral-700 px-5 py-3 text-sm font-black hover:border-red-500"
                        >
                            Manual creator
                        </Link>
                    </div>
                </div>
            </section>

            <section className="p-5 md:p-8">
                <div className="border border-neutral-800 bg-neutral-950 p-4 md:p-6">
                    <DesignerClient />
                </div>
            </section>
        </main>
    );
}
