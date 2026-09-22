// app/checkout/CheckoutSummaryClient.tsx
"use client";

import { useCart } from "@/components/CartProvider";
import { publicProductImageUrlOrSource } from "@/lib/storage";
import { checkoutShippingAmountCents, type ShippingMethodId } from "@/lib/shipping-methods";
import Image from "next/image";
import Link from "next/link";

export default function CheckoutSummaryClient({
    shippingMethod,
    isSubmitting,
    useMerchCredits,
    merchCreditBalance,
    shippingCountry,
}: {
    shippingMethod: ShippingMethodId;
    isSubmitting: boolean;
    useMerchCredits: boolean;
    merchCreditBalance: number;
    shippingCountry: string;
}) {
    const { items, subtotal_cents, currency } = useCart();

    const shippingCents = checkoutShippingAmountCents(
        shippingMethod,
        shippingCountry,
        items.length,
        items.reduce((sum, item) => sum + item.qty, 0)
    );
    const merchCreditDiscountCents =
        useMerchCredits && merchCreditBalance >= 20 && items.length > 0
            ? Math.min(...items.map((item) => item.price_cents))
            : 0;
    const totalCents = Math.max(subtotal_cents + shippingCents - merchCreditDiscountCents, 0);

    return (
        <div className="sticky top-4 space-y-4 border border-white/10 bg-[#f4f1e8] p-5 text-black">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-red-600">
                Order summary
            </p>

            <div className="space-y-3">
                {items.length === 0 ? (
                    <p className="text-sm text-black/55">Your cart is empty.</p>
                ) : (
                    items.map((item) => {
                        const lineId = item.sku ?? item.product_id;
                        const displayImg = publicProductImageUrlOrSource(item.image_path);
                        const lineTotal = (item.price_cents * item.qty) / 100;

                        return (
                            <div
                                key={lineId}
                                className="flex items-center justify-between gap-3"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-16 w-16 shrink-0 overflow-hidden border border-black/10 bg-white">
                                        {displayImg ? (
                                            <Image
                                                src={displayImg}
                                                alt={item.title}
                                                width={64}
                                                height={64}
                                                className="h-full w-full object-contain p-1"
                                            />
                                        ) : (
                                            <div className="h-full w-full grid place-items-center text-[10px] text-neutral-500">
                                                No image
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-black uppercase leading-tight line-clamp-2 break-words">{item.title}</p>
                                        <p className="text-xs text-black/45">
                                            Qty {item.qty}
                                            {item.color_label ? ` • ${item.color_label}` : ""}
                                            {item.size ? ` • ${item.size}` : ""}
                                        </p>
                                        {item.sku ? (
                                            <p className="text-[10px] uppercase tracking-[0.12em] text-black/35 mt-0.5">
                                                {item.sku}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                                <p className="text-sm font-black text-black">
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
            <Link href="/cart" className="text-xs font-black uppercase tracking-[0.16em] text-black/55 underline decoration-red-500 underline-offset-4">
                Edit cart
            </Link>
            <p className="text-[11px] uppercase tracking-[0.12em] text-black/45 mt-2">
                Orders are printed on demand – production begins immediately after payment
            </p>
            <button
                type="submit"
                form="checkout-form"
                disabled={isSubmitting || items.length === 0}
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 bg-[#b6ff3f] font-black uppercase text-black disabled:opacity-60"
            >
                {isSubmitting ? (
                    <>
                        <span className="h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                        Redirecting…
                    </>
                ) : (
                    <>Continue to payment</>
                )}
            </button>


            {/* totals */}
            <div className="border-t border-black/10 pt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-black/55">Subtotal</span>
                    <span className="text-black">
                        {(subtotal_cents / 100).toLocaleString("en-AU", {
                            style: "currency",
                            currency: currency || "AUD",
                        })}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-black/55">
                        Shipping{" "}
                        <span className="text-[10px] text-black/35 uppercase">
                            ({shippingMethod})
                        </span>
                    </span>
                    <span className="text-black">
                        {(shippingCents / 100).toLocaleString("en-AU", {
                            style: "currency",
                            currency: currency || "AUD",
                        })}
                    </span>
                </div>
                {merchCreditDiscountCents > 0 ? (
                    <div className="flex items-center justify-between">
                        <span className="text-black/55">Merch credits</span>
                        <span className="font-black text-[#477a00]">
                            -
                            {(merchCreditDiscountCents / 100).toLocaleString("en-AU", {
                                style: "currency",
                                currency: currency || "AUD",
                            })}
                        </span>
                    </div>
                ) : null}
                <div className="flex items-center justify-between text-base">
                    <span className="font-semibold text-black">Total</span>
                    <span className="font-black text-black">
                        {(totalCents / 100).toLocaleString("en-AU", {
                            style: "currency",
                            currency: currency || "AUD",
                        })}
                    </span>
                </div>
            </div>

            <p className="text-[11px] uppercase tracking-[0.12em] text-black/45">
                You’ll see final totals on Stripe too.
            </p>
        </div>
    );
}
