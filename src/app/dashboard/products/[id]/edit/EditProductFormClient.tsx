// app/dashboard/products/[id]/edit/EditProductFormClient.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { updateProductAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Rocket, Trash2, Plus, Loader2 } from "lucide-react";

type EditableColor = {
    id?: string;
    hex: string;
    label: string;
    isNew?: boolean;
    // for preview
    frontPreview?: string | null;
    backPreview?: string | null;
    // RAW storage keys (what server expects)
    existingFront?: string | null;
    existingBack?: string | null;
    // local-only for display
    frontFileName?: string;
    backFileName?: string;
};

export default function EditProductFormClient({
    productId,
    initialProduct,
    initialColors,
    productImages,
}: {
    productId: string;
    initialProduct: {
        title: string;
        description: string | null;
        price_cents: number;
        is_published: boolean;
        category?: string | null;
    };
    initialColors: Array<{
        id: string;
        hex: string | null;
        label: string | null;
        // from server for preview:
        front_image_url?: string | null;
        back_image_url?: string | null;
        // from server as RAW
        front_image_path?: string | null;
        back_image_path?: string | null;
    }>;
    productImages?: {
        front?: string | null;
        back?: string | null;
    };
}) {
    const [frontPreview, setFrontPreview] = useState<string | null>(
        productImages?.front ?? null
    );
    const [backPreview, setBackPreview] = useState<string | null>(
        productImages?.back ?? null
    );

    function truncateName(name: string, max = 15) {
        if (name.length <= max) return name;
        const extMatch = name.match(/\.[a-zA-Z0-9]+$/);
        const ext = extMatch ? extMatch[0] : "";
        const base = name.slice(0, max - (ext ? ext.length + 1 : 3));
        return ext ? `${base}…${ext}` : `${base}…`;
    }

    // 👇 now we keep BOTH url + raw path
    const [colors, setColors] = useState<EditableColor[]>(
        initialColors.length
            ? initialColors.map((c) => ({
                id: c.id,
                hex: c.hex || "#111111",
                label: c.label || "",
                isNew: false,
                // preview
                frontPreview: c.front_image_url ?? null,
                backPreview: c.back_image_url ?? null,
                // raw paths (for POST)
                existingFront: c.front_image_path ?? null,
                existingBack: c.back_image_path ?? null,
            }))
            : []
    );

    const [removed, setRemoved] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const price = (initialProduct.price_cents ?? 0) / 100;

    function addColor() {
        setColors((prev) => [
            ...prev,
            {
                hex: "#E5E5E5",
                label: "",
                isNew: true,
                frontPreview: null,
                backPreview: null,
            },
        ]);
    }

    function removeColor(idx: number) {
        setColors((prev) => {
            const col = prev[idx];
            if (col?.id) {
                setRemoved((r) => [...r, col.id!]);
            }
            return prev.filter((_, i) => i !== idx);
        });
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const formData = new FormData(e.currentTarget);

            // attach product_id
            formData.set("product_id", productId);

            // how many colours we currently have
            formData.set("colors_count", String(colors.length));

            // colours the user removed (existing ones)
            removed.forEach((id) => formData.append("remove_color_id", id));

            await updateProductAction(formData);
            // optional: toast
        } catch (err: unknown) {
            setSubmitError(err instanceof Error ? err.message : "Could not update product");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            encType="multipart/form-data"
            className="space-y-6"
        >
            {submitError ? (
                <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200">
                    {submitError}
                </p>
            ) : null}

            {/* title */}
            <div>
                <label className="block text-xs uppercase tracking-wide text-neutral-400 mb-2">
                    Title
                </label>
                <input
                    name="title"
                    defaultValue={initialProduct.title}
                    required
                    className="h-12 w-full border border-neutral-700 bg-black px-4 text-sm text-neutral-100 outline-none focus:border-lime-300"
                />
            </div>

            {/* desc */}
            <div>
                <label className="block text-xs uppercase tracking-wide text-neutral-400 mb-2">
                    Description
                </label>
                <textarea
                    name="description"
                    defaultValue={initialProduct.description ?? ""}
                    rows={4}
                    className="w-full border border-neutral-700 bg-black px-4 py-3 text-sm leading-6 text-neutral-100 outline-none focus:border-lime-300"
                />
            </div>

            {/* category */}
            <div>
                <label className="block text-xs uppercase tracking-wide text-neutral-400 mb-2">
                    Category
                </label>
                <select
                    name="category"
                    defaultValue={initialProduct.category || "tees"}
                    className="h-12 w-full border border-neutral-700 bg-black px-4 text-sm text-neutral-100 outline-none focus:border-lime-300"
                >
                    <option value="tees">Tees</option>
                    <option value="hoodies">Hoodies</option>
                    <option value="hats">Hats</option>
                    <option value="tanks">Tanks</option>
                    <option value="posters">Posters</option>
                    <option value="vinyl">Vinyl</option>
                    <option value="accessories">Accessories</option>
                    <option value="other">Other</option>
                </select>
            </div>

            {/* price + publish */}
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs uppercase tracking-wide text-neutral-400 mb-2">
                        Price (AUD)
                    </label>
                    <input
                        name="price"
                        type="number"
                        min="1"
                        step="0.01"
                        defaultValue={price.toFixed(2)}
                        className="h-12 w-full border border-neutral-700 bg-black px-4 text-sm text-neutral-100 outline-none focus:border-lime-300"
                    />
                </div>
                <div className="flex items-end gap-3">
                    <label className="inline-flex items-center gap-2 text-neutral-200">
                        <input
                            type="checkbox"
                            name="publish"
                            defaultChecked={initialProduct.is_published}
                            className="h-4 w-4 border-neutral-600 bg-neutral-950 accent-lime-300"
                        />
                        <span className="text-sm">Publish</span>
                    </label>
                </div>
            </div>

            {/* product front/back with preview */}
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs uppercase tracking-wide text-neutral-400 mb-2">
                        Replace front image
                    </label>
                    <input
                        type="file"
                        name="image_front"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const url = URL.createObjectURL(file);
                                setFrontPreview(url);
                            }
                        }}
                        className="text-sm text-neutral-100 file:border-0 file:bg-lime-300 file:px-3 file:py-2 file:font-black file:text-black file:hover:bg-lime-200"
                        disabled={isSubmitting}
                    />
                    {frontPreview ? (
                        <div className="mt-2">
                            <p className="text-[10px] text-neutral-500 mb-1">Current / new</p>
                            <Image
                                src={frontPreview}
                                alt="front preview"
                                width={80}
                                height={80}
                                unoptimized
                                className="h-20 w-20 border border-neutral-700 bg-black object-cover"
                            />
                        </div>
                    ) : (
                        <p className="text-[11px] text-neutral-500 mt-1">
                            Leave blank to keep current.
                        </p>
                    )}
                </div>
                <div>
                    <label className="block text-xs uppercase tracking-wide text-neutral-400 mb-2">
                        Replace back image
                    </label>
                    <input
                        type="file"
                        name="image_back"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const url = URL.createObjectURL(file);
                                setBackPreview(url);
                            }
                        }}
                        className="text-sm text-neutral-100 file:border-0 file:bg-lime-300 file:px-3 file:py-2 file:font-black file:text-black file:hover:bg-lime-200"
                        disabled={isSubmitting}
                    />
                    {backPreview ? (
                        <div className="mt-2">
                            <p className="text-[10px] text-neutral-500 mb-1">Current / new</p>
                            <Image
                                src={backPreview}
                                alt="back preview"
                                width={80}
                                height={80}
                                unoptimized
                                className="h-20 w-20 border border-neutral-700 bg-black object-cover"
                            />
                        </div>
                    ) : (
                        <p className="text-[11px] text-neutral-500 mt-1">
                            Leave blank to keep current.
                        </p>
                    )}
                </div>
            </div>

            {/* colours */}
            <div className="space-y-3 border border-neutral-800 bg-black p-4">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wide text-neutral-400">
                        Colours
                    </p>
                    <button
                        type="button"
                        onClick={addColor}
                        className="inline-flex items-center gap-1 bg-neutral-900 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-white hover:bg-neutral-800"
                        disabled={isSubmitting}
                    >
                        <Plus className="h-3.5 w-3.5" /> Add colour
                    </button>
                </div>

                {colors.length === 0 ? (
                    <p className="text-[11px] text-neutral-500">
                        No colours yet. Add one above.
                    </p>
                ) : (
                    colors.map((c, idx) => (
                        <div
                            key={idx}
                            className="grid items-center gap-3 border border-neutral-800 bg-neutral-950 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto]"
                        >
                            {/* mode + id */}
                            <input
                                type="hidden"
                                name={`color_${idx}_mode`}
                                value={c.isNew ? "new" : "existing"}
                            />
                            {!c.isNew && c.id ? (
                                <input type="hidden" name={`color_${idx}_id`} value={c.id} />
                            ) : null}

                            <div>
                                <label className="block text-[11px] text-neutral-400 mb-1">
                                    Hex
                                </label>
                                <input
                                    name={`color_${idx}_hex`}
                                    defaultValue={c.hex}
                                    className="h-10 w-full border border-neutral-700 bg-black px-3 text-sm outline-none focus:border-lime-300"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] text-neutral-400 mb-1">
                                    Label
                                </label>
                                <input
                                    name={`color_${idx}_label`}
                                    defaultValue={c.label}
                                    className="h-10 w-full border border-neutral-700 bg-black px-3 text-sm outline-none focus:border-lime-300"
                                />
                            </div>

                            {/* front file */}
                            <div>
                                <label className="block text-[11px] text-neutral-400 mb-1">
                                    Front
                                </label>
                                {/* IMPORTANT: send RAW path back, not public URL */}
                                <input
                                    type="hidden"
                                    name={`color_${idx}_existing_front`}
                                    value={c.existingFront || ""}
                                />
                                <input
                                    type="file"
                                    name={`color_${idx}_front`}
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const url = URL.createObjectURL(file);
                                        setColors((prev) =>
                                            prev.map((row, rIdx) =>
                                                rIdx === idx
                                                    ? {
                                                        ...row,
                                                        frontPreview: url,
                                                        frontFileName: file.name,
                                                    }
                                                    : row
                                            )
                                        );
                                    }}
                                    className="text-xs max-w-[150px] overflow-hidden"
                                    disabled={isSubmitting}
                                />
                                {c.frontFileName ? (
                                    <p className="text-[10px] text-neutral-500 mt-1 max-w-[150px] truncate">
                                        {truncateName(c.frontFileName)}
                                    </p>
                                ) : null}

                                {(c.frontPreview || c.existingFront) && (
                                    <Image
                                        src={c.frontPreview || (c.existingFront as string)}
                                        alt="front colour preview"
                                        width={56}
                                        height={56}
                                        unoptimized={Boolean(c.frontPreview)}
                                        className="mt-2 h-14 w-14 border border-neutral-800 object-cover"
                                    />
                                )}
                            </div>

                            {/* back file */}
                            <div>
                                <label className="block text-[11px] text-neutral-400 mb-1">
                                    Back
                                </label>
                                <input
                                    type="hidden"
                                    name={`color_${idx}_existing_back`}
                                    value={c.existingBack || ""}
                                />
                                <input
                                    type="file"
                                    name={`color_${idx}_back`}
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const url = URL.createObjectURL(file);
                                        setColors((prev) =>
                                            prev.map((row, rIdx) =>
                                                rIdx === idx
                                                    ? {
                                                        ...row,
                                                        backPreview: url,
                                                        backFileName: file.name,
                                                    }
                                                    : row
                                            )
                                        );
                                    }}
                                    className="text-xs max-w-[150px] overflow-hidden"
                                    disabled={isSubmitting}
                                />
                                {c.backFileName ? (
                                    <p className="text-[10px] text-neutral-500 mt-1 max-w-[150px] truncate">
                                        {truncateName(c.backFileName)}
                                    </p>
                                ) : null}

                                {(c.backPreview || c.existingBack) && (
                                    <Image
                                        src={c.backPreview || (c.existingBack as string)}
                                        alt="back colour preview"
                                        width={56}
                                        height={56}
                                        unoptimized={Boolean(c.backPreview)}
                                        className="mt-2 h-14 w-14 border border-neutral-800 object-cover"
                                    />
                                )}
                            </div>

                            <div className="flex items-center justify-end pt-5">
                                <button
                                    type="button"
                                    onClick={() => removeColor(idx)}
                                    className="text-xs text-red-300 hover:text-red-100 inline-flex items-center gap-1"
                                    disabled={isSubmitting}
                                >
                                    <Trash2 className="h-3.5 w-3.5" /> Remove
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-neutral-500">
                    You can always come back to tweak colours or images.
                </p>
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-12 border border-lime-300 bg-lime-300 px-6 font-black uppercase tracking-[0.08em] text-black hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving…
                        </>
                    ) : (
                        <>
                            <Rocket className="h-4 w-4 mr-2" />
                            Save changes
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
