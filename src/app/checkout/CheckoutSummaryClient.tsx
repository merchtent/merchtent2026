// app/checkout/CheckoutSummaryClient.tsx
"use client";

import { useCart } from "@/components/CartProvider";

const SHIPPING_OPTIONS = {
    standard: 1000,
    express: 2000,
} as const;

function publicImageUrl(path: string) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${encodeURIComponent(
        path
    )}`;
}

function resolveCartImage(src?: string | null): string | null {
    if (!src) return null;
    if (src.startsWith("http://") || src.startsWith("https://")) return src;
    return publicImageUrl(src);
}

export default function CheckoutSummaryClient({
    shippingMethod,
}: {
    shippingMethod: "standard" | "express";
}) {
    const { items, subtotal_cents, currency } = useCart();

    const shippingCents = SHIPPING_OPTIONS[shippingMethod] ?? 0;
    const totalCents = subtotal_cents + shippingCents;

    return (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-4">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
                Order summary
            </p>
            <div className="space-y-3">
                {items.length === 0 ? (
                    <p className="text-sm text-neutral-400">Your cart is empty.</p>
                ) : (
                    items.map((item) => {
                        const lineId = item.sku ?? item.product_id;
                        const displayImg = resolveCartImage(item.image_path);
                        const lineTotal = (item.price_cents * item.qty) / 100;

                        return (
                            <div
                                key={lineId}
                                className="flex items-center justify-between gap-3"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-12 w-12 rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden shrink-0">
                                        {displayImg ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={displayImg}
                                                alt={item.title}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-full w-full grid place-items-center text-[10px] text-neutral-500">
                                                No image
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm line-clamp-2 break-words">{item.title}</p>
                                        <p className="text-xs text-neutral-500">
                                            Qty {item.qty}
                                            {item.color_label ? ` • ${item.color_label}` : ""}
                                            {item.size ? ` • ${item.size}` : ""}
                                        </p>
                                        {item.sku ? (
                                            <p className="text-[10px] text-neutral-500 mt-0.5">
                                                {item.sku}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                                <p className="text-sm text-neutral-200">
                                    {lineTotal.toLocaleString("en-AU", {
                                        style: "currency",
                                        currency: item.currency || "AUD",
                                    })}
                                </p>
                            </div>
                        );
                    })
                )}
            </div>

            {/* totals */}
            <div className="border-t border-neutral-800 pt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Subtotal</span>
                    <span className="text-neutral-100">
                        {(subtotal_cents / 100).toLocaleString("en-AU", {
                            style: "currency",
                            currency: currency || "AUD",
                        })}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-neutral-400">
                        Shipping{" "}
                        <span className="text-[10px] text-neutral-500 uppercase">
                            ({shippingMethod})
                        </span>
                    </span>
                    <span className="text-neutral-100">
                        {(shippingCents / 100).toLocaleString("en-AU", {
                            style: "currency",
                            currency: currency || "AUD",
                        })}
                    </span>
                </div>
                <div className="flex items-center justify-between text-base">
                    <span className="text-neutral-200 font-semibold">Total</span>
                    <span className="text-neutral-50 font-bold">
                        {(totalCents / 100).toLocaleString("en-AU", {
                            style: "currency",
                            currency: currency || "AUD",
                        })}
                    </span>
                </div>
            </div>

            <p className="text-[11px] text-neutral-500">
                You’ll see final totals on Stripe too.
            </p>
        </div>
    );
}
