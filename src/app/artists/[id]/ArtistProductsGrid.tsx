// app/artists/[id]/ArtistProductsGrid.tsx
"use client";

import { ProductCard, type Product as CardProduct } from "@/components/shop/ProductCard";

export type ArtistGridProduct = CardProduct; // reuse the ProductCard's shape

export default function ArtistProductsGrid({ products }: { products: ArtistGridProduct[] }) {
    if (!products.length) {
        return (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                <p className="text-neutral-300">No products yet.</p>
            </div>
        );
    }

    return (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, idx) => (
                <li key={p.id}>
                    <ProductCard p={p} theme="light" clipped={idx % 2 === 0} />
                </li>
            ))}
        </ul>
    );
}
