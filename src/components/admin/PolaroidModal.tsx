"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useToast } from "@/components/ToastProvider";

type Polaroid = {
    id?: string;
    image_path: string;
    caption: string;
    instagram_url: string;
};

const emptyPolaroid: Polaroid = {
    image_path: "",
    caption: "",
    instagram_url: "",
};

function initialPolaroidForm(polaroid?: Polaroid | null): Polaroid {
    return polaroid
        ? {
            id: polaroid.id,
            image_path: polaroid.image_path ?? "",
            caption: polaroid.caption ?? "",
            instagram_url: polaroid.instagram_url ?? "",
        }
        : emptyPolaroid;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
    polaroid?: Polaroid | null;
}

export default function PolaroidModal({
    open,
    onClose,
    onSaved,
    polaroid,
}: Props) {
    const [isPending, startTransition] = useTransition();
    const toast = useToast();

    const [form, setForm] = useState<Polaroid>(() => initialPolaroidForm(polaroid));
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [uploading, setUploading] =
        useState(false);

    const save = () => {
        setErrorMessage(null);

        if (!form.image_path) {
            const message = "Image path is required.";
            setErrorMessage(message);
            toast({ title: "Polaroid not saved", description: message, variant: "error" });
            return;
        }

        startTransition(async () => {
            const response = await fetch(
                form.id
                    ? `/api/admin/polaroids/${form.id}`
                    : "/api/admin/polaroids",
                {
                    method: form.id ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(form),
                }
            );

            if (!response.ok) {
                const error = await response.json();
                const message = error.message ?? "Failed to save polaroid.";
                setErrorMessage(message);
                toast({ title: "Polaroid not saved", description: message, variant: "error" });
                return;
            }

            toast({
                title: form.id ? "Polaroid updated" : "Polaroid added",
                variant: "success",
            });
            onSaved();
            onClose();
        });
    };

    if (!open) return null;

    return (
        <div
            className="
                fixed inset-0 z-50
                bg-black/70
                backdrop-blur-sm
                flex items-center justify-center
                p-4
            "
        >
            <div
                className="
                    w-full
                    max-w-2xl
                    bg-neutral-900
                    border
                    border-neutral-800
                    rounded-2xl
                    overflow-hidden
                "
            >
                {/* HEADER */}

                <div className="
                    flex
                    items-center
                    justify-between
                    px-6
                    py-5
                    border-b
                    border-neutral-800
                ">
                    <h2 className="text-2xl font-black">
                        {form.id
                            ? "Edit Polaroid"
                            : "Add Polaroid"}
                    </h2>

                    <button
                        onClick={onClose}
                        className="
                            text-neutral-400
                            hover:text-white
                            transition
                        "
                    >
                        ✕
                    </button>
                </div>

                {/* BODY */}

                <div className="p-6 space-y-5">
                    {errorMessage ? (
                        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                            {errorMessage}
                        </p>
                    ) : null}

                    {/* PREVIEW */}

                    {form.image_path && (
                        <div className="
                            mx-auto
                            w-56
                            bg-white
                            p-3
                            rounded-sm
                            shadow-xl
                            rotate-1
                        ">
                            <Image
                                src={form.image_path}
                                alt=""
                                width={224}
                                height={224}
                                unoptimized
                                className="
        w-full
        aspect-square
        object-cover
    "
                            />

                            <div className="
                                text-black
                                text-center
                                mt-4
                                text-sm
                                font-medium
                                min-h-[40px]
                            ">
                                {form.caption || "Preview Caption"}
                            </div>
                        </div>
                    )}

                    {/* IMAGE */}

                    <div>


                        <div>

                            <label className="
        block
        mb-2
        text-sm
        text-neutral-400
    ">
                                Upload Image
                            </label>

                            <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {

                                    const file =
                                        e.target.files?.[0];

                                    if (!file) return;

                                    try {

                                        setUploading(true);
                                        setErrorMessage(null);

                                        const uploadData =
                                            new FormData();
                                        uploadData.set(
                                            "file",
                                            file
                                        );

                                        const response =
                                            await fetch(
                                                "/api/admin/polaroids/upload",
                                                {
                                                    method: "POST",
                                                    body: uploadData,
                                                }
                                            );

                                        const result =
                                            await response.json();

                                        if (!response.ok) {
                                            const message =
                                                result.message ??
                                                "Upload failed";
                                            setErrorMessage(message);
                                            toast({ title: "Upload failed", description: message, variant: "error" });
                                            return;
                                        }

                                        setForm({
                                            ...form,
                                            image_path:
                                                result.publicUrl,
                                        });
                                        toast({ title: "Image uploaded", variant: "success" });

                                    } finally {

                                        setUploading(
                                            false
                                        );

                                    }
                                }}
                                className="
            w-full
            bg-neutral-950
            border
            border-neutral-700
            rounded-xl
            px-4
            py-3
        "
                            />

                        </div>

                        {uploading && (
                            <div className="
        text-sm
        text-neutral-500
        mt-2
    ">
                                Uploading...
                            </div>
                        )}
                    </div>

                    {/* CAPTION */}

                    <div>
                        <label className="
                            block
                            mb-2
                            text-sm
                            text-neutral-400
                        ">
                            Caption
                        </label>

                        <textarea
                            rows={4}
                            value={form.caption}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    caption: e.target.value,
                                })
                            }
                            className="
                                w-full
                                bg-neutral-950
                                border
                                border-neutral-700
                                rounded-xl
                                px-4
                                py-3
                            "
                        />
                    </div>

                    {/* INSTAGRAM */}

                    <div>
                        <label className="
                            block
                            mb-2
                            text-sm
                            text-neutral-400
                        ">
                            Instagram URL
                        </label>

                        <input
                            value={form.instagram_url}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    instagram_url:
                                        e.target.value,
                                })
                            }
                            placeholder="https://instagram.com/..."
                            className="
                                w-full
                                bg-neutral-950
                                border
                                border-neutral-700
                                rounded-xl
                                px-4
                                py-3
                            "
                        />
                    </div>

                </div>

                {/* FOOTER */}

                <div
                    className="
                        flex
                        justify-end
                        gap-3
                        px-6
                        py-5
                        border-t
                        border-neutral-800
                    "
                >
                    <button
                        onClick={onClose}
                        className="
                            px-4
                            py-3
                            rounded-xl
                            bg-neutral-800
                            hover:bg-neutral-700
                        "
                    >
                        Cancel
                    </button>

                    <button
                        onClick={save}
                        disabled={isPending}
                        className="
                            px-5
                            py-3
                            rounded-xl
                            bg-red-600
                            hover:bg-red-500
                            font-semibold
                            disabled:opacity-50
                        "
                    >
                        {isPending
                            ? "Saving..."
                            : "Save Polaroid"}
                    </button>
                </div>
            </div>
        </div>
    );
}
