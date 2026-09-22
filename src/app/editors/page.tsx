// app/editors/page.tsx
import Image from "next/image";
import Link from "next/link";
import { publicImageUrl } from "@/lib/storage";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";
import { logger } from "@/lib/logger";
import { publicCatalogProductQuery } from "@/lib/catalog/public-product-query";
import type { Metadata } from "next";
import TrackItemList from "@/components/TrackItemList";

export const metadata: Metadata = {
    title: "Editor’s Picks: Australian Band Merch",
    description: "Discover hand-picked merch from Australian local and unsigned artists on Merch Tent.",
    alternates: { canonical: "/editors" },
};

export const revalidate = 60;

type ProductRow = {
    id: string;
    title: string | null;
    price_cents: number | null;
    currency: string | null;
    is_published: boolean | null;
    category: string | null;
    created_at?: string | null;
    product_images?: { path: string | null; sort_order: number | null }[] | null;
};

type SortOption = "new" | "plh" | "phl";

export default async function EditorsPicksPage({
    searchParams,
}: {
    searchParams?: Promise<{ min?: string; max?: string; sort?: SortOption }>;
}) {
    const sp = (await searchParams) ?? {};
    const min = sp.min;
    const max = sp.max;
    const sort = (sp.sort as SortOption | undefined) ?? "new";

    const supabase = getPublicServerSupabase();

    // Base: published + editors_choice
    let query = publicCatalogProductQuery(supabase
        .from("products")
        .select(
            `
      id,
      title,
      price_cents,
      currency,
      is_published,
      category,
      created_at,
      product_images ( path, sort_order )
    `
        )
    )
        .eq("editors_choice", true);

    // Optional price filters
    const minNum = isFinite(Number(min)) ? Math.max(0, Math.floor(Number(min))) : undefined;
    const maxNum = isFinite(Number(max)) ? Math.max(0, Math.floor(Number(max))) : undefined;

    if (typeof minNum === "number") query = query.gte("price_cents", minNum * 100);
    if (typeof maxNum === "number") query = query.lte("price_cents", maxNum * 100);

    // Sort (default newest). Always secondary sort by created_at desc.
    if (sort === "plh") {
        query = query.order("price_cents", { ascending: true }).order("created_at", { ascending: false });
    } else if (sort === "phl") {
        query = query.order("price_cents", { ascending: false }).order("created_at", { ascending: false });
    } else {
        query = query.order("created_at", { ascending: false });
    }

    // Cap similar to /new (feel free to adjust)
    query = query.limit(20);

    const { data, error } = await query;

    if (error) {
        logger.error("Editors picks page failed to load products", {
            error: error.message,
        });

        return (
            <main className="mx-auto max-w-7xl bg-[#060606] p-6 text-white">
                <h1 className="text-3xl font-black uppercase">Editor’s Picks</h1>
                <p className="text-red-400 mt-2">Could not load editor’s picks right now.</p>
            </main>
        );
    }

    const products =
        (data as ProductRow[] | null)?.map((p) => {
            const imgs = Array.isArray(p.product_images)
                ? [...p.product_images].sort((a, b) => (a?.sort_order ?? 999) - (b?.sort_order ?? 999))
                : [];
            const primary = publicImageUrl(imgs[0]?.path) ?? "/merch-placeholder.svg";
            const hover = publicImageUrl(imgs[1]?.path) ?? primary;

            return {
                id: String(p.id),
                title: p.title ?? "Untitled",
                price: ((p.price_cents ?? 0) / 100).toFixed(2),
                image: primary,
                hover,
            };
        }) ?? [];

    const count = products.length;

    // build "remove chip" URLs
    function removeParamUrl(key: "min" | "max" | "sort") {
        const qp = new URLSearchParams();
        if (key !== "min" && min) qp.set("min", min);
        if (key !== "max" && max) qp.set("max", max);
        if (key !== "sort" && sort && sort !== "new") qp.set("sort", sort);
        const qs = qp.toString();
        return qs ? `/editors?${qs}` : `/editors`;
    }
    const clearAllUrl = `/editors`;

    return (
        <main className="min-h-screen bg-[#060606] text-white">
            <TrackItemList listName="editors_picks" items={products.map((product) => ({ id: product.id, title: product.title, price_cents: Math.round(Number(product.price) * 100), currency: "AUD" }))} />
            <section className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(180,255,55,0.14),transparent_30%),linear-gradient(180deg,#080808,#111)]">
                <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-[#b6ff3f]">Shop</p>
                    <h1 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-[0.86] md:text-7xl">
                        Editor’s picks.
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-7 text-white/68">
                        Hand-picked products from the scene, with filters for price and fresh drops.
                    </p>
                </div>
            </section>

            <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">

            {/* Top toolbar: count + active chips + sort/price form */}
            <section className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <span className="text-sm text-white/55">
                    {count} result{count === 1 ? "" : "s"}
                    {minNum != null || maxNum != null ? (
                        <span className="ml-2 text-neutral-500">
                            (price
                            {minNum != null ? ` ≥ $${minNum}` : ""}
                            {minNum != null && maxNum != null ? " &" : ""}
                            {maxNum != null ? ` ≤ $${maxNum}` : ""})
                        </span>
                    ) : null}
                </span>

                {/* Active filter chips */}
                <div className="flex flex-wrap items-center gap-2">
                    {min && (
                        <Link
                            href={removeParamUrl("min")}
                            className="border border-white/15 bg-black px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white/70 hover:border-[#b6ff3f]"
                        >
                            Min ${Number(min)} ✕
                        </Link>
                    )}
                    {max && (
                        <Link
                            href={removeParamUrl("max")}
                            className="border border-white/15 bg-black px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white/70 hover:border-[#b6ff3f]"
                        >
                            Max ${Number(max)} ✕
                        </Link>
                    )}
                    {sort && sort !== "new" && (
                        <Link
                            href={removeParamUrl("sort")}
                            className="border border-white/15 bg-black px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white/70 hover:border-[#b6ff3f]"
                        >
                            {sort === "plh" ? "Price ↑" : "Price ↓"} ✕
                        </Link>
                    )}
                    {(min || max || (sort && sort !== "new")) && (
                        <Link
                            href={clearAllUrl}
                            className="text-xs font-black uppercase tracking-[0.14em] text-white/45 underline decoration-red-500 underline-offset-4 hover:text-red-400"
                        >
                            Clear all
                        </Link>
                    )}
                </div>
            </section>

            {/* Filter / Sort form (GET) */}
            <section className="mb-6">
                <form method="GET" action="/editors" className="border border-white/10 bg-black p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div>
                            <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.16em] text-[#b6ff3f]">Min (A$)</label>
                            <input
                                name="min"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                defaultValue={min ?? ""}
                                placeholder="0"
                                className="w-full border border-white/15 bg-[#080808] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#b6ff3f] focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.16em] text-[#b6ff3f]">Max (A$)</label>
                            <input
                                name="max"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                defaultValue={max ?? ""}
                                placeholder="200"
                                className="w-full border border-white/15 bg-[#080808] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#b6ff3f] focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.16em] text-[#b6ff3f]">Sort</label>
                            <select
                                name="sort"
                                defaultValue={sort ?? "new"}
                                className="w-full border border-white/15 bg-[#080808] px-3 py-2 text-sm text-white focus:border-[#b6ff3f] focus:outline-none"
                            >
                                <option value="new">Newest</option>
                                <option value="plh">Price: Low → High</option>
                                <option value="phl">Price: High → Low</option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <button
                            type="submit"
                            className="bg-[#b6ff3f] px-4 py-2 text-sm font-black uppercase text-black"
                        >
                            Apply
                        </button>
                        {(min || max || (sort && sort !== "new")) && (
                            <Link
                                href={clearAllUrl}
                                className="border border-white/15 px-4 py-2 text-sm font-black uppercase text-white hover:border-red-500"
                            >
                                Clear
                            </Link>
                        )}
                    </div>
                </form>
            </section>

            {!products.length ? (
                <div className="border border-white/10 bg-black p-6">
                    <p className="text-white/60">No editor’s picks yet.</p>
                </div>
            ) : (
                <div className="[column-fill:_balance]_columns-2 md:columns-3 lg:columns-4 gap-4">
                    {products.map((p) => (
                        <div key={p.id} className="mb-4 break-inside-avoid">
                            <Link
                                href={`/product/${p.id}`}
                                className="group block overflow-hidden border border-white/10 bg-black"
                            >
                                <div className="relative aspect-[3/4]">
                                    <Image
                                        src={p.image ?? "/merch-placeholder.svg"}
                                        alt={p.title}
                                        fill
                                        sizes="(max-width:768px) 50vw, (max-width:1024px) 33vw, 25vw"
                                            className="object-contain bg-[#f4f1e8] transition-opacity duration-300 group-hover:opacity-0"
                                    />
                                    {p.hover ? (
                                        <Image
                                            src={p.hover}
                                            alt={`${p.title} alt`}
                                            fill
                                            sizes="(max-width:768px) 50vw, (max-width:1024px) 33vw, 25vw"
                                            className="object-contain bg-[#f4f1e8] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                                        />
                                    ) : null}
                                </div>
                                <div className="p-3 md:p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-black uppercase leading-tight md:text-base">{p.title}</p>
                                            <p className="mt-1 text-sm font-black text-[#b6ff3f]">${p.price}</p>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            )}
            </div>
        </main>
    );
}
