import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Clock3, Trash2 } from "lucide-react";
import { requireArtistPage } from "@/lib/auth/artist";
import { logger } from "@/lib/logger";
import {
    PRODUCT_RESTORE_WINDOW_DAYS,
    productRestoreCutoff,
    productRestoreDeadline,
    productRestoreDaysRemaining,
} from "@/lib/products/archive-retention";
import { publicImageUrl } from "@/lib/storage";
import RestoreProductButton from "./RestoreProductButton";

export const revalidate = 0;

type DeletedProduct = {
    id: string;
    title: string;
    primary_image_path: string | null;
    artist_archived_at: string;
};

export default async function DeletedProductsPage() {
    const { supabase, artist } = await requireArtistPage();
    const now = new Date();
    const { data, error } = await supabase
        .from("products_with_first_image")
        .select("id, title, primary_image_path, artist_archived_at")
        .eq("artist_id", artist.id)
        .not("artist_archived_at", "is", null)
        .gt("artist_archived_at", productRestoreCutoff(now).toISOString())
        .order("artist_archived_at", { ascending: false });

    if (error) {
        logger.error("Deleted products page failed to load recoverable products", {
            artist_id: artist.id,
            error: error.message,
        });
        return (
            <main className="min-h-screen bg-black p-5 text-white md:p-8">
                <div className="flex items-center gap-2 border border-neutral-800 bg-neutral-950 p-6 text-red-300">
                    <AlertTriangle className="h-4 w-4" /> Could not load deleted products right now.
                </div>
            </main>
        );
    }

    const products = (data ?? []) as DeletedProduct[];

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 p-5 md:p-8">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-lime-300">Recovery</p>
                <h1 className="mt-3 text-3xl font-black uppercase leading-tight md:text-5xl">Deleted products.</h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                    Deleted products stay recoverable for {PRODUCT_RESTORE_WINDOW_DAYS} days. Restoring brings a product back as a draft, never straight back into the shop.
                </p>
                <Link href="/dashboard/products" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-lime-300 hover:text-lime-200">
                    <ArrowLeft className="h-4 w-4" /> Back to your drops
                </Link>
            </section>

            <section className="p-5 md:p-8">
                {products.length === 0 ? (
                    <div className="border border-neutral-800 bg-neutral-950 p-8">
                        <Trash2 className="h-7 w-7 text-neutral-500" />
                        <h2 className="mt-4 text-2xl font-black uppercase">Nothing to recover.</h2>
                        <p className="mt-2 text-sm leading-6 text-neutral-400">
                            Products disappear from this page when their {PRODUCT_RESTORE_WINDOW_DAYS}-day recovery window ends.
                        </p>
                    </div>
                ) : (
                    <ul className="border-l border-t border-neutral-800">
                        {products.map((product) => {
                            const previewUrl = publicImageUrl(product.primary_image_path);
                            const deadline = productRestoreDeadline(product.artist_archived_at);
                            const days = productRestoreDaysRemaining(product.artist_archived_at, now);
                            return (
                                <li
                                    key={product.id}
                                    id={`product-${product.id}`}
                                    className="scroll-mt-4 grid gap-5 border-b border-r border-neutral-800 bg-neutral-950 p-5 target:relative target:z-10 target:bg-lime-300/10 target:ring-2 target:ring-inset target:ring-lime-300 sm:grid-cols-[96px_1fr_auto] sm:items-center md:p-6"
                                >
                                    <div className="relative aspect-[4/5] w-24 overflow-hidden border border-neutral-800 bg-black">
                                        {previewUrl ? (
                                            <Image src={previewUrl} alt={product.title} fill sizes="96px" className="object-contain" />
                                        ) : (
                                            <div className="grid h-full place-items-center"><Trash2 className="h-6 w-6 text-neutral-600" /></div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-lg font-black leading-tight md:text-xl">{product.title}</h2>
                                        <p className="mt-2 flex items-center gap-2 text-sm font-bold text-amber-300">
                                            <Clock3 className="h-4 w-4" /> {days} {days === 1 ? "day" : "days"} left to restore
                                        </p>
                                        <p className="mt-1 text-xs text-neutral-500">
                                            Recovery ends {deadline.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
                                        </p>
                                    </div>
                                    <RestoreProductButton productId={product.id} productTitle={product.title} />
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </main>
    );
}
