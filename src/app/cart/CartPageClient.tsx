"use client";

import { useCart } from "@/components/CartProvider";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { publicProductImageUrlOrSource } from "@/lib/storage";

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

export default function CartPageClient() {
    const router = useRouter();
    const { items, setQty, remove, clear, subtotal_cents, currency } = useCart();

    function goToCheckout() {
        // no POST needed anymore — checkout reads local cart
        router.push("/checkout");
    }

    return (
        <main className="min-h-screen bg-[#060606] text-white">
            <section className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(180,255,55,0.16),transparent_28%),linear-gradient(180deg,#080808,#111)]">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 md:flex-row md:items-end md:justify-between md:px-8 md:py-16">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#b6ff3f]">
                            Checkout
                        </p>
                        <h1 className="mt-3 text-5xl font-black uppercase leading-[0.86] md:text-7xl">
                            Your cart.
                        </h1>
                        <p className="mt-4 max-w-xl text-sm leading-6 text-white/65">
                            Check the drop, pick the quantities, then head through to secure payment.
                        </p>
                    </div>
                    {!!items.length && (
                        <button
                            onClick={clear}
                            className="inline-flex items-center gap-2 border border-white/15 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white/70 hover:border-red-500 hover:text-red-400"
                        >
                            <Trash2 className="h-4 w-4" />
                            Clear cart
                        </button>
                    )}
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
                {items.length === 0 ? (
                    <div className="border border-white/10 bg-[#f4f1e8] p-8 text-black md:p-10">
                        <ShoppingBag className="h-9 w-9 text-red-600" />
                        <h2 className="mt-5 text-4xl font-black uppercase leading-none">
                            Your cart is empty.
                        </h2>
                        <p className="mt-3 max-w-lg text-sm leading-6 text-black/65">
                            Find a band, back a drop, and your order will appear here.
                        </p>
                        <Link href="/" className="mt-6 inline-flex items-center gap-2 bg-[#b6ff3f] px-5 py-3 text-sm font-black uppercase text-black">
                            Continue shopping
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 overflow-hidden border border-white/10 bg-black">
                            <ul className="divide-y divide-white/10">
                                {items.map((item) => {
                                    const lineId = item.sku ?? item.product_id;
                                    const resolvedImg = publicProductImageUrlOrSource(item.image_path);
                                    const hasVariantLine = item.sku || item.color_label || item.size;

                                    return (
                                        <li
                                            key={lineId}
                                            className="p-4 md:p-5 flex items-center gap-4 md:gap-6"
                                        >
                                            <div className="relative h-24 w-24 md:h-28 md:w-28 shrink-0 overflow-hidden border border-white/10 bg-[#f4f1e8]">
                                                {resolvedImg ? (
                                                    <Image
                                                        src={resolvedImg}
                                                        alt={item.title}
                                                        fill
                                                        sizes="96px"
                                                        className="object-contain p-2"
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
                                                        <p className="font-black uppercase leading-tight text-white">{item.title}</p>
                                                        <p className="mt-1 text-sm font-black text-[#b6ff3f]">
                                                            {fmt(item.price_cents, item.currency)}
                                                        </p>

                                                        {hasVariantLine ? (
                                                            <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-white/45 space-x-2">
                                                                {item.sku ? (
                                                                    <span className="inline-block border border-white/10 bg-white/5 px-1.5 py-0.5">
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
                                                        className="text-xs font-black uppercase tracking-[0.16em] text-white/45 underline decoration-red-500 underline-offset-4 hover:text-red-400"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>

                                                {/* qty row */}
                                                <div className="mt-3 flex items-center gap-3">
                                                    <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Qty</span>
                                                    <div className="inline-flex items-center overflow-hidden border border-white/15">
                                                        <button
                                                            type="button"
                                                            aria-label="Decrease quantity"
                                                            className="h-9 w-9 grid place-items-center hover:bg-white/10"
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
                                                            className="h-9 w-14 bg-black text-center text-sm outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            aria-label="Increase quantity"
                                                            className="h-9 w-9 grid place-items-center hover:bg-white/10"
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
                            <div className="p-4 border-t border-white/10 flex items-center justify-between lg:hidden">
                                <Link href="/" className="text-sm font-black uppercase text-[#b6ff3f]">
                                    Continue shopping
                                </Link>
                                <button onClick={clear} className="text-xs font-black uppercase tracking-[0.16em] text-white/45 underline">
                                    Clear cart
                                </button>
                            </div>
                        </div>

                        {/* Summary */}
                        <aside className="lg:sticky lg:top-6 h-max">
                            <div className="border border-white/10 bg-[#f4f1e8] p-5 md:p-6 text-black">
                                <h2 className="text-xs font-black uppercase tracking-[0.28em] text-red-600">
                                    Summary
                                </h2>

                                <div className="mt-4 space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-black/60">Subtotal</span>
                                        <span className="text-2xl font-black text-black">
                                            {fmt(subtotal_cents, currency)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-black/55">Shipping</span>
                                        <span className="text-black/55">Calculated at checkout</span>
                                    </div>
                                </div>

                                <button
                                    onClick={goToCheckout}
                                    disabled={items.length === 0}
                                    className="mt-5 w-full px-5 py-4 text-sm font-black uppercase tracking-wide bg-[#b6ff3f] text-black disabled:opacity-50"
                                >
                                    Checkout <ArrowRight className="ml-2 inline h-4 w-4" />
                                </button>

                                <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-black/45">
                                    Taxes calculated at checkout.
                                </p>
                            </div>

                            <div className="mt-4 text-center">
                                <Link href="/" className="text-sm font-black uppercase text-white/70 underline decoration-red-500 underline-offset-4 hover:text-red-400">
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
