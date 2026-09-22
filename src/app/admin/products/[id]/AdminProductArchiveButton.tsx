"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { RotateCcw, Trash2 } from "lucide-react";
import { setAdminProductArchivedAction } from "./archive-actions";

export default function AdminProductArchiveButton({
    productId,
    productTitle,
    archived,
}: {
    productId: string;
    productTitle: string;
    archived: boolean;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function submit() {
        startTransition(async () => {
            try {
                setError(null);
                await setAdminProductArchivedAction(productId, !archived);
                setOpen(false);
                router.refresh();
            } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Could not update product.");
            }
        });
    }

    return (
        <Dialog.Root open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}>
            <Dialog.Trigger asChild>
                <button type="button" className="inline-flex h-11 items-center justify-center gap-2 border border-neutral-700 px-4 text-xs font-black uppercase text-neutral-200 transition hover:border-red-400 hover:text-red-300">
                    {archived ? <RotateCcw className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                    {archived ? "Restore product" : "Delete product"}
                </button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 border border-neutral-700 bg-neutral-950 p-6 text-white shadow-2xl">
                    <Dialog.Title className="text-xl font-black uppercase">{archived ? "Restore product?" : "Delete product?"}</Dialog.Title>
                    <Dialog.Description className="mt-3 text-sm leading-6 text-neutral-300">
                        {archived ? (
                            <><span className="font-bold text-white">{productTitle}</span> will return to the artist&apos;s product list. Previously approved items will need another review before returning to the shop.</>
                        ) : (
                            <><span className="font-bold text-white">{productTitle}</span> will disappear from the artist&apos;s product list and the shop. Past orders and records stay intact.</>
                        )}
                    </Dialog.Description>
                    {error ? <p className="mt-4 text-sm text-red-300" role="alert">{error}</p> : null}
                    <div className="mt-7 flex justify-end gap-3">
                        <Dialog.Close asChild>
                            <button type="button" disabled={pending} className="h-10 border border-neutral-700 px-4 text-sm font-bold text-neutral-200 hover:border-neutral-400">Cancel</button>
                        </Dialog.Close>
                        <button type="button" onClick={submit} disabled={pending} className={`h-10 px-4 text-sm font-black disabled:opacity-50 ${archived ? "bg-lime-300 text-black hover:bg-lime-200" : "bg-red-600 text-white hover:bg-red-500"}`}>
                            {pending ? "Working..." : archived ? "Restore product" : "Delete product"}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
