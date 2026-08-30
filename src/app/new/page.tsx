import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
    ArrowRight,
    BadgePercent,
    CalendarDays,
    Filter,
    Flame,
    PackageCheck,
    SlidersHorizontal,
} from "lucide-react";
import { publicImageUrl } from "@/lib/storage";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";
import { logger } from "@/lib/logger";
import { publicCatalogProductQuery } from "@/lib/catalog/public-product-query";

export const revalidate = 60;

type ProductImageRow = {
    path: string | null;
    sort_order: number | null;
};

type ProductArtistRow = {
    display_name?: string | null;
    slug?: string | null;
};

type ProductRow = {
    id: string;
    title: string | null;
    slug?: string | null;
    price_cents: number | null;
    currency: string | null;
    category: string | null;
    created_at?: string | null;
    product_images?: ProductImageRow[] | null;
    artist?: ProductArtistRow | null;
};

type SortOption = "new" | "plh" | "phl";

function fmtMoney(cents: number | null, currency = "AUD") {
    return new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
    }).format((cents ?? 0) / 100);
}

function formatDropDate(value?: string | null) {
    if (!value) return "Fresh drop";
    return new Date(value).toLocaleDateString("en-AU", {
        month: "short",
        day: "numeric",
    });
}

function removeParamUrl({
    key,
    min,
    max,
    sort,
}: {
    key: "min" | "max" | "sort";
    min?: string;
    max?: string;
    sort: SortOption;
}) {
    const qp = new URLSearchParams();
    if (key !== "min" && min) qp.set("min", min);
    if (key !== "max" && max) qp.set("max", max);
    if (key !== "sort" && sort !== "new") qp.set("sort", sort);
    const qs = qp.toString();
    return qs ? `/new?${qs}` : "/new";
}

