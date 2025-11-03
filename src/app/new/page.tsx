// app/new/page.tsx
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

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

function publicImageUrl(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${encodeURIComponent(
        path
    )}`;
}

export default async function NewThisWeekPage({
    searchParams,
}: {
    searchParams?: Promise<{ min?: string; max?: string; sort?: SortOption }>;
}) {
    const sp = (await searchParams) ?? {};
    const min = sp.min;
    const max = sp.max;
    const sort = (sp.sort as SortOption | undefined) ?? "new";

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || !anon) {
        return (
            <main className="p-6 max-w-7xl mx-auto">
                <h1 className="text-2xl font-bold">New This Week</h1>
                <p className="text-red-400 mt-2">
                    Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.
                </p>
            </main>
        );
    }

    const supabase = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    // Base: newest published products (limit 20)
    let query = supabase
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
        .eq("is_published", true);

    // Optional price filters
    const minNum = isFinite(Number(min)) ? Math.max(0, Math.floor(Number(min))) : undefined;
    const maxNum = isFinite(Number(max)) ? Math.max(0, Math.floor(Number(max))) : undefined;

    if (typeof minNum === "number") {
        query = query.gte("price_cents", minNum * 100);
    }
    if (typeof maxNum === "number") {
        query = query.lte("price_cents", maxNum * 100);
    }

    // Sort (default newest). Always secondary sort by created_at desc.
    if (sort === "plh") {
        query = query.order("price_cents", { ascending: true }).order("created_at", { ascending: false });
    } else if (sort === "phl") {
        query = query.order("price_cents", { ascending: false }).order("created_at", { ascending: false });
    } else {
        query = query.order("created_at", { ascending: false });
    }

    // Cap to 20
    query = query.limit(20);

    const { data, error } = await query;

    if (error) {
        return (
            <main className="p-6 max-w-7xl mx-auto">
                <h1 className="text-2xl font-bold">New This Week</h1>
                <p className="text-red-400 mt-2">Error loading products: {error.message}</p>
            </main>
        );
    }

    const products =
        (data as ProductRow[] | null)?.map((p) => {
            const imgs = Array.isArray(p.product_images)
                ? [...p.product_images].sort((a, b) => (a?.sort_order ?? 999) - (b?.sort_order ?? 999))
                : [];
            const primary = publicImageUrl(imgs[0]?.path) ?? "https://picsum.photos/seed/fallback1/900/1200";
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

    // helpers to build "remove chip" URLs (same UX as category)
    function removeParamUrl(key: "min" | "max" | "sort") {
        const qp = new URLSearchParams();
        if (key !== "min" && min) qp.set("min", min);
        if (key !== "max" && max) qp.set("max", max);
        if (key !== "sort" && sort && sort !== "new") qp.set("sort", sort);
        const qs = qp.toString();
        return qs ? `/new?${qs}` : `/new`;
    }
    const clearAllUrl = `/new`;

    return (
        <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
            {/* Breadcrumbs */}
            <nav className="text-xs text-neutral-400 mb-3">
                <Link href="/" className="hover:underline">Home</Link> /{" "}
                <Link href="/#grid" className="hover:underline">Shop</Link> /{" "}
                <span className="text-neutral-200">New This Week</span>
            </nav>

            {/* angled banner vibe */}
            <section className="relative py-0 mb-8">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-7xl mx-auto px-4 py-6 md:py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">Shop</p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">New This Week</h1>
                        </div>
                        <span className="text-xs bg-neutral-900 text-white px-2 py-1 rounded rotate-[-2deg]">NEW</span>
                    </div>
                </div>
            </section>

            {/* Top toolbar: count + active chips + sort/price form */}
            <section className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <span className="text-sm text-neutral-400">
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
                            className="text-xs rounded-full border border-neutral-700 bg-neutral-900 text-neutral-200 px-2 py-1 hover:bg-neutral-800"
                        >
                            Min ${Number(min)} ✕
                        </Link>
                    )}
                    {max && (
                        <Link
                            href={removeParamUrl("max")}
                            className="text-xs rounded-full border border-neutral-700 bg-neutral-900 text-neutral-200 px-2 py-1 hover:bg-neutral-800"
                        >
                            Max ${Number(max)} ✕
                        </Link>
                    )}
                    {sort && sort !== "new" && (
                        <Link
                            href={removeParamUrl("sort")}
                            className="text-xs rounded-full border border-neutral-700 bg-neutral-900 text-neutral-200 px-2 py-1 hover:bg-neutral-800"
                        >
                            {sort === "plh" ? "Price ↑" : "Price ↓"} ✕
                        </Link>
                    )}
                    {(min || max || (sort && sort !== "new")) && (
                        <Link href={clearAllUrl} className="text-xs underline text-neutral-400 hover:text-neutral-200">
                            Clear all
                        </Link>
                    )}
                </div>
            </section>

            {/* Filter / Sort form (GET) */}
            <section className="mb-6">
                <form method="GET" action="/new" className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div>
                            <label className="block text-[11px] text-neutral-400 mb-1">Min (A$)</label>
                            <input
                                name="min"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                defaultValue={min ?? ""}
                                placeholder="0"
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 text-neutral-200 px-3 py-2 text-sm placeholder:text-neutral-600"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] text-neutral-400 mb-1">Max (A$)</label>
                            <input
                                name="max"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                defaultValue={max ?? ""}
                                placeholder="200"
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 text-neutral-200 px-3 py-2 text-sm placeholder:text-neutral-600"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] text-neutral-400 mb-1">Sort</label>
                            <select
                                name="sort"
                                defaultValue={sort ?? "new"}
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 text-neutral-200 px-3 py-2 text-sm"
                            >
                                <option value="new">Newest</option>
                                <option value="plh">Price: Low → High</option>
                                <option value="phl">Price: High → Low</option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <button type="submit" className="rounded-xl px-3 py-2 bg-red-600 text-white text-sm hover:bg-red-500">
                            Apply
                        </button>
                        {(min || max || (sort && sort !== "new")) && (
                            <Link
                                href={clearAllUrl}
                                className="rounded-xl px-3 py-2 border border-neutral-700 text-neutral-200 text-sm hover:bg-neutral-900"
                            >
                                Clear
                            </Link>
                        )}
                    </div>
                </form>
            </section>

            {!products.length ? (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                    <p className="text-neutral-300">No new products yet.</p>
                </div>
            ) : (
                <div className="[column-fill:_balance]_columns-2 md:columns-3 lg:columns-4 gap-4">
                    {products.map((p, i) => (
                        <div key={p.id} className="mb-4 break-inside-avoid">
                            <a
                                href={`/product/${p.id}`}
                                className="group block rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900"
                                style={{
                                    clipPath: i % 4 === 0 ? "polygon(6% 0,100% 0,94% 100%,0 100%)" : undefined,
                                }}
                            >
                                <div className="relative aspect-[3/4]">
                                    <img
                                        src={p.image!}
                                        alt={p.title}
                                        className="object-cover absolute inset-0 w-full h-full transition-opacity duration-300 group-hover:opacity-0"
                                    />
                                    <img
                                        src={p.hover!}
                                        alt={`${p.title} alt`}
                                        className="object-cover absolute inset-0 w-full h-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                                    />
                                </div>
                                <div className="p-3 md:p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm md:text-base">{p.title}</p>
                                            <p className="text-sm text-neutral-400">${p.price}</p>
                                        </div>
                                    </div>
                                </div>
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
