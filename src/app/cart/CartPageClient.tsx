"use client";

import { useCart } from "@/components/CartProvider";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

function fmt(amount_cents: number, currency: string | null) {
    const c = currency ?? "AUD";
    try {
        return new Intl.NumberFormat("en-AU", { style: "currency", currency: c }).format(
            amount_cents / 100
        );
    } catch {
        return (amount_cents / 100).toLocaleString(undefined, {
            style: "currency",
            currency: c,
        });
    }
}

function publicImageUrl(path: string) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${encodeURIComponent(
        path
    )}`;
}

// support storage path OR full URL (colour override)
function resolveCartImage(src?: string | null): string | null {
    if (!src) return null;
    if (src.startsWith("http://") || src.startsWith("https://")) return src;
    return publicImageUrl(src);
}

export default function CartPageClient() {
    const { items, setQty, remove, clear, subtotal_cents, currency } = useCart();

    function goToCheckout() {
        // no POST needed anymore — checkout reads local cart
        window.location.href = "/checkout";
    }

    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* angled banner */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-6xl mx-auto px-4 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-[10px] text-red-600">
                                Checkout
                            </p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                Your cart
                            </h1>
                        </div>
                        {!!items.length && (
                            <button
                                onClick={clear}
                                className="hidden md:inline-flex items-center gap-2 text-xs underline text-neutral-700"
                            >
                                <Trash2 className="h-4 w-4" />
                                Clear cart
                            </button>
                        )}
                    </div>
                </div>
            </section>

            <section className="max-w-6xl mx-auto px-4 py-8">
                {items.length === 0 ? (
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-neutral-300">
                        Your cart is empty.{" "}
                        <Link href="/" className="underline">
                            Continue shopping
                        </Link>
                        .
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Items list */}
                        <div
                            className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden"
                            style={{ clipPath: "polygon(2% 0,100% 0,100% 100%,0 100%)" }}
                        >
                            <ul className="divide-y divide-neutral-800">
                                {items.map((item) => {
                                    const lineId = item.sku ?? item.product_id;
                                    const resolvedImg = resolveCartImage(item.image_path);
                                    const hasVariantLine = item.sku || item.color_label || item.size;

                                    return (
                                        <li
                                            key={lineId}
                                            className="p-4 md:p-5 flex items-center gap-4 md:gap-6"
                                        >
                                            <div className="relative h-20 w-20 md:h-24 md:w-24 shrink-0 overflow-hidden rounded bg-neutral-950 border border-neutral-800">
                                                {resolvedImg ? (
                                                    <Image
                                                        src={resolvedImg}
                                                        alt={item.title}
                                                        fill
                                                        sizes="96px"
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="h-full w-full grid place-items-center text-xs text-neutral-500">
                                                        No image
                                                    </div>
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="font-medium truncate">{item.title}</p>
                                                        <p className="text-sm text-neutral-400">
                                                            {fmt(item.price_cents, item.currency)}
                                                        </p>

                                                        {hasVariantLine ? (
                                                            <div className="mt-1 text-[11px] text-neutral-500 space-x-2">
                                                                {item.sku ? (
                                                                    <span className="inline-block bg-neutral-900/40 px-1.5 py-0.5 rounded-sm border border-neutral-800/60">
                                                                        {item.sku}
                                                                    </span>
                                                                ) : null}
                                                                {item.color_label ? <span>{item.color_label}</span> : null}
                                                                {item.size ? <span>{item.size}</span> : null}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                    <button
                                                        onClick={() =>
                                                            remove(lineId, {
                                                                by: item.sku ? "sku" : "product_id",
                                                            })
                                                        }
                                                        className="text-xs underline text-neutral-400 hover:text-white"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>

                                                {/* qty row */}
                                                <div className="mt-3 flex items-center gap-3">
                                                    <span className="text-xs text-neutral-500">Qty</span>
                                                    <div className="inline-flex items-center rounded-lg border border-neutral-700 overflow-hidden">
                                                        <button
                                                            type="button"
                                                            aria-label="Decrease quantity"
                                                            className="h-8 w-8 grid place-items-center hover:bg-neutral-950"
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
                                                            className="h-8 w-14 bg-neutral-950 text-center text-sm outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            aria-label="Increase quantity"
                                                            className="h-8 w-8 grid place-items-center hover:bg-neutral-950"
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
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>

                            {/* footer actions (mobile) */}
                            <div className="p-4 border-t border-neutral-800 flex items-center justify-between lg:hidden">
                                <Link href="/" className="underline text-sm">
                                    Continue shopping
                                </Link>
                                <button onClick={clear} className="text-xs underline text-neutral-400">
                                    Clear cart
                                </button>
                            </div>
                        </div>

                        {/* Summary */}
                        <aside className="lg:sticky lg:top-6 h-max">
                            <div
                                className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 md:p-6"
                                style={{ clipPath: "polygon(6% 0,100% 0,94% 100%,0 100%)" }}
                            >
                                <h2 className="text-sm uppercase tracking-[0.25em] text-neutral-400">
                                    Summary
                                </h2>

                                <div className="mt-4 space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-300">Subtotal</span>
                                        <span className="text-lg font-black text-red-400">
                                            {fmt(subtotal_cents, currency)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-400">Shipping</span>
                                        <span className="text-neutral-400">Calculated at checkout</span>
                                    </div>
                                </div>

                                <button
                                    onClick={goToCheckout}
                                    disabled={items.length === 0}
                                    className="mt-5 w-full relative rounded-xl px-5 py-3 text-sm font-black tracking-wide bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 border border-red-500 disabled:opacity-50"
                                    style={{ clipPath: "polygon(6% 0,100% 0,94% 100%,0 100%)" }}
                                >
                                    Checkout
                                </button>

                                <p className="mt-3 text-[11px] text-neutral-500">
                                    Taxes calculated at checkout. Free express over A$100.
                                </p>
                            </div>

                            <div className="mt-4 text-center">
                                <Link href="/" className="underline text-sm">
                                    Continue shopping
                                </Link>
                            </div>
                        </aside>
                    </div>
                )}
            </section>
        </main>
    );
}
