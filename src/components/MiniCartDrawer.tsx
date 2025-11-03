"use client";

import { useCart } from "@/components/CartProvider";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X, Minus, Plus } from "lucide-react";

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

function publicImageUrl(path: string) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${encodeURIComponent(
        path
    )}`;
}

// 👇 helper to support both storage paths AND full URLs
function resolveCartImage(src?: string | null): string | null {
    if (!src) return null;
    if (src.startsWith("http://") || src.startsWith("https://")) {
        return src; // already a full URL (like overrideImage from colour)
    }
    return publicImageUrl(src); // treat as storage path
}

export default function MiniCartDrawer() {
    const {
        isOpen,
        close,
        items,
        setQty,
        remove,
        subtotal_cents,
        currency,
        clear,
    } = useCart();
    const pathname = usePathname();
    const [loading, setLoading] = useState(false);

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
        if (isOpen) close();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    if (!isOpen) return null;

    async function goToCheckout() {
        try {
            setLoading(true);
            const res = await fetch("/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: items.map((i) => ({
                        product_id: i.product_id,
                        sku: i.sku ?? null,
                        qty: i.qty,
                    })),
                }),
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Checkout failed");
            }
            const { url } = await res.json();
            window.location.href = url;
        } catch (e: any) {
            alert(e.message ?? "Checkout failed");
            setLoading(false);
        }
    }

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
                className="fixed right-0 top-0 z-[70] h-dvh w-full max-w-md translate-x-0 bg-neutral-950 text-neutral-100 shadow-2xl border-l border-neutral-800 will-change-transform"
                style={{ clipPath: "polygon(1% 0,100% 0,100% 100%,0 100%)" }}
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
                    <header className="px-4 py-4 border-b border-neutral-800 bg-neutral-900/60 backdrop-blur flex items-center justify-between">
                        <h2 className="text-sm uppercase tracking-[0.25em] text-neutral-300">
                            Your Bag
                        </h2>
                        <div className="flex items-center gap-2">
                            {!!items.length && (
                                <button
                                    onClick={clear}
                                    className="text-xs text-neutral-400 hover:text-white underline"
                                    aria-label="Clear cart"
                                >
                                    Clear
                                </button>
                            )}
                            <button
                                onClick={close}
                                className="h-8 w-8 grid place-items-center rounded-full border border-neutral-700 hover:border-neutral-500"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </header>

                    {/* Items */}
                    <div className="flex-1 overflow-auto">
                        {items.length === 0 ? (
                            <div className="p-6 text-neutral-400">Your bag is empty.</div>
                        ) : (
                            <ul className="divide-y divide-neutral-800">
                                {items.map((item) => {
                                    const lineId = item.sku ?? item.product_id;
                                    const variantLine = item.sku || item.color_label || item.size;
                                    const resolvedImg = resolveCartImage(item.image_path);

                                    return (
                                        <li key={lineId} className="p-4 flex items-center gap-4">
                                            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-neutral-900 border border-neutral-800">
                                                {resolvedImg ? (
                                                    <Image
                                                        src={resolvedImg}
                                                        alt={item.title}
                                                        fill
                                                        className="object-cover"
                                                        sizes="64px"
                                                    />
                                                ) : (
                                                    <div className="h-16 w-16 grid place-items-center text-xs text-neutral-500">
                                                        No image
                                                    </div>
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium truncate">{item.title}</div>
                                                <div className="text-sm text-neutral-400">
                                                    {fmt(item.price_cents, item.currency)}
                                                </div>

                                                {variantLine ? (
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

                                                {/* qty controls */}
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-xs text-neutral-500">Qty</span>
                                                    <div className="inline-flex items-center rounded-lg border border-neutral-700 overflow-hidden">
                                                        <button
                                                            type="button"
                                                            aria-label="Decrease quantity"
                                                            className="h-8 w-8 grid place-items-center hover:bg-neutral-900"
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
                                                            className="h-8 w-12 bg-neutral-950 text-center text-sm outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            aria-label="Increase quantity"
                                                            className="h-8 w-8 grid place-items-center hover:bg-neutral-900"
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
                                                        className="ml-2 text-xs underline text-neutral-400 hover:text-white"
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
                    <footer className="sticky bottom-0 bg-neutral-950 border-t border-neutral-800 p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-neutral-300">Subtotal</span>
                            <span className="text-lg font-black text-red-400">
                                {fmt(subtotal_cents, currency)}
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <Link
                                href="/cart"
                                onClick={close}
                                className="flex-1 text-center rounded-xl border border-neutral-700 px-4 py-3 text-sm hover:bg-neutral-900"
                            >
                                View cart
                            </Link>

                            <Link
                                href="/checkout"
                                className="relative rounded-xl px-5 py-3 text-sm font-black tracking-wide bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 border border-red-500 disabled:opacity-50"
                                style={{
                                    clipPath: "polygon(6% 0,100% 0,94% 100%,0 100%)",
                                }}
                            >
                                Checkout
                            </Link>
                        </div>

                        <p className="mt-3 text-[11px] text-neutral-500">
                            Shipping & taxes calculated at checkout.
                        </p>
                    </footer>
                </div>
            </aside>
        </>
    );
}
