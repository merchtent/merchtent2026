// app/dashboard/images/page.tsx
import Link from "next/link";
import Image from "next/image";
import { getServerSupabase } from "@/lib/supabase/server";
import { AlertTriangle, Image as ImageIcon } from "lucide-react";

export const revalidate = 0; // always fresh in dashboard

type Product = { id: string; title: string | null };
type ImgRow = {
    id: string;
    product_id: string;
    path: string | null;
    sort_order: number | null;
    created_at: string | null;
};

function publicImageUrl(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${encodeURIComponent(
        path
    )}`;
}

function fmtDate(iso?: string | null) {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleString("en-AU", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return iso ?? "—";
    }
}

export default async function MyImagesPage() {
    const supabase = getServerSupabase();

    // Require sign-in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">IMAGES // ACCESS</h1>
                            <span className="text-xs bg-neutral-900 text-white px-2 py-1 rounded rotate-[-2deg]">SIGN IN REQUIRED</span>
                        </div>
                    </div>
                </section>
                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        Please <Link href="/auth/sign-in" className="underline">sign in</Link> to view your images.
                    </div>
                </div>
            </main>
        );
    }

    // Get artist for this user
    const { data: artist, error: artistErr } = await supabase
        .from("artists")
        .select("id, display_name")
        .eq("user_id", user.id)
        .maybeSingle();

    if (artistErr) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">IMAGES // ERROR</h1>
                        </div>
                    </div>
                </section>
                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-red-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {artistErr.message}
                    </div>
                </div>
            </main>
        );
    }

    if (!artist) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">IMAGES // SETUP</h1>
                            <span className="text-xs bg-red-600 text-white px-2 py-1 rounded rotate-[2deg]">ACTION NEEDED</span>
                        </div>
                    </div>
                </section>
                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        <h2 className="text-lg md:text-xl font-black">No artist profile yet</h2>
                        <p className="mt-2 text-neutral-300">
                            Visit the <Link className="underline" href="/dashboard">Dashboard</Link> once to create it.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    // 1) Fetch their products (ids + titles)
    const { data: products, error: prodErr } = await supabase
        .from("products")
        .select("id, title")
        .eq("artist_id", artist.id);

    if (prodErr) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">IMAGES // ERROR</h1>
                        </div>
                    </div>
                </section>
                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-red-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {prodErr.message}
                    </div>
                </div>
            </main>
        );
    }

    const productMap = new Map<string, Product>();
    const productIds = (products ?? []).map(p => {
        productMap.set(p.id as string, p as Product);
        return p.id as string;
    });

    // If they have no products, they’ll have no images
    if (productIds.length === 0) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                {/* angled banner */}
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                            <div>
                                <p className="uppercase tracking-[0.25em] text-xs text-red-600">Artist Dashboard</p>
                                <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">My Images</h1>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="max-w-5xl mx-auto px-4 py-8">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        <p className="text-neutral-300">No products yet — upload an image when creating a product.</p>
                        <div className="mt-3">
                            <Link href="/dashboard/products/new" className="underline">Add product</Link>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    // 2) Fetch their images for those products
    const { data: imgs, error: imgErr } = await supabase
        .from("product_images")
        .select("id, product_id, path, sort_order")
        .in("product_id", productIds)

    if (imgErr) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <section className="relative py-0">
                    <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                        <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8">
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">IMAGES // ERROR</h1>
                        </div>
                    </div>
                </section>
                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-red-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {imgErr.message}
                    </div>
                </div>
            </main>
        );
    }

    const images = (imgs ?? []) as ImgRow[];
    const total = images.length;

    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* angled banner */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">Artist Dashboard</p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">My Images</h1>
                        </div>
                        <span className="text-xs bg-neutral-900 text-white px-2 py-1 rounded rotate-[-2deg]">
                            {total} {total === 1 ? "image" : "images"}
                        </span>
                    </div>
                </div>
            </section>

            {/* Grid */}
            <section className="max-w-5xl mx-auto px-4 py-8">
                {total === 0 ? (
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        <p className="text-neutral-300">No images yet.</p>
                        <div className="mt-3">
                            <Link href="/dashboard/products/new" className="underline">Add product</Link>
                        </div>
                    </div>
                ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {images.map((img, i) => {
                            const url = publicImageUrl(img.path);
                            const fileName = img.path?.split("/").slice(-1)[0] ?? "—";
                            const product = productMap.get(img.product_id);
                            return (
                                <li
                                    key={img.id}
                                    className="group relative rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden hover:border-neutral-700 transition-colors"
                                    style={{ clipPath: "polygon(2% 0,100% 0,98% 100%,0 100%)" }}
                                >
                                    <div className="relative">
                                        {url ? (
                                            <Image
                                                src={url}
                                                alt={fileName}
                                                width={800}
                                                height={800}
                                                className="w-full aspect-square object-cover"
                                            />
                                        ) : (
                                            <div className="w-full aspect-square grid place-items-center text-neutral-500 bg-neutral-950">
                                                <ImageIcon className="h-8 w-8" />
                                            </div>
                                        )}

                                        {/* info rail */}
                                        <div className="px-3 py-2 border-t border-neutral-800 bg-neutral-900/70 text-xs flex items-center justify-between">
                                            <span className="text-neutral-300 truncate">{fileName}</span>
                                            <span className="text-neutral-500">{fmtDate(img.created_at)}</span>
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm md:text-base font-medium truncate">
                                                    {product?.title ?? "Untitled product"}
                                                </p>
                                                <p className="text-xs text-neutral-500">
                                                    Sort #{img.sort_order ?? 0}
                                                </p>
                                            </div>
                                            {product?.id ? (
                                                <Link
                                                    href={`/product/${product.id}`}
                                                    className="text-sm underline shrink-0"
                                                >
                                                    View
                                                </Link>
                                            ) : null}
                                        </div>
                                        {url && (
                                            <div className="mt-3">
                                                <a
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs underline text-neutral-400 hover:text-neutral-200"
                                                >
                                                    Open original
                                                </a>
                                            </div>
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
