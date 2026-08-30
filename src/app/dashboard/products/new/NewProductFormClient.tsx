"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Rocket, Loader2, Image as ImageIcon, X } from "lucide-react";
import { createProductAction } from "./actions";

type ColorRow = {
    hex: string;
    label: string;
    frontPreview?: string | null;
    backPreview?: string | null;
};

export default function NewProductFormClient() {
    // colours in form
    const [colors, setColors] = useState<Array<ColorRow>>([
        { hex: "#111111", label: "Black" },
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // top-level product image previews
    const [primaryPreview, setPrimaryPreview] = useState<string | null>(null);
    const [backPreview, setBackPreview] = useState<string | null>(null);
    const previewUrlsRef = useRef(new Set<string>());

    function createPreviewUrl(file: File) {
        const url = URL.createObjectURL(file);
        previewUrlsRef.current.add(url);
        return url;
    }

    function revokePreviewUrl(url?: string | null) {
        if (!url) return;
        URL.revokeObjectURL(url);
        previewUrlsRef.current.delete(url);
    }

    useEffect(() => {
        const previewUrls = previewUrlsRef.current;
        return () => {
            previewUrls.forEach((url) => {
                URL.revokeObjectURL(url);
            });
            previewUrls.clear();
        };
    }, []);

    function addColorRow() {
        setColors((prev) => [
            ...prev,
            { hex: "#FFFFFF", label: `Colour ${prev.length + 1}` },
        ]);
    }

    function removeColorRow(idx: number) {
        setColors((prev) => {
            const target = prev[idx];
            revokePreviewUrl(target?.frontPreview);
            revokePreviewUrl(target?.backPreview);
            return prev.filter((_, i) => i !== idx);
        });
    }

    // handle per-colour file change for front/back
    function handleColorFileChange(
        idx: number,
        kind: "front" | "back",
        file: File | null
    ) {
        setColors((prev) =>
            prev.map((row, i) => {
                if (i !== idx) return row;

                // revoke old url if exists
                if (kind === "front" && row.frontPreview) {
                    revokePreviewUrl(row.frontPreview);
                }
                if (kind === "back" && row.backPreview) {
                    revokePreviewUrl(row.backPreview);
                }

                if (!file) {
                    return {
                        ...row,
                        ...(kind === "front"
                            ? { frontPreview: null }
                            : { backPreview: null }),
                    };
                }

                const url = createPreviewUrl(file);
                return {
                    ...row,
                    ...(kind === "front" ? { frontPreview: url } : { backPreview: url }),
                };
            })
        );
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const formData = new FormData(e.currentTarget);
            // tell server how many colours we had (to loop over color_0_..., color_1_..., etc.)
            formData.set("colors_count", String(colors.length));

            await createProductAction(formData);
            // server action will redirect on success
        } catch (err: unknown) {
            setSubmitError(err instanceof Error ? err.message : "Could not create product");
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

            {/* Title */}
            <div>
                <label
                    htmlFor="title"
                    className="block text-xs uppercase tracking-wide text-neutral-400 mb-2"
                >
                    Title
                </label>
                <input
                    id="title"
                    name="title"
                    required
                    disabled={isSubmitting}
                    placeholder="e.g. Tour Tee — Melbourne"
                    className="h-12 w-full border border-neutral-700 bg-black px-4 text-sm text-neutral-100 outline-none placeholder:text-neutral-500 focus:border-lime-300 disabled:opacity-70"
                />
            </div>

            {/* Description */}
            <div>
                <label
                    htmlFor="description"
                    className="block text-xs uppercase tracking-wide text-neutral-400 mb-2"
                >
                    Description
                </label>
                <textarea
                    id="description"
                    name="description"
                    rows={4}
                    disabled={isSubmitting}
                    placeholder="Fabric, fit, print style, any disclaimers, etc."
                    className="w-full border border-neutral-700 bg-black px-4 py-3 text-sm leading-6 text-neutral-100 outline-none placeholder:text-neutral-500 focus:border-lime-300 disabled:opacity-70"
                />
                <p className="mt-1 text-[11px] text-neutral-500">
                    Tip: keep it short; details like care/shipping can live in accordions
                    on the PDP.
                </p>
            </div>

            <div>
                <label className="block text-xs uppercase tracking-wide text-neutral-400 mb-2">
                    Category
                </label>
                <select
                    id="category"
                    name="category"
                    disabled={isSubmitting}
                    defaultValue={"tees"}
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

            {/* Price + Publish */}
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label
                        htmlFor="price"
                        className="block text-xs uppercase tracking-wide text-neutral-400 mb-2"
                    >
                        Price (AUD)
                    </label>
                    <input
                        id="price"
                        type="number"
                        min="1"
                        step="0.01"
                        name="price"
                        required
                        disabled={isSubmitting}
                        placeholder="39.00"
                        className="h-12 w-full border border-neutral-700 bg-black px-4 text-sm text-neutral-100 outline-none placeholder:text-neutral-500 focus:border-lime-300 disabled:opacity-70"
                    />
                </div>
                <div className="flex items-end">
                    <label
                        htmlFor="publish"
                        className="inline-flex items-center gap-2 text-neutral-200"
                    >
                        <input
                            id="publish"
                            type="checkbox"
                            name="publish"
                            disabled={isSubmitting}
                            className="h-4 w-4 border-neutral-600 bg-neutral-950 accent-lime-300"
                        />
                        <span className="text-sm">Publish now</span>
                    </label>
                </div>
            </div>

            {/* Primary image */}
            <div>
                <label
                    htmlFor="image"
                    className="block text-xs uppercase tracking-wide text-neutral-400 mb-2"
                >
                    Primary image (front)
                </label>
                <input
                    id="image"
                    type="file"
                    name="image"
                    accept="image/*"
                    required
                    disabled={isSubmitting}
                    onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        revokePreviewUrl(primaryPreview);
                        if (file) {
                            const url = createPreviewUrl(file);
                            setPrimaryPreview(url);
                        } else {
                            setPrimaryPreview(null);
                        }
                    }}
                    className="block text-sm text-neutral-100 file:mr-3 file:border-0 file:bg-lime-300 file:px-3 file:py-2 file:font-black file:text-black file:hover:bg-lime-200 file:cursor-pointer disabled:opacity-70"
                />
                <p className="mt-1 text-[11px] text-neutral-500">
                    Recommended: 1200×1500 JPG/PNG, under 2MB.
                </p>

                {primaryPreview ? (
                    <div className="relative mt-3 inline-block h-40 w-40 overflow-hidden border border-neutral-700 bg-black">
                        <Image
                            src={primaryPreview}
                            alt="Primary preview"
                            width={160}
                            height={160}
                            unoptimized
                            className="w-full h-full object-cover"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                revokePreviewUrl(primaryPreview);
                                setPrimaryPreview(null);
                                // also clear input
                                const input = document.getElementById(
                                    "image"
                                ) as HTMLInputElement | null;
                                if (input) input.value = "";
                            }}
                            className="absolute right-1 top-1 grid h-6 w-6 place-items-center bg-black/70 text-white"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ) : null}
            </div>

            {/* Back image */}
            <div>
                <label
                    htmlFor="image_back"
                    className="block text-xs uppercase tracking-wide text-neutral-400 mb-2"
                >
                    Back image (optional)
                </label>
                <input
                    id="image_back"
                    type="file"
                    name="image_back"
                    accept="image/*"
                    disabled={isSubmitting}
                    onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        revokePreviewUrl(backPreview);
                        if (file) {
                            const url = createPreviewUrl(file);
                            setBackPreview(url);
                        } else {
                            setBackPreview(null);
                        }
                    }}
                    className="block text-sm text-neutral-100 file:mr-3 file:border-0 file:bg-lime-300 file:px-3 file:py-2 file:font-black file:text-black file:hover:bg-lime-200 file:cursor-pointer disabled:opacity-70"
                />
                <p className="mt-1 text-[11px] text-neutral-500">
                    If supplied, your product card will hover-swap to this image.
                </p>

                {backPreview ? (
                    <div className="relative mt-3 inline-block h-40 w-40 overflow-hidden border border-neutral-700 bg-black">
                        <Image
                            src={backPreview}
                            alt="Back preview"
                            width={160}
                            height={160}
                            unoptimized
                            className="w-full h-full object-cover"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                revokePreviewUrl(backPreview);
                                setBackPreview(null);
                                const input = document.getElementById(
                                    "image_back"
                                ) as HTMLInputElement | null;
                                if (input) input.value = "";
                            }}
                            className="absolute right-1 top-1 grid h-6 w-6 place-items-center bg-black/70 text-white"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ) : null}
            </div>

            {/* Colours (dynamic) */}
            <div className="space-y-3 border border-neutral-800 bg-black p-4">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wide text-neutral-400">
                        Colours (optional)
                    </p>
                    <button
                        type="button"
                        onClick={addColorRow}
                        disabled={isSubmitting}
                        className="bg-neutral-900 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-white hover:bg-neutral-800 disabled:opacity-70"
                    >
                        + Add colour
                    </button>
                </div>

                {colors.map((c, idx) => (
                    <div
                        key={idx}
                        className="grid items-start gap-3 border border-neutral-800 bg-neutral-950 p-3 md:grid-cols-5"
                    >
                        {/* hex */}
                        <div>
                            <label className="block text-[11px] text-neutral-400 mb-1">
                                Hex
                            </label>
                            <input
                                name={`color_${idx}_hex`}
                                defaultValue={c.hex}
                                disabled={isSubmitting}
                                placeholder="#111111"
                                className="h-10 w-full border border-neutral-700 bg-black px-3 text-sm text-white outline-none focus:border-lime-300 disabled:opacity-70"
                            />
                        </div>
                        {/* label */}
                        <div>
                            <label className="block text-[11px] text-neutral-400 mb-1">
                                Label
                            </label>
                            <input
                                name={`color_${idx}_label`}
                                defaultValue={c.label}
                                disabled={isSubmitting}
                                placeholder="Black"
                                className="h-10 w-full border border-neutral-700 bg-black px-3 text-sm text-white outline-none focus:border-lime-300 disabled:opacity-70"
                            />
                        </div>

                        {/* front image for this colour */}
                        <div>
                            <label className="block text-[11px] text-neutral-400 mb-1">
                                Front image
                            </label>

                            <label
                                htmlFor={`color_${idx}_front`}
                                className={`inline-flex cursor-pointer items-center gap-2 bg-neutral-900 px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-white hover:bg-neutral-800 ${isSubmitting ? "cursor-not-allowed opacity-70" : ""
                                    }`}
                            >
                                <ImageIcon className="h-3.5 w-3.5" />
                                Upload image
                            </label>

                            <input
                                id={`color_${idx}_front`}
                                type="file"
                                name={`color_${idx}_front`}
                                accept="image/*"
                                disabled={isSubmitting}
                                onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    handleColorFileChange(idx, "front", file);
                                }}
                                className="hidden"
                            />

                            {c.frontPreview ? (
                                <div className="relative mt-2 h-20 w-20 overflow-hidden border border-neutral-700 bg-black">
                                    <Image
                                        src={c.frontPreview}
                                        alt={`${c.label ?? "colour"} front`}
                                        width={80}
                                        height={80}
                                        unoptimized
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleColorFileChange(idx, "front", null)}
                                        className="absolute right-1 top-1 grid h-5 w-5 place-items-center bg-black/70 text-white"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        {/* back image for this colour */}
                        <div>
                            <label className="block text-[11px] text-neutral-400 mb-1">
                                Back image
                            </label>

                            <label
                                htmlFor={`color_${idx}_back`}
                                className={`inline-flex cursor-pointer items-center gap-2 bg-neutral-900 px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-white hover:bg-neutral-800 ${isSubmitting ? "cursor-not-allowed opacity-70" : ""
                                    }`}
                            >
                                <ImageIcon className="h-3.5 w-3.5" />
                                Upload image
                            </label>

                            <input
                                id={`color_${idx}_back`}
                                type="file"
                                name={`color_${idx}_back`}
                                accept="image/*"
                                disabled={isSubmitting}
                                onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    handleColorFileChange(idx, "back", file);
                                }}
                                className="hidden"
                            />

                            {c.backPreview ? (
                                <div className="relative mt-2 h-20 w-20 overflow-hidden border border-neutral-700 bg-black">
                                    <Image
                                        src={c.backPreview}
                                        alt={`${c.label ?? "colour"} back`}
                                        width={80}
                                        height={80}
                                        unoptimized
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleColorFileChange(idx, "back", null)}
                                        className="absolute right-1 top-1 grid h-5 w-5 place-items-center bg-black/70 text-white"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        {/* remove */}
                        <div className="flex items-center justify-end pt-5">
                            {colors.length > 1 ? (
                                <button
                                    type="button"
                                    onClick={() => removeColorRow(idx)}
                                    disabled={isSubmitting}
                                    className="text-xs text-red-300 hover:text-red-100 disabled:opacity-50"
                                >
                                    Remove
                                </button>
                            ) : (
                                <span className="text-[10px] text-neutral-500">
                                    First colour
                                </span>
                            )}
                        </div>
                    </div>
                ))}

                {/* still send count from client */}
                <input
                    type="hidden"
                    name="colors_count"
                    value={colors.length.toString()}
                />

                <p className="text-[11px] text-neutral-500">
                    Leave blank to skip. If you upload a colour image, it will override
                    the main product image for that colour.
                </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-neutral-500">
                    You can add more images later from the product edit view.
                </p>

                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-12 border border-lime-300 bg-lime-300 px-6 font-black uppercase tracking-[0.08em] text-black hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating…
                        </>
                    ) : (
                        <>
                            <Rocket className="h-4 w-4 mr-2" />
                            Create
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
