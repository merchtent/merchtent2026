// app/dashboard/products/page.tsx
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Box, FileClock, AlertTriangle, PenTool, ArrowRight, Shirt } from "lucide-react";
import { publicImageUrl } from "@/lib/storage";
import { logger } from "@/lib/logger";
import { requireArtistPage } from "@/lib/auth/artist";

function StatusPill({ published }: { published?: boolean | null }) {
    const styles = published
        ? "bg-lime-300/15 text-lime-200 border-lime-300/40"
        : "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
    return (
        <span className={`border px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.08em] ${styles}`}>
            {published ? "Published" : "Draft"}
        </span>
    );
}

function DesignStatusPill({ designed }: { designed: boolean }) {
    const styles = designed
        ? "border-lime-300/40 bg-lime-300/15 text-lime-200"
        : "border-neutral-700 bg-neutral-500/10 text-neutral-300";

    return (
        <span className={`border px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.08em] ${styles}`}>
            {designed ? "Merch Tent design" : "Manual"}
        </span>
    );
}

type ProductLifecycle = {
    id: string;
    production_status?: string | null;
    moderation_status?: string | null;
    readiness_notes?: string | null;
    price_cents?: number | null;
    artist_cut_cents?: number | null;
    category?: string | null;
    is_published?: boolean | null;
};

type ProductDesignReadiness = {
    product_id: string;
    validation_status?: string | null;
    print_asset_front_path?: string | null;
    print_asset_back_path?: string | null;
};

type ProductImageCount = {
    product_id: string;
};

function LifecyclePill({
    label,
    tone = "neutral",
}: {
    label?: string | null;
    tone?: "neutral" | "good" | "warn" | "bad" | "info";
}) {
    const styles = {
        neutral: "border-neutral-700 bg-neutral-500/10 text-neutral-300",
        good: "border-lime-300/40 bg-lime-300/15 text-lime-200",
        warn: "border-yellow-500/30 bg-yellow-500/15 text-yellow-300",
        bad: "border-red-500/30 bg-red-500/15 text-red-300",
        info: "border-cyan-500/30 bg-cyan-500/15 text-cyan-200",
    }[tone];

    return (
        <span className={`border px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.08em] ${styles}`}>
            {(label ?? "unknown").replaceAll("_", " ")}
        </span>
    );
}

function productionTone(status?: string | null): "neutral" | "good" | "bad" | "info" {
    if (status === "published" || status === "generated") return "good";
    if (status === "generating") return "info";
    if (status === "failed") return "bad";
    return "neutral";
}

function moderationTone(status?: string | null): "neutral" | "good" | "warn" | "bad" {
    if (status === "approved") return "good";
    if (status === "pending_review") return "warn";
    if (status === "blocked") return "bad";
    return "neutral";
}