export default async function NewThisWeekPage({
    searchParams,
}: {
    searchParams?: Promise<{ min?: string; max?: string; sort?: SortOption; q?: string }>;
}) {
    const sp = (await searchParams) ?? {};
    const min = sp.min;
    const max = sp.max;
    const sort = (sp.sort as SortOption | undefined) ?? "new";
    const search = String(sp.q ?? "").trim();

    const supabase = getPublicServerSupabase();

    let query = publicCatalogProductQuery(
        supabase
            .from("products")
            .select(
                `
                    id,
                    title,
                    slug,
                    price_cents,
                    currency,
                    category,
                    created_at,
                    product_images ( path, sort_order ),
                    artist:artists (
                        display_name,
                        slug
                    )
                `
            )
    );

    const minNum = isFinite(Number(min)) ? Math.max(0, Math.floor(Number(min))) : undefined;
    const maxNum = isFinite(Number(max)) ? Math.max(0, Math.floor(Number(max))) : undefined;

    if (typeof minNum === "number") query = query.gte("price_cents", minNum * 100);
    if (typeof maxNum === "number") query = query.lte("price_cents", maxNum * 100);

    if (sort === "plh") {
        query = query.order("price_cents", { ascending: true }).order("created_at", { ascending: false });
    } else if (sort === "phl") {
        query = query.order("price_cents", { ascending: false }).order("created_at", { ascending: false });
    } else {
        query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query.limit(search ? 80 : 24);

    if (error) {
        logger.error("New products page failed to load products", {
            error: error.message,
        });

        return (
            <main className="min-h-screen bg-black text-white">
                <section className="mx-auto max-w-7xl px-4 py-12 md:px-6 lg:px-8">
                    <div className="border border-red-500/40 bg-red-950/20 p-6 text-red-100">
                        <p className="text-sm font-black uppercase tracking-[0.2em]">
                            Could not load new products right now.
                        </p>
                    </div>
                </section>
            </main>
        );
    }

    const allProducts =
        (data as ProductRow[] | null)?.map((p) => {
            const imgs = Array.isArray(p.product_images)
                ? [...p.product_images].sort((a, b) => (a?.sort_order ?? 999) - (b?.sort_order ?? 999))
                : [];
            const primary = publicImageUrl(imgs[0]?.path) ?? "/merch-placeholder.svg";
            const hover = publicImageUrl(imgs[1]?.path) ?? primary;

            return {
                id: String(p.id),
                slug: p.slug ?? String(p.id),
                title: p.title ?? "Untitled product",
                price: fmtMoney(p.price_cents, p.currency ?? "AUD"),
                image: primary,
                hover,
                category: p.category?.replace(/-/g, " ") ?? "Merch",
                artist: p.artist?.display_name ?? "Merch Tent artist",
                artistSlug: p.artist?.slug ?? null,
                createdAt: p.created_at ?? null,
            };
        }) ?? [];
    const normalizedSearch = search.toLowerCase();
    const products = normalizedSearch
        ? allProducts.filter((product) =>
            [product.title, product.artist, product.category]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(normalizedSearch))
        )
        : allProducts;

    const count = products.length;
    const clearAllUrl = "/new";
    const hasFilters = Boolean(min || max || sort !== "new");
    const heroProducts = products.slice(0, 3);

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="relative overflow-hidden border-b border-neutral-800 bg-black">
                <div className="absolute inset-0">
                    <Image
                        src="https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=2200&q=80"
                        alt=""
                        fill
                        sizes="100vw"
                        priority
                        className="object-cover opacity-48"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/82 to-black/45" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_20%,rgba(190,242,100,0.18),transparent_24%),radial-gradient(circle_at_20%_25%,rgba(239,0,0,0.22),transparent_28%),linear-gradient(115deg,rgba(255,255,255,0.06)_0_1px,transparent_1px_28px)] opacity-60" />
                </div>

                <div className="relative mx-auto grid max-w-[1680px] gap-8 px-4 py-12 md:grid-cols-[1fr_0.9fr] md:px-8 md:py-16">
                    <div className="flex flex-col justify-between">
                        <nav className="text-xs font-black uppercase tracking-[0.18em] text-neutral-400">
                            <Link href="/" className="hover:text-white">
                                Home
                            </Link>
                            <span className="mx-2 text-red-500">/</span>
                            <span className="text-white">New drops</span>
                        </nav>

                        <div className="mt-10">
                            <p className="inline-flex items-center gap-2 bg-lime-300 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-black">
                                <Flame className="h-4 w-4" />
                                Fresh from the table
                            </p>
                            <h1 className="mt-5 max-w-5xl text-6xl font-black uppercase leading-[0.86] tracking-tight md:text-8xl xl:text-9xl">
                                New drops live now.
                            </h1>
                            <p className="mt-6 max-w-2xl text-base leading-7 text-neutral-200 md:text-lg">
                                The newest tees, hoodies, vinyl, posters and scene pieces from artists building their table
                                on Merch Tent.
                            </p>
                        </div>

                        <div className="mt-8 grid gap-px bg-neutral-800 sm:grid-cols-3">
                            <HeroMetric icon={<PackageCheck className="h-4 w-4" />} label="Low-waste print" value="Made after sale" />
                            <HeroMetric icon={<BadgePercent className="h-4 w-4" />} label="Fan credits" value="Earn on buys" />
                            <HeroMetric icon={<CalendarDays className="h-4 w-4" />} label="Freshness" value={`${count} live picks`} />
                        </div>
                    </div>

                    <div className="border border-neutral-800 bg-black/75 p-3 shadow-[18px_18px_0_rgba(190,242,100,0.08)] backdrop-blur">
                        <div className="bg-[#f2f0ea] p-5 text-black">
                            <div className="flex items-center justify-between gap-4">
                                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-600">
                                    Counter picks
                                </p>
                                <span className="bg-lime-300 px-2 py-1 text-[10px] font-black uppercase text-black">
                                    New
                                </span>
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-px bg-black/15">
                                {heroProducts.length ? (
                                    heroProducts.map((product) => (
                                        <Link key={product.id} href={`/product/${product.slug}`} className="group block bg-white p-2">
                                            <div className="relative aspect-[3/4] overflow-hidden bg-[#f7f4ec]">
                                                <Image
                                                    src={product.image}
                                                    alt={product.title}
                                                    fill
                                                    sizes="(max-width: 768px) 28vw, 16vw"
                                                    className="object-contain p-3 transition-transform duration-500 group-hover:scale-105"
                                                />
                                            </div>
                                            <p className="mt-2 line-clamp-2 text-xs font-black leading-tight text-black">
                                                {product.title}
                                            </p>
                                            <p className="mt-1 text-xs font-black text-lime-700">{product.price}</p>
                                        </Link>
                                    ))
                                ) : (
                                    Array.from({ length: 3 }).map((_, index) => (
                                        <div key={index} className="aspect-[3/4] bg-neutral-900" />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-b border-black/15 bg-[#f2f0ea] text-black">
                <div className="mx-auto max-w-[1680px] px-4 py-8 md:px-8 md:py-10">
                    <form method="GET" action="/new" className="grid gap-3 border border-black/15 bg-white p-4 md:grid-cols-[1fr_1fr_1.2fr_auto] md:items-end">
                        {search ? <input type="hidden" name="q" value={search} /> : null}
                        <FilterField label="Min price">
                            <input
                                name="min"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                defaultValue={min ?? ""}
                                placeholder="0"
                                className="w-full border border-black/20 bg-[#f2f0ea] px-3 py-3 text-sm font-black text-black outline-none placeholder:text-neutral-400 focus:border-lime-500"
                            />
                        </FilterField>
                        <FilterField label="Max price">
                            <input
                                name="max"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                defaultValue={max ?? ""}
                                placeholder="200"
                                className="w-full border border-black/20 bg-[#f2f0ea] px-3 py-3 text-sm font-black text-black outline-none placeholder:text-neutral-400 focus:border-lime-500"
                            />
                        </FilterField>
                        <FilterField label="Sort">
                            <select
                                name="sort"
                                defaultValue={sort}
                                className="w-full border border-black/20 bg-[#f2f0ea] px-3 py-3 text-sm font-black text-black outline-none focus:border-lime-500"
                            >
                                <option value="new">Newest first</option>
                                <option value="plh">Price: Low to high</option>
                                <option value="phl">Price: High to low</option>
                            </select>
                        </FilterField>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="inline-flex items-center gap-2 bg-lime-300 px-5 py-3 text-sm font-black uppercase tracking-wide text-black hover:bg-lime-200"
                            >
                                Apply <SlidersHorizontal className="h-4 w-4" />
                            </button>
                            {hasFilters ? (
                                <Link
                                    href={clearAllUrl}
                                    className="inline-flex items-center border border-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide text-black hover:border-red-600 hover:text-red-600"
                                >
                                    Clear
                                </Link>
                            ) : null}
                        </div>
                    </form>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 border border-black/15 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-neutral-700">
                            <Filter className="h-3.5 w-3.5 text-red-600" />
                            {count} result{count === 1 ? "" : "s"}
                        </span>
                        {search ? <FilterChip href="/new">Search: {search}</FilterChip> : null}
                        {min ? <FilterChip href={removeParamUrl({ key: "min", min, max, sort })}>Min ${Number(min)}</FilterChip> : null}
                        {max ? <FilterChip href={removeParamUrl({ key: "max", min, max, sort })}>Max ${Number(max)}</FilterChip> : null}
                        {sort !== "new" ? (
                            <FilterChip href={removeParamUrl({ key: "sort", min, max, sort })}>
                                {sort === "plh" ? "Price low to high" : "Price high to low"}
                            </FilterChip>
                        ) : null}
                    </div>
                </div>
            </section>

            <section className="bg-[#f2f0ea] px-4 py-12 text-black md:px-8 md:py-16">
                <div className="mx-auto max-w-[1680px]">
                <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.32em] text-red-600">
                            Latest drop
                        </p>
                        <h2 className="mt-2 text-5xl font-black uppercase leading-none md:text-7xl">
                            Just hit the rack.
                        </h2>
                    </div>
                    <Link
                        href="/artists"
                        className="inline-flex items-center gap-2 self-start border border-black/20 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-black hover:bg-lime-300"
                    >
                        View artists <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                {!products.length ? (
                    <div className="border border-black/15 bg-white p-8">
                        <p className="text-3xl font-black uppercase leading-none">No new products yet.</p>
                        <p className="mt-3 text-sm text-neutral-600">The rack is empty for this search/filter combo.</p>
                    </div>
                ) : (
                    <div className="grid gap-px border border-black/15 bg-black/20 sm:grid-cols-2 lg:grid-cols-4">
                        {products.map((product, index) => (
                            <ProductTile key={product.id} product={product} index={index} />
                        ))}
                    </div>
                )}
                </div>
            </section>
        </main>
    );
}

function HeroMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="bg-black p-4">
            <div className="text-lime-300">{icon}</div>
            <p className="mt-3 text-sm font-black text-white">{label}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-neutral-500">{value}</p>
        </div>
    );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-500">
                {label}
            </span>
            {children}
        </label>
    );
}

