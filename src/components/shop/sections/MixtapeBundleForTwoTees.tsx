"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/CartProvider";

type ProductColorVariant = {
    hex: string;
    label?: string | null;
    front?: string | null;
    back?: string | null;
};

type Product = {
    id: string;
    title: string;
    price: number;
    image: string;
    hover?: string;
    colors?: ProductColorVariant[];
    sizes?: string[];
    kind?: string;
};

type Picked = {
    productId: string;
    title: string;
    image: string;
    color: ProductColorVariant | null;
    size: string | null;
};

export default function BundleBuilderForTwoTees() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(8);

    const [picked, setPicked] = useState<Picked[]>([]);

    const [activeProductId, setActiveProductId] = useState<string | null>(null);

    // ✅ FIX: per-product variant state
    const [variantState, setVariantState] = useState<{
        [productId: string]: { colorIdx: number; size: string };
    }>({});

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const res = await fetch("/api/products/tees", { cache: "no-store" });
                const json = await res.json();

                if (mounted) {
                    setProducts(Array.isArray(json.products) ? json.products : []);
                }
            } catch {
                if (mounted) setProducts([]);
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => { mounted = false; };
    }, []);

    const tees = products.filter(p => p.kind === "tee");
    const visibleTees = tees.slice(0, visible);

    const count = picked.length;

    const sum = picked.reduce((acc, item) => {
        const p = products.find(x => x.id === item.productId);
        return acc + (p?.price ?? 0);
    }, 0);

    const price = count === 2 ? 70 : sum;
    const savings = count === 2 ? sum - 70 : 0;

    function getVariant(p: Product) {
        return variantState[p.id] || {
            colorIdx: 0,
            size: p.sizes?.[0] || "M",
        };
    }

    function addToBundle(p: Product) {
        if (picked.length >= 2) return;

        const vs = getVariant(p);
        const color = p.colors?.[vs.colorIdx] ?? null;

        setPicked(prev => [
            ...prev,
            {
                productId: p.id,
                title: p.title,
                image: color?.front || p.image,
                color,
                size: vs.size,
            },
        ]);
    }

    function remove(i: number) {
        setPicked(prev => prev.filter((_, idx) => idx !== i));
    }

    if (loading) {
        return (
            <div className="flex gap-4 overflow-x-auto">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="min-w-[180px] aspect-[3/4] bg-neutral-800 rounded-2xl animate-pulse" />
                ))}
            </div>
        );
    }

    const { add, open } = useCart();

    function handleAddBundle() {
        if (picked.length !== 2) return;

        picked.forEach((item) => {
            const sku = `${item.productId}-${(item.size || "nosize").toLowerCase()}-${(
                item.color?.hex || "nocolor"
            ).toLowerCase()}`;

            add(
                {
                    product_id: item.productId,
                    title: item.title + " (Bundle)",
                    price_cents: 3500, // 👈 $35 fixed
                    currency: "AUD",
                    image_path: item.image,
                    sku,
                    color_label: item.color?.label ?? item.color?.hex ?? null,
                    size: item.size ?? null,
                },
                1
            );
        });

        open();
    }

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 space-y-6 mb-4">

            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-xs uppercase text-neutral-400">Build your bundle</p>
                    <h4 className="text-xl font-bold mt-1">
                        Pick any 2 tees for <span className="text-red-500">$70</span>
                    </h4>
                    <p className="text-sm text-neutral-400 mb-1">
                        Most tees are $39–$45 — save up to $36
                    </p>
                    <Button
                        disabled={count !== 2}
                        onClick={handleAddBundle}
                        className="w-full bg-red-600 hover:bg-red-700 text-white text-xs mt-2"
                    >
                        Add bundle to cart
                    </Button>
                </div>

                <div className="text-right">
                    <p className="text-xs text-neutral-400">Selected</p>
                    <p className="font-bold">{count}/2</p>
                </div>

            </div>

            {/* SELECTED */}
            {picked.length > 0 && (
                <div className="flex gap-3">
                    {picked.map((item, i) => (
                        <div key={i} className="text-center text-xs">
                            <div className="w-14 h-20 relative rounded overflow-hidden border border-neutral-700">
                                <Image src={item.image} alt="" fill className="object-cover" />
                            </div>
                            <p>{item.size}</p>
                            {item.color && (
                                <div
                                    className="w-3 h-3 rounded-full mx-auto"
                                    style={{ backgroundColor: item.color.hex }}
                                />
                            )}
                            <button
                                onClick={() => remove(i)}
                                className="text-red-500 text-[10px]"
                            >
                                remove
                            </button>
                        </div>
                    ))}

                </div>
            )}




            {/* SLIDER */}
            <div className="flex gap-4 overflow-x-auto snap-x">
                {visibleTees.map((p) => {
                    const active = activeProductId === p.id;
                    const vs = getVariant(p);
                    const color = p.colors?.[vs.colorIdx];
                    const front = color?.front || p.image;

                    return (
                        <div key={p.id} className="min-w-[200px] snap-start space-y-2">

                            {/* IMAGE */}
                            <div
                                onClick={() => {
                                    setActiveProductId(p.id);

                                    setVariantState(prev => ({
                                        ...prev,
                                        [p.id]: prev[p.id] || {
                                            colorIdx: 0,
                                            size: p.sizes?.[0] || "M",
                                        },
                                    }));
                                }}
                                className={`relative aspect-[3/4] rounded-xl overflow-hidden border cursor-pointer ${active ? "border-red-500" : "border-neutral-800"
                                    }`}
                            >
                                <Image src={front} alt={p.title} fill className="object-cover" />
                            </div>

                            <p className="text-sm font-semibold">{p.title}</p>
                            <p className="text-xs text-neutral-400">${p.price}</p>

                            {/* VARIANTS */}
                            {active && (
                                <div className="space-y-2">

                                    {/* COLORS */}
                                    {p.colors && (
                                        <div className="flex gap-1 flex-wrap">
                                            {p.colors.map((c, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() =>
                                                        setVariantState(prev => ({
                                                            ...prev,
                                                            [p.id]: {
                                                                ...getVariant(p),
                                                                colorIdx: idx,
                                                            },
                                                        }))
                                                    }
                                                    className={`w-5 h-5 rounded-full border ${vs.colorIdx === idx
                                                        ? "ring-2 ring-white"
                                                        : ""
                                                        }`}
                                                    style={{ backgroundColor: c.hex }}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* SIZES */}
                                    <div className="flex flex-wrap gap-1">
                                        {(p.sizes ?? ["S", "M", "L", "XL"]).map(sz => (
                                            <button
                                                key={sz}
                                                onClick={() =>
                                                    setVariantState(prev => ({
                                                        ...prev,
                                                        [p.id]: {
                                                            ...getVariant(p),
                                                            size: sz,
                                                        },
                                                    }))
                                                }
                                                className={`text-xs px-2 py-1 border rounded ${vs.size === sz
                                                    ? "bg-white text-black"
                                                    : "border-neutral-700"
                                                    }`}
                                            >
                                                {sz}
                                            </button>
                                        ))}
                                    </div>

                                    {/* ADD */}
                                    <Button
                                        disabled={picked.length >= 3}
                                        onClick={() => addToBundle(p)}
                                        className="w-full bg-red-600 hover:bg-red-700 text-white text-xs"
                                    >
                                        Add to bundle
                                    </Button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* LOAD MORE */}
            {visible < tees.length && (
                <div className="text-center">
                    <Button onClick={() => setVisible(v => v + 4)}>
                        Load more
                    </Button>
                </div>
            )}

            {/* PRICING */}
            <div className="flex justify-between items-center border-t border-neutral-800 pt-4">
                <div>
                    <p className="text-xs text-neutral-400">Total</p>
                    <div className="flex items-center gap-2">
                        {count === 3 && (
                            <span className="line-through text-neutral-500">
                                ${sum.toFixed(0)}
                            </span>
                        )}
                        <span className="text-xl font-bold">${price.toFixed(0)}</span>
                        {savings > 0 && (
                            <span className="text-xs bg-green-600 px-2 py-1 rounded">
                                Save ${savings.toFixed(0)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}