// app/dashboard/products/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Box, FileClock, AlertTriangle } from "lucide-react";

function StatusPill({ published }: { published?: boolean | null }) {
    const styles = published
        ? "bg-green-500/15 text-green-300 border-green-500/30"
        : "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
    return (
        <span className={`px-2 py-0.5 text-[11px] rounded-full border ${styles}`}>
            {published ? "Published" : "Draft"}
        </span>
    );
}

function publicImageUrl(path: string) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${encodeURIComponent(
        path
    )}`;
}

export default async function MyProductsPage() {
    const supabase = getServerSupabase();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                {/* angled banner */}
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                PRODUCTS // ACCESS
                            </h1>
                            <span className="text-xs bg-neutral-900 text-white px-2 py-1 rounded rotate-[-2deg]">
                                SIGN IN REQUIRED
                            </span>
                        </div>
                    </div>
                </section>

                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        Please <Link href="/auth/sign-in" className="underline">sign in</Link>.
                    </div>
                </div>
            </main>
        );
    }

    const { data: artist, error: artistErr } = await supabase
        .from("artists")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (artistErr) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                PRODUCTS // ERROR
                            </h1>
                        </div>
                    </div>
                </section>
                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-red-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Error: {artistErr.message}
                    </div>
                </div>
            </main>
        );
    }

    if (!artist) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                {/* angled banner */}
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                PRODUCTS // SETUP
                            </h1>
                            <span className="text-xs bg-red-600 text-white px-2 py-1 rounded rotate-[2deg]">
                                ACTION NEEDED
                            </span>
                        </div>
                    </div>
                </section>

                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        <h2 className="text-lg md:text-xl font-black">No artist profile yet</h2>
                        <p className="mt-2 text-neutral-300">
                            Visit the{" "}
                            <Link className="underline" href="/dashboard">
                                Dashboard
                            </Link>{" "}
                            once to create it.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    // Products with first image + description
    const { data: rows, error } = await supabase
        .from("products_with_first_image")
        .select(
            "id, title, description, is_published, created_at, primary_image_path, slug"
        )
        .eq("artist_id", artist.id)
        .order("created_at", { ascending: false });

    if (error) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                PRODUCTS // ERROR
                            </h1>
                        </div>
                    </div>
                </section>
                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-red-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Error: {error.message}
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

    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* angled banner */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">Artist Dashboard</p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">My Products</h1>
                        </div>
                        <Button asChild>
                            <Link href="/dashboard/products/new" className="inline-flex items-center gap-2">
                                <Plus className="h-4 w-4" /> Add product
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* list / empty */}
            <section className="max-w-5xl mx-auto px-4 py-8">
                {!rows || rows.length === 0 ? (
                    <Card
                        className="bg-neutral-900 border-neutral-800"
                        style={{ clipPath: "polygon(1% 0,100% 0,98% 100%,0 100%)" }}
                    >
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3">
                                <Box className="h-5 w-5 text-neutral-300" />
                                <div>
                                    <p className="font-semibold">No products yet.</p>
                                    <p className="text-sm text-neutral-400">
                                        Start your first drop — add a tee with hover imagery.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4">
                                <Button asChild>
                                    <Link href="/dashboard/products/new">Add product</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <ul className="space-y-3">
                        {rows.map((p) => {
                            const unitsSold = unitsByProduct.get(p.id) ?? 0;
                            return (
                                <li
                                    key={p.id}
                                    className="rounded-2xl border border-neutral-800 bg-neutral-900 px-3 py-3 md:px-4 md:py-4 flex items-center gap-4"
                                    style={{ clipPath: "polygon(1% 0,100% 0,99% 100%,0 100%)" }}
                                >
                                    {/* thumb */}
                                    <div className="relative h-16 w-16 md:h-20 md:w-20 shrink-0 overflow-hidden rounded bg-neutral-950 border border-neutral-800">
                                        {p.primary_image_path ? (
                                            <Image
                                                src={publicImageUrl(p.primary_image_path)}
                                                alt={p.title}
                                                fill
                                                sizes="80px"
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="h-full w-full grid place-items-center text-[10px] text-neutral-500">
                                                No image
                                            </div>
                                        )}
                                    </div>

                                    {/* text */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="font-medium truncate">{p.title}</div>
                                                <div className="text-xs text-neutral-500">
                                                    {new Date(p.created_at as any).toLocaleString("en-AU", {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <StatusPill published={p.is_published} />
                                                {/* 👇 sales count under the pill */}
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
                                    </div>

                                    {/* actions */}
                                    <div className="hidden md:flex items-center gap-2">
                                        {p.is_published ? (
                                            <>
                                                <Link
                                                    href={`/product/${p.slug ?? p.id}`}
                                                    className="text-sm underline"
                                                    title="View product"
                                                >
                                                    View
                                                </Link>
                                                <Link
                                                    href={`/dashboard/products/${p.id}/edit`}
                                                    className="text-sm underline"
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
                                                    className="text-sm underline"
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
                )}
            </section>
        </main>
    );
}
