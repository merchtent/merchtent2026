"use client";

import { useState, useEffect } from "react";
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

    // top-level product image previews
    const [primaryPreview, setPrimaryPreview] = useState<string | null>(null);
    const [backPreview, setBackPreview] = useState<string | null>(null);

    // clean up object URLs when component unmounts
    useEffect(() => {
        return () => {
            if (primaryPreview) URL.revokeObjectURL(primaryPreview);
            if (backPreview) URL.revokeObjectURL(backPreview);
            colors.forEach((c) => {
                if (c.frontPreview) URL.revokeObjectURL(c.frontPreview);
                if (c.backPreview) URL.revokeObjectURL(c.backPreview);
            });
        };
        // we intentionally don't put colors in deps to avoid revoking on every change
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            if (target?.frontPreview) URL.revokeObjectURL(target.frontPreview);
            if (target?.backPreview) URL.revokeObjectURL(target.backPreview);
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
                    URL.revokeObjectURL(row.frontPreview);
                }
                if (kind === "back" && row.backPreview) {
                    URL.revokeObjectURL(row.backPreview);
                }

                if (!file) {
                    return {
                        ...row,
                        ...(kind === "front"
                            ? { frontPreview: null }
                            : { backPreview: null }),
                    };
                }

                const url = URL.createObjectURL(file);
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

        try {
            const formData = new FormData(e.currentTarget);
            // tell server how many colours we had (to loop over color_0_..., color_1_..., etc.)
            formData.set("colors_count", String(colors.length));

            await createProductAction(formData);
            // server action will redirect on success
        } catch (err) {
            console.error(err);
            setIsSubmitting(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            encType="multipart/form-data"
            className="space-y-6"
        >
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
                    className="w-full h-11 rounded-xl bg-neutral-950 border border-neutral-700 px-3 text-sm text-neutral-100 placeholder:text-neutral-500 disabled:opacity-70"
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
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 disabled:opacity-70"
                />
                <p className="mt-1 text-[11px] text-neutral-500">
                    Tip: keep it short; details like care/shipping can live in accordions
                    on the PDP.
                </p>
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
                        className="w-full h-11 rounded-xl bg-neutral-950 border border-neutral-700 px-3 text-sm text-neutral-100 placeholder:text-neutral-500 disabled:opacity-70"
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
                            className="h-4 w-4 rounded border-neutral-600 bg-neutral-950 accent-red-500"
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
                        if (primaryPreview) URL.revokeObjectURL(primaryPreview);
                        if (file) {
                            const url = URL.createObjectURL(file);
                            setPrimaryPreview(url);
                        } else {
                            setPrimaryPreview(null);
                        }
                    }}
                    className="block text-sm text-neutral-100 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-neutral-800 file:text-neutral-100 file:hover:bg-neutral-700 file:cursor-pointer disabled:opacity-70"
                />
                <p className="mt-1 text-[11px] text-neutral-500">
                    Recommended: 1200×1500 JPG/PNG, under 2MB.
                </p>

                {primaryPreview ? (
                    <div className="mt-3 inline-block relative rounded-lg overflow-hidden border border-neutral-700 bg-neutral-900 w-40 h-40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={primaryPreview}
                            alt="Primary preview"
                            className="w-full h-full object-cover"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                URL.revokeObjectURL(primaryPreview);
                                setPrimaryPreview(null);
                                // also clear input
                                const input = document.getElementById(
                                    "image"
                                ) as HTMLInputElement | null;
                                if (input) input.value = "";
                            }}
                            className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 grid place-items-center text-white"
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
                        if (backPreview) URL.revokeObjectURL(backPreview);
                        if (file) {
                            const url = URL.createObjectURL(file);
                            setBackPreview(url);
                        } else {
                            setBackPreview(null);
                        }
                    }}
                    className="block text-sm text-neutral-100 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-neutral-800 file:text-neutral-100 file:hover:bg-neutral-700 file:cursor-pointer disabled:opacity-70"
                />
                <p className="mt-1 text-[11px] text-neutral-500">
                    If supplied, your product card will hover-swap to this image.
                </p>

                {backPreview ? (
                    <div className="mt-3 inline-block relative rounded-lg overflow-hidden border border-neutral-700 bg-neutral-900 w-40 h-40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={backPreview}
                            alt="Back preview"
                            className="w-full h-full object-cover"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                URL.revokeObjectURL(backPreview);
                                setBackPreview(null);
                                const input = document.getElementById(
                                    "image_back"
                                ) as HTMLInputElement | null;
                                if (input) input.value = "";
                            }}
                            className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 grid place-items-center text-white"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ) : null}
            </div>

            {/* Colours (dynamic) */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/30 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wide text-neutral-400">
                        Colours (optional)
                    </p>
                    <button
                        type="button"
                        onClick={addColorRow}
                        disabled={isSubmitting}
                        className="text-xs bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1 rounded-lg disabled:opacity-70"
                    >
                        + Add colour
                    </button>
                </div>

                {colors.map((c, idx) => (
                    <div
                        key={idx}
                        className="grid md:grid-cols-5 gap-3 items-start rounded-lg bg-neutral-950/40 p-3"
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
                                className="w-full h-9 rounded-lg bg-neutral-950 border border-neutral-700 px-2 text-sm disabled:opacity-70 text-white"
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
                                className="w-full h-9 rounded-lg bg-neutral-950 border border-neutral-700 px-2 text-sm disabled:opacity-70 text-white"
                            />
                        </div>

                        {/* front image for this colour */}
                        <div>
                            <label className="block text-[11px] text-neutral-400 mb-1">
                                Front image
                            </label>

                            <label
                                htmlFor={`color_${idx}_front`}
                                className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-500 text-white cursor-pointer ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""
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
                                <div className="mt-2 w-20 h-20 rounded-md overflow-hidden border border-neutral-700 relative bg-neutral-900">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={c.frontPreview}
                                        alt={`${c.label ?? "colour"} front`}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleColorFileChange(idx, "front", null)}
                                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 text-white grid place-items-center"
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
                                className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-500 text-white cursor-pointer ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""
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
                                <div className="mt-2 w-20 h-20 rounded-md overflow-hidden border border-neutral-700 relative bg-neutral-900">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={c.backPreview}
                                        alt={`${c.label ?? "colour"} back`}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleColorFileChange(idx, "back", null)}
                                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 text-white grid place-items-center"
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
                    className="relative h-11 px-6 font-black tracking-wide bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 border border-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ clipPath: "polygon(1% 0,100% 0,99% 100%,0 100%)" }}
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
