import Link from "next/link";
import { AlertTriangle, ArrowRight, ImagePlus, ShieldCheck } from "lucide-react";
import { requireArtistPage } from "@/lib/auth/artist";
import { listArtistArtworkGallery } from "@/lib/products/artist-artwork-library";
import type { ArtistArtworkGalleryAsset } from "@/lib/products/artist-artwork-library";
import { logger } from "@/lib/logger";
import ArtworkGalleryClient from "./ArtworkGalleryClient";

export const revalidate = 0;

export default async function ArtworkGalleryPage() {
    const { artist } = await requireArtistPage();
    let assets: ArtistArtworkGalleryAsset[];
    try {
        assets = await listArtistArtworkGallery(artist.id);
    } catch (error) {
        logger.error("Dashboard images page failed to load product images", {
            artist_id: artist.id,
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return (
            <main className="min-h-screen bg-black p-5 text-white md:p-8">
                <div className="flex items-center gap-2 border border-neutral-800 bg-neutral-950 p-6 text-red-300">
                    <AlertTriangle className="h-4 w-4" />
                    Could not load your product images right now.
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800">
                <div className="grid lg:grid-cols-[1fr_320px]">
                    <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-lime-300">Artwork library</p>
                        <h1 className="mt-3 text-3xl font-black uppercase leading-tight md:text-5xl">Artwork gallery.</h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                            Reuse original artwork across tees, hoodies, hats and future drops. You own your artwork; Merch Tent stores and uses it to create, sell and fulfil the products you choose.
                        </p>
                    </div>
                    <div className="flex flex-col justify-end p-5 md:p-8">
                        <p className="text-4xl font-black">{assets.length}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                            {assets.length === 1 ? "saved artwork" : "saved artworks"}
                        </p>
                    </div>
                </div>
            </section>

            <section className="grid border-b border-neutral-800 lg:grid-cols-2">
                <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                    <div className="flex gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-lime-300" />
                        <div>
                            <h2 className="text-sm font-black uppercase">How removal works</h2>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-400">
                                Artwork stays locked while a live or draft product uses it, and through the 14-day product recovery window. Permanent removal unlocks after every linked product is no longer recoverable.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-5 md:p-8">
                    <p className="text-sm leading-6 text-neutral-400">
                        Removing artwork stops future reuse and deletes its original upload. Order, payment and fulfilment records are kept separately where the law or customer support requires them.
                    </p>
                    <div className="mt-3 flex gap-4 text-xs font-black uppercase">
                        <Link href="/terms" className="text-lime-300 hover:text-lime-200">Artwork terms</Link>
                        <Link href="/privacy" className="text-lime-300 hover:text-lime-200">Privacy</Link>
                    </div>
                </div>
            </section>

            <section className="p-5 md:p-8">
                {assets.length > 0 ? (
                    <ArtworkGalleryClient initialAssets={assets} />
                ) : (
                    <div className="border border-neutral-800 bg-neutral-950 p-8">
                        <ImagePlus className="h-7 w-7 text-lime-300" />
                        <h2 className="mt-4 text-2xl font-black uppercase">No saved artwork yet.</h2>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-400">
                            Artwork appears here after you save a product in the designer.
                        </p>
                        <Link href="/dashboard/products/designer" className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase text-lime-300">
                            Design a product <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                )}
            </section>
        </main>
    );
}
