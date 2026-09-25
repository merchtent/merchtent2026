"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LockKeyhole, Trash2 } from "lucide-react";
import type { ArtistArtworkGalleryAsset } from "@/lib/products/artist-artwork-library";
import { removeArtworkAction } from "./actions";

function dateLabel(value: string | null) {
    if (!value) return "Saved artwork";
    return `Last used ${new Date(value).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`;
}

export default function ArtworkGalleryClient({ initialAssets }: { initialAssets: ArtistArtworkGalleryAsset[] }) {
    const [assets, setAssets] = useState(initialAssets);

    return (
        <ul className="grid border-l border-t border-neutral-800 sm:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset, index) => (
                <ArtworkCard
                    key={asset.path}
                    asset={asset}
                    number={index + 1}
                    onRemoved={() => setAssets((current) => current.filter((item) => item.path !== asset.path))}
                />
            ))}
        </ul>
    );
}

function ArtworkCard({
    asset,
    number,
    onRemoved,
}: {
    asset: ArtistArtworkGalleryAsset;
    number: number;
    onRemoved: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const activeUsages = asset.usages.filter((usage) => !usage.isArchived);
    const recoveryUsages = asset.usages.filter((usage) => usage.isRecoverable);

    function remove() {
        startTransition(async () => {
            try {
                setError(null);
                await removeArtworkAction(asset.path);
                setOpen(false);
                onRemoved();
            } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Could not remove artwork.");
            }
        });
    }

    return (
        <li className="border-b border-r border-neutral-800 bg-neutral-950">
            <div className="relative aspect-square overflow-hidden bg-[#f3f1e8]">
                <Image
                    src={asset.previewUrl}
                    alt={`Saved artwork ${number}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    className="object-contain p-4"
                />
            </div>
            <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-black uppercase">Artwork {String(number).padStart(2, "0")}</p>
                        <p className="mt-1 text-xs text-neutral-500">{dateLabel(asset.lastUsedAt)}</p>
                    </div>
                    <span className={`border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                        asset.canRemove
                            ? "border-lime-400/50 text-lime-300"
                            : "border-amber-400/40 text-amber-300"
                    }`}>
                        {asset.canRemove ? "Ready to remove" : recoveryUsages.length > 0 ? "Recovery hold" : "In use"}
                    </span>
                </div>

                <div className="mt-4 border-t border-neutral-800 pt-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                        {asset.usages.length === 1 ? "Linked product" : `${asset.usages.length} linked products`}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {asset.usages.map((usage) => (
                            <Link
                                key={usage.productId}
                                href={`${usage.isArchived ? "/dashboard/products/deleted" : "/dashboard/products"}#product-${usage.productId}`}
                                className="border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:border-lime-300 hover:text-lime-300"
                            >
                                {usage.title} {usage.isArchived ? "(deleted)" : usage.isPublished ? "(live)" : "(draft)"}
                            </Link>
                        ))}
                    </div>
                </div>

                {asset.canRemove ? (
                    <Dialog.Root open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}>
                        <Dialog.Trigger asChild>
                            <button type="button" className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 border border-red-500/60 text-sm font-black text-red-300 hover:bg-red-600 hover:text-white">
                                <Trash2 className="h-4 w-4" /> Remove artwork
                            </button>
                        </Dialog.Trigger>
                        <Dialog.Portal>
                            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
                            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 border border-neutral-700 bg-neutral-950 p-6 text-white shadow-2xl">
                                <Dialog.Title className="text-xl font-black uppercase">Remove artwork?</Dialog.Title>
                                <Dialog.Description className="mt-3 text-sm leading-6 text-neutral-300">
                                    This removes the original file from your gallery and deleted product designs. It cannot be reused or restored.
                                </Dialog.Description>
                                {error ? <p className="mt-4 text-sm text-red-300" role="alert">{error}</p> : null}
                                <div className="mt-7 flex justify-end gap-3">
                                    <Dialog.Close asChild>
                                        <button type="button" disabled={pending} className="h-10 border border-neutral-700 px-4 text-sm font-bold">Cancel</button>
                                    </Dialog.Close>
                                    <button type="button" onClick={remove} disabled={pending} className="h-10 bg-red-600 px-4 text-sm font-black disabled:opacity-50">
                                        {pending ? "Removing..." : "Remove permanently"}
                                    </button>
                                </div>
                            </Dialog.Content>
                        </Dialog.Portal>
                    </Dialog.Root>
                ) : (
                    <div className="mt-5 flex gap-2 border border-neutral-800 bg-black p-3 text-xs leading-5 text-neutral-400">
                        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                        {recoveryUsages.length > 0
                            ? "A linked product is still recoverable. Artwork removal unlocks after its 14-day recovery window."
                            : `Delete ${activeUsages.length === 1 ? "the linked product" : "all linked products"} before removing this artwork.`}
                    </div>
                )}
            </div>
        </li>
    );
}
