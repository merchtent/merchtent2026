"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useState, useTransition } from "react";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Polaroid = {
    id?: string;
    image_path: string;
    caption: string;
    instagram_url: string;
};

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

    const [form, setForm] = useState<Polaroid>({
        image_path: "",
        caption: "",
        instagram_url: "",
    });

    const [uploading, setUploading] =
        useState(false);

    useEffect(() => {
        if (polaroid) {
            setForm({
                id: polaroid.id,
                image_path: polaroid.image_path ?? "",
                caption: polaroid.caption ?? "",
                instagram_url: polaroid.instagram_url ?? "",
            });
        } else {
            setForm({
                image_path: "",
                caption: "",
                instagram_url: "",
            });
        }
    }, [polaroid, open]);

    const save = () => {
        if (!form.image_path) {
            alert("Image path is required");
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
                alert(error.message ?? "Failed to save");
                return;
            }

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
                            <img
                                src={form.image_path}
                                alt=""
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

                                        const extension =
                                            file.name
                                                .split(".")
                                                .pop();

                                        const fileName =
                                            `${crypto.randomUUID()}.${extension}`;

                                        const path =
                                            `polaroids/${fileName}`;

                                        const { error } =
                                            await supabase
                                                .storage
                                                .from(
                                                    "backstage-polaroids"
                                                )
                                                .upload(
                                                    path,
                                                    file,
                                                    {
                                                        upsert: false,
                                                    }
                                                );

                                        if (error) {
                                            alert(
                                                error.message
                                            );
                                            return;
                                        }

                                        const {
                                            data: publicUrl
                                        } =
                                            supabase
                                                .storage
                                                .from(
                                                    "backstage-polaroids"
                                                )
                                                .getPublicUrl(
                                                    path
                                                );

                                        setForm({
                                            ...form,
                                            image_path:
                                                publicUrl.publicUrl,
                                        });

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