"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { RotateCcw } from "lucide-react";
import { restoreProductAction } from "../archive-actions";

export default function RestoreProductButton({ productId, productTitle }: { productId: string; productTitle: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function restore() {
        startTransition(async () => {
            try {
                setError(null);
                await restoreProductAction(productId);
                setOpen(false);
                router.refresh();
            } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Could not restore product.");
            }
        });
    }

    return (
        <Dialog.Root open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}>
            <Dialog.Trigger asChild>
                <button type="button" className="inline-flex h-10 items-center justify-center gap-2 bg-lime-300 px-4 text-sm font-black text-black hover:bg-lime-200">
                    <RotateCcw className="h-4 w-4" /> Restore
                </button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 border border-neutral-700 bg-neutral-950 p-6 text-white shadow-2xl">
                    <Dialog.Title className="text-xl font-black uppercase">Restore product?</Dialog.Title>
                    <Dialog.Description className="mt-3 text-sm leading-6 text-neutral-300">
                        <span className="font-bold text-white">{productTitle}</span> will return to Your drops as a draft. Review it before publishing it again.
                    </Dialog.Description>
                    {error ? <p className="mt-4 text-sm text-red-300" role="alert">{error}</p> : null}
                    <div className="mt-7 flex justify-end gap-3">
                        <Dialog.Close asChild>
                            <button type="button" disabled={pending} className="h-10 border border-neutral-700 px-4 text-sm font-bold text-neutral-200">Cancel</button>
                        </Dialog.Close>
                        <button type="button" onClick={restore} disabled={pending} className="h-10 bg-lime-300 px-4 text-sm font-black text-black disabled:opacity-50">
                            {pending ? "Restoring..." : "Restore as draft"}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