function FilterChip({ href, children }: { href: string; children: ReactNode }) {
    return (
        <Link
            href={href}
            className="border border-black/15 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-black hover:bg-red-600 hover:text-white"
        >
            {children} x
        </Link>
    );
}

function ProductTile({
    product,
    index,
}: {
    product: {
        id: string;
        slug: string;
        title: string;
        price: string;
        image: string;
        hover: string;
        category: string;
        artist: string;
        artistSlug: string | null;
        createdAt: string | null;
    };
    index: number;
}) {
    const featured = index === 0;

    return (
        <Link href={`/product/${product.slug}`} className="group block bg-white text-black">
            <article className="grid h-full grid-rows-[auto_1fr]">
                <div className="relative aspect-[4/5] overflow-hidden bg-[#f7f4ec]">
                    {featured ? (
                        <span className="absolute left-3 top-3 z-20 bg-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                            Counter pick
                        </span>
                    ) : null}
                    <span className="absolute right-3 top-3 z-20 border border-black/15 bg-white/90 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-black">
                        {formatDropDate(product.createdAt)}
                    </span>
                    <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        className="object-contain p-8 transition-opacity duration-300 group-hover:opacity-0"
                    />
                    <Image
                        src={product.hover}
                        alt={`${product.title} alternate view`}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        className="object-contain p-8 opacity-0 transition-all duration-300 group-hover:scale-105 group-hover:opacity-100"
                    />
                </div>
                <div className="border-t border-black/15 p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">
                                {product.artist}
                            </p>
                            <h3 className="mt-2 line-clamp-2 min-h-11 text-base font-black leading-tight text-black">
                                {product.title}
                            </h3>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-red-600 transition-transform group-hover:translate-x-1 group-hover:text-lime-700" />
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                            <p className="text-lg font-black text-lime-700">{product.price}</p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                                {product.category}
                            </p>
                        </div>
                        {product.artistSlug ? (
                            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-neutral-500">
                                Artist drop
                            </span>
                        ) : null}
                    </div>
                </div>
            </article>
        </Link>
    );
}