export default async function MyProductsPage() {
    const { supabase, artist } = await requireArtistPage();

    // Products with first image + description
    const { data: rows, error } = await supabase
        .from("products_with_first_image")
        .select(
            "id, title, description, is_published, created_at, primary_image_path, slug"
        )
        .eq("artist_id", artist.id)
        .order("created_at", { ascending: false });

    if (error) {
        logger.error("Dashboard products page failed to load products", {
            artist_id: artist.id,
            error: error.message,
        });

        return (
            <main className="min-h-screen bg-black text-white">
                <section className="border-b border-neutral-800 p-5 md:p-8">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-400">Artist dashboard</p>
                    <h1 className="mt-3 text-3xl font-black uppercase leading-tight md:text-5xl">Products error.</h1>
                </section>
                <div className="p-5 md:p-8">
                    <div className="border border-neutral-800 bg-neutral-950 p-6 text-red-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Could not load your products right now.
                    </div>
                </div>
            </main>
        );
    }

    // 🔢 Fetch all order_items once and aggregate sold units per product
    const { data: orderItems } = await supabase
        .from("order_items")
        .select("product_id, qty")
        .eq("artist_id", artist.id);

    const unitsByProduct = new Map<string, number>();
    (orderItems ?? []).forEach((oi) => {
        const pid = oi.product_id as string;
        const qty = Number(oi.qty ?? 0);
        unitsByProduct.set(pid, (unitsByProduct.get(pid) ?? 0) + qty);
    });

    const productIds = (rows ?? []).map((product) => product.id);
    const { data: designRows } = productIds.length
        ? await supabase
            .from("product_designs")
            .select("product_id, validation_status, print_asset_front_path, print_asset_back_path")
            .eq("artist_id", artist.id)
            .in("product_id", productIds)
        : { data: [] };

    const { data: lifecycleRows, error: lifecycleError } = productIds.length
        ? await supabase
            .from("products")
            .select("id, production_status, moderation_status, readiness_notes")
            .eq("artist_id", artist.id)
            .in("id", productIds)
        : { data: [], error: null };

    const { data: readinessRows, error: readinessError } = productIds.length
        ? await supabase
            .from("products")
            .select("id, price_cents, artist_cut_cents, category, is_published")
            .eq("artist_id", artist.id)
            .in("id", productIds)
        : { data: [], error: null };

    const { data: imageRows } = productIds.length
        ? await supabase
            .from("product_images")
            .select("product_id")
            .in("product_id", productIds)
        : { data: [] };

    if (lifecycleError) {
        logger.error("Dashboard products page failed to load product lifecycle metadata", {
            artist_id: artist.id,
            error: lifecycleError.message,
        });
    }

    if (readinessError) {
        logger.error("Dashboard products page failed to load product readiness metadata", {
            artist_id: artist.id,
            error: readinessError.message,
        });
    }

    const designByProductId = new Map(
        ((designRows ?? []) as ProductDesignReadiness[]).map((design) => [design.product_id, design])
    );
    const designedProductIds = new Set(Array.from(designByProductId.keys()));
    const readinessByProductId = new Map(
        ((readinessRows ?? []) as ProductLifecycle[]).map((product) => [product.id, product])
    );
    const lifecycleByProductId = new Map(
        ((lifecycleRows ?? []) as ProductLifecycle[]).map((product) => [
            product.id,
            { ...product, ...readinessByProductId.get(product.id) },
        ])
    );
    const imageCountByProductId = new Map<string, number>();
    ((imageRows ?? []) as ProductImageCount[]).forEach((image) => {
        imageCountByProductId.set(image.product_id, (imageCountByProductId.get(image.product_id) ?? 0) + 1);
    });

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 bg-black">
                <div className="grid lg:grid-cols-[1fr_auto]">
                    <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#b7ff3c]">Product floor</p>
                        <h1 className="mt-3 text-3xl font-black uppercase leading-tight md:text-5xl">My products.</h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                            Drafts, live drops, generated mockups, moderation state, and production readiness in one place.
                        </p>
                    </div>
                    <div className="flex flex-col justify-end gap-3 p-5 md:p-8">
                        <Link
                            href="/dashboard/products/designer"
                            className="inline-flex items-center justify-center gap-2 bg-lime-300 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-black hover:bg-lime-200"
                        >
                            <PenTool className="h-4 w-4" /> Design product
                        </Link>
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800 p-5 md:p-8">
                {!rows || rows.length === 0 ? (
                    <div className="border border-neutral-800 bg-neutral-950 p-6 md:p-8">
                        <div className="flex items-center gap-3">
                            <Box className="h-6 w-6 text-[#b7ff3c]" />
                            <div>
                                <p className="text-2xl font-black uppercase">No products yet.</p>
                                <p className="mt-1 text-sm text-neutral-400">
                                    Start your first drop with the designer and publish shop-ready mockups from saved design data.
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Button asChild>
                                <Link href="/dashboard/products/designer">Design product</Link>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="border border-neutral-800">
                        <div className="grid border-b border-neutral-800 bg-neutral-950 p-4 md:grid-cols-[1fr_auto] md:items-center">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#b7ff3c]">Inventory state</p>
                                <h2 className="mt-1 text-3xl font-black uppercase leading-none">{rows.length} product{rows.length === 1 ? "" : "s"}</h2>
                            </div>
                            <p className="mt-2 text-sm text-neutral-500 md:mt-0">Live, draft, production and moderation checks.</p>
                        </div>
                        <ul>
                        {rows.map((p) => {
                            const unitsSold = unitsByProduct.get(p.id) ?? 0;
                            const isDesignedProduct = designedProductIds.has(p.id);
                            const thumbnailUrl = publicImageUrl(p.primary_image_path);
                            const lifecycle = lifecycleByProductId.get(p.id);
                            const design = designByProductId.get(p.id);
                            const imageCount = imageCountByProductId.get(p.id) ?? 0;
                            const readinessChecks = buildReadinessChecks({
                                product: lifecycle,
                                designed: isDesignedProduct,
                                design,
                                imageCount,
                            });
                            const readyCount = readinessChecks.filter((check) => check.ok).length;
                            const readyForLaunch = readyCount === readinessChecks.length;
                            return (
                                <li
                                    key={p.id}
                                    className="grid gap-4 border-b border-neutral-800 bg-neutral-950 p-4 last:border-b-0 md:grid-cols-[96px_1fr_auto] md:items-center"
                                >
                                    <div className="relative h-24 w-24 shrink-0 overflow-hidden border border-neutral-800 bg-black">
                                        {thumbnailUrl ? (
                                            <Image
                                                src={thumbnailUrl}
                                                alt={p.title}
                                                fill
                                                sizes="80px"
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="h-full w-full grid place-items-center text-neutral-500">
                                                <Shirt className="h-6 w-6" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-xl font-black leading-tight">{p.title}</div>
                                                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-neutral-500">
                                                    {new Date(String(p.created_at)).toLocaleString("en-AU", {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </div>
                                            </div>

                                            <div className="hidden text-right md:block">
                                                <StatusPill published={p.is_published} />
                                                <div className="mt-1">
                                                    <DesignStatusPill designed={isDesignedProduct} />
                                                </div>
                                                <div className="mt-1 flex flex-col items-end gap-1">
                                                    <LifecyclePill
                                                        label={lifecycle?.production_status}
                                                        tone={productionTone(lifecycle?.production_status)}
                                                    />
                                                    <LifecyclePill
                                                        label={lifecycle?.moderation_status}
                                                        tone={moderationTone(lifecycle?.moderation_status)}
                                                    />
                                                </div>
                                                <div className="mt-1 text-[11px] text-neutral-400">
                                                    {unitsSold} {unitsSold === 1 ? "sale" : "sales"}
                                                </div>
                                            </div>
                                        </div>

                                        {p.description && (
                                            <p className="mt-1 text-sm text-neutral-300 line-clamp-2">
                                                {p.description}
                                            </p>
                                        )}
                                        {lifecycle?.readiness_notes ? (
                                            <p className="mt-2 text-xs text-neutral-500 line-clamp-2">
                                                {lifecycle.readiness_notes}
                                            </p>
                                        ) : null}
                                        <div className="mt-4 border border-neutral-800 bg-black p-3">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-400">
                                                    Launch readiness
                                                </p>
                                                    <span className={`text-xs font-black ${readyForLaunch ? "text-lime-200" : "text-yellow-300"}`}>
                                                    {readyCount}/{readinessChecks.length} ready
                                                </span>
                                            </div>
                                            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                                {readinessChecks.map((check) => (
                                                    <div key={check.label} className="flex items-center gap-2 text-xs">
                                                        <span className={`h-2 w-2 ${check.ok ? "bg-lime-300" : "bg-red-500"}`} />
                                                        <span className={check.ok ? "text-neutral-300" : "text-red-300"}>{check.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 md:justify-end">
                                        {p.is_published ? (
                                            <>
                                                <Link
                                                    href={`/product/${p.slug ?? p.id}`}
                                                    className="inline-flex items-center gap-1 text-sm font-black text-[#b7ff3c] hover:text-lime-200"
                                                    title="View product"
                                                >
                                                    View <ArrowRight className="h-4 w-4" />
                                                </Link>
                                                <Link
                                                    href={`/dashboard/products/${p.id}/edit`}
                                                    className="text-sm font-black underline"
                                                >
                                                    Edit
                                                </Link>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-xs text-neutral-500 inline-flex items-center gap-1">
                                                    <FileClock className="h-3.5 w-3.5" />
                                                    Not live
                                                </span>
                                                <Link
                                                    href={`/dashboard/products/${p.id}/edit`}
                                                    className="text-sm font-black underline"
                                                >
                                                    Edit
                                                </Link>
                                            </>


                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    </div>
                )}
            </section>
        </main>
    );
}

function buildReadinessChecks({
    product,
    designed,
    design,
    imageCount,
}: {
    product?: ProductLifecycle;
    designed: boolean;
    design?: ProductDesignReadiness;
    imageCount: number;
}) {
    const isManual = product?.production_status === "manual";
    const mockupsGenerated = imageCount > 0;
    const printAssetsReady = isManual || Boolean(design?.print_asset_front_path);
    const designValidated = isManual || design?.validation_status === "validated";

    return [
        { label: "Image present", ok: mockupsGenerated },
        { label: "Price set", ok: Number(product?.price_cents ?? 0) > 0 },
        { label: "Artist cut set", ok: Number(product?.artist_cut_cents ?? 0) >= 0 },
        { label: "Category set", ok: Boolean(product?.category) },
        { label: "Mockups generated", ok: mockupsGenerated },
        { label: "Design data saved", ok: isManual || designed },
        { label: "Print asset ready", ok: printAssetsReady && designValidated },
        { label: "Moderation approved", ok: product?.moderation_status === "approved" || !product?.is_published },
    ];
}
