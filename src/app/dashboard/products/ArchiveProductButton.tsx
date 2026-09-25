"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { archiveProductAction } from "./archive-actions";

export default function ArchiveProductButton({ productId, productTitle }: { productId: string; productTitle: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function archive() {
        startTransition(async () => {
            try {
                setError(null);
                await archiveProductAction(productId);
                setOpen(false);
                router.refresh();
            } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Could not remove product.");
            }
        });
    }

    return (
        <Dialog.Root open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}>
            <Dialog.Trigger asChild>
                <button type="button" className="inline-flex h-10 items-center justify-center gap-2 border border-neutral-700 px-3 text-sm font-bold text-neutral-300 hover:border-red-400 hover:text-red-300" title="Delete product">
                    <Trash2 className="h-4 w-4" /> Delete
                </button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 border border-neutral-700 bg-neutral-950 p-6 text-white shadow-2xl">
                    <Dialog.Title className="text-xl font-black uppercase">Delete product?</Dialog.Title>
                    <Dialog.Description className="mt-3 text-sm leading-6 text-neutral-300">
                        <span className="font-bold text-white">{productTitle}</span> will disappear from your product list and the shop immediately. You can restore it as a draft from Deleted products for 14 days. Past orders and records stay intact.
                    </Dialog.Description>
                    {error ? <p className="mt-4 text-sm text-red-300" role="alert">{error}</p> : null}
                    <div className="mt-7 flex justify-end gap-3">
                        <Dialog.Close asChild>
                            <button type="button" disabled={pending} className="h-10 border border-neutral-700 px-4 text-sm font-bold text-neutral-200 hover:border-neutral-400">Cancel</button>
                        </Dialog.Close>
                        <button type="button" onClick={archive} disabled={pending} className="h-10 bg-red-600 px-4 text-sm font-black text-white hover:bg-red-500 disabled:opacity-50">
                            {pending ? "Deleting..." : "Delete product"}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
