"use client";

import { useCart } from "@/components/CartProvider";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { X, Minus, Plus } from "lucide-react";
import { publicProductImageUrlOrSource } from "@/lib/storage";

function fmt(amount_cents: number, currency: string | null) {
    const c = currency ?? "AUD";
    try {
        return new Intl.NumberFormat("en-AU", {
            style: "currency",
            currency: c,
        }).format(amount_cents / 100);
    } catch {
        return (amount_cents / 100).toLocaleString(undefined, {
            style: "currency",
            currency: c,
        });
    }
}

export default function MiniCartDrawer() {
    const {
        isOpen,
        close,
        items,
        setQty,
        remove,
        subtotal_cents,
        artist_bulk_discount_cents,
        payable_subtotal_cents,
        currency,
        clear,
    } = useCart();
    const pathname = usePathname();
    const previousPathnameRef = useRef(pathname);

    // Close on ESC
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, close]);

    // Close on route change
    useEffect(() => {
        if (previousPathnameRef.current === pathname) return;
        previousPathnameRef.current = pathname;
        if (isOpen) close();
    }, [pathname, isOpen, close]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                aria-hidden
                className="fixed inset-0 z-[60] bg-black/60"
                onClick={close}
            />

            {/* Drawer Panel */}
            <aside
                role="dialog"
                aria-label="Shopping cart"
                className="fixed right-0 top-0 z-[70] h-dvh w-full max-w-md translate-x-0 border-l border-white/10 bg-[#060606] text-white shadow-2xl will-change-transform"
            >
                {/* subtle noise */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-soft-light"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle at 20% 10%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 30%, #fff 1px, transparent 1px)",
                        backgroundSize: "12px 12px, 14px 14px",
                    }}
                />

                <div className="relative flex h-full flex-col">
                    {/* Header */}
                    <header className="flex items-center justify-between border-b border-white/10 bg-black/70 px-4 py-4 backdrop-blur">
                        <h2 className="text-sm font-black uppercase tracking-[0.28em] text-[#b6ff3f]">
                            Your Bag
                        </h2>
                        <div className="flex items-center gap-2">
                            {!!items.length && (
                                <button
                                    onClick={clear}
                                    className="text-xs font-black uppercase tracking-[0.16em] text-white/45 underline decoration-red-500 underline-offset-4 hover:text-red-400"
                                    aria-label="Clear cart"
                                >
                                    Clear
                                </button>
                            )}
                            <button
                                onClick={close}
                                className="grid h-8 w-8 place-items-center border border-white/15 hover:border-[#b6ff3f]"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </header>

                    {/* Items */}
                    <div className="flex-1 overflow-auto">
                        {items.length === 0 ? (
                            <div className="p-6 text-white/50">Your bag is empty.</div>
                        ) : (
                            <ul className="divide-y divide-white/10">
                                {items.map((item) => {
                                    const lineId = item.sku ?? item.product_id;
                                    const variantLine = item.sku || item.color_label || item.size;
                                    const resolvedImg = publicProductImageUrlOrSource(item.image_path);

                                    return (
                                        <li key={lineId} className="flex items-center gap-4 p-4">
                                            <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-white/10 bg-[#f4f1e8]">
                                                {resolvedImg ? (
                                                    <Image
                                                        src={resolvedImg}
                                                        alt={item.title}
                                                        fill
                                                        className="object-contain p-1"
                                                        sizes="64px"
                                                    />
                                                ) : (
                                                    <div className="h-16 w-16 grid place-items-center text-xs text-neutral-500">
                                                        No image
                                                    </div>
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="truncate font-black uppercase leading-tight">{item.title}</div>
                                                <div className="text-sm font-black text-[#b6ff3f]">
                                                    {fmt(item.price_cents, item.currency)}
                                                </div>
                                                {item.purchase_type === "artist_self_order" ? (
                                                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-lime-300">
                                                        Artist price · no payout
                                                    </div>
                                                ) : null}

                                                {variantLine ? (
                                                    <div className="mt-1 space-x-2 text-[11px] uppercase tracking-[0.14em] text-white/40">
                                                        {item.sku ? (
                                                            <span className="inline-block border border-white/10 bg-white/5 px-1.5 py-0.5">
                                                                {item.sku}
                                                            </span>
                                                        ) : null}
                                                        {item.color_label ? <span>{item.color_label}</span> : null}
                                                        {item.size ? <span>{item.size}</span> : null}
                                                    </div>
                                                ) : null}

                                                {/* qty controls */}
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-xs font-black uppercase tracking-[0.14em] text-white/40">Qty</span>
                                                    <div className="inline-flex items-center overflow-hidden border border-white/15">
                                                        <button
                                                            type="button"
                                                            aria-label="Decrease quantity"
                                                            className="grid h-8 w-8 place-items-center hover:bg-white/10"
                                                            onClick={() =>
                                                                setQty(
                                                                    lineId,
                                                                    Math.max(1, item.qty - 1),
                                                                    { by: item.sku ? "sku" : "product_id" }
                                                                )
                                                            }
                                                        >
                                                            <Minus className="h-4 w-4" />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={99}
                                                            value={item.qty}
                                                            onChange={(e) =>
                                                                setQty(
                                                                    lineId,
                                                                    Math.max(1, Number(e.target.value || 1)),
                                                                    { by: item.sku ? "sku" : "product_id" }
                                                                )
                                                            }
                                                            className="h-8 w-12 bg-black text-center text-sm outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            aria-label="Increase quantity"
                                                            className="grid h-8 w-8 place-items-center hover:bg-white/10"
                                                            onClick={() =>
                                                                setQty(
                                                                    lineId,
                                                                    Math.min(99, item.qty + 1),
                                                                    { by: item.sku ? "sku" : "product_id" }
                                                                )
                                                            }
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </button>
                                                    </div>

                                                    <button
                                                        className="ml-2 text-xs font-black uppercase tracking-[0.14em] text-white/45 underline decoration-red-500 underline-offset-4 hover:text-red-400"
                                                        onClick={() =>
                                                            remove(lineId, {
                                                                by: item.sku ? "sku" : "product_id",
                                                            })
                                                        }
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    {/* Footer */}
                    <footer className="sticky bottom-0 border-t border-white/10 bg-black p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-white/55">{artist_bulk_discount_cents > 0 ? "Artist subtotal" : "Subtotal"}</span>
                            <span className={artist_bulk_discount_cents > 0 ? "text-white/45 line-through" : "text-lg font-black text-[#b6ff3f]"}>
                                {fmt(subtotal_cents, currency)}
                            </span>
                        </div>
                        {artist_bulk_discount_cents > 0 ? (
                            <div className="mb-3 space-y-2">
                                <div className="flex items-center justify-between text-xs font-black uppercase text-lime-300">
                                    <span>10+ artist saving</span>
                                    <span>-{fmt(artist_bulk_discount_cents, currency)}</span>
                                </div>
                                <div className="flex items-center justify-between border-t border-white/10 pt-2">
                                    <span className="text-xs font-black uppercase text-white/70">Discounted subtotal</span>
                                    <span className="text-lg font-black text-[#b6ff3f]">{fmt(payable_subtotal_cents, currency)}</span>
                                </div>
                            </div>
                        ) : null}

                        <div className="flex gap-2">
                            <Link
                                href="/cart"
                                onClick={close}
                                className="flex-1 border border-white/15 px-4 py-3 text-center text-sm font-black uppercase hover:border-[#b6ff3f]"
                            >
                                View cart
                            </Link>

                            <Link
                                href="/checkout"
                                className="relative bg-[#b6ff3f] px-5 py-3 text-sm font-black uppercase tracking-wide text-black hover:bg-white disabled:opacity-50"
                            >
                                Checkout
                            </Link>
                        </div>

                        <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-white/40">
                            Shipping & taxes calculated at checkout.
                        </p>
                    </footer>
                </div>
            </aside>
        </>
    );
}
