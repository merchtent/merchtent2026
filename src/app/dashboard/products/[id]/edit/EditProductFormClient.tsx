// app/dashboard/products/[id]/edit/EditProductFormClient.tsx
"use client";

import { useState } from "react";
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
        } catch (err) {
            console.error(err);
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
            {/* title */}
            <div>
                <label className="block text-xs uppercase tracking-wide text-neutral-400 mb-2">
                    Title
                </label>
                <input
                    name="title"
                    defaultValue={initialProduct.title}
                    required
                    className="w-full h-11 rounded-xl bg-neutral-950 border border-neutral-700 px-3 text-sm text-neutral-100"
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
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-neutral-100"
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
                    className="w-full h-11 rounded-xl bg-neutral-950 border border-neutral-700 px-3 text-sm text-neutral-100"
                >
                    <option value="tees">Tees</option>
                    <option value="hoodies">Hoodies</option>
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
                        className="w-full h-11 rounded-xl bg-neutral-950 border border-neutral-700 px-3 text-sm text-neutral-100"
                    />
                </div>
                <div className="flex items-end gap-3">
                    <label className="inline-flex items-center gap-2 text-neutral-200">
                        <input
                            type="checkbox"
                            name="publish"
                            defaultChecked={initialProduct.is_published}
                            className="h-4 w-4 rounded border-neutral-600 bg-neutral-950 accent-red-500"
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
                        className="text-sm text-neutral-100 file:bg-neutral-800 file:text-neutral-100 file:rounded file:px-3 file:py-1"
                        disabled={isSubmitting}
                    />
                    {frontPreview ? (
                        <div className="mt-2">
                            <p className="text-[10px] text-neutral-500 mb-1">Current / new</p>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={frontPreview}
                                alt="front preview"
                                className="h-20 w-20 rounded-lg object-cover border border-neutral-700 bg-neutral-900"
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
                        className="text-sm text-neutral-100 file:bg-neutral-800 file:text-neutral-100 file:rounded file:px-3 file:py-1"
                        disabled={isSubmitting}
                    />
                    {backPreview ? (
                        <div className="mt-2">
                            <p className="text-[10px] text-neutral-500 mb-1">Current / new</p>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={backPreview}
                                alt="back preview"
                                className="h-20 w-20 rounded-lg object-cover border border-neutral-700 bg-neutral-900"
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
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/30 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wide text-neutral-400">
                        Colours
                    </p>
                    <button
                        type="button"
                        onClick={addColor}
                        className="inline-flex items-center gap-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1 rounded-lg"
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
                            className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto] gap-3 items-center bg-neutral-950/30 rounded-lg p-3"
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
                                    className="w-full h-9 rounded-lg bg-neutral-950 border border-neutral-700 px-2 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] text-neutral-400 mb-1">
                                    Label
                                </label>
                                <input
                                    name={`color_${idx}_label`}
                                    defaultValue={c.label}
                                    className="w-full h-9 rounded-lg bg-neutral-950 border border-neutral-700 px-2 text-sm"
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
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={c.frontPreview || (c.existingFront as string)}
                                        alt="front colour preview"
                                        className="mt-2 h-14 w-14 rounded object-cover border border-neutral-800"
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
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={c.backPreview || (c.existingBack as string)}
                                        alt="back colour preview"
                                        className="mt-2 h-14 w-14 rounded object-cover border border-neutral-800"
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
                    className="relative h-11 px-6 font-black tracking-wide bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 border border-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ clipPath: "polygon(1% 0,100% 0,99% 100%,0 100%)" }}
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
