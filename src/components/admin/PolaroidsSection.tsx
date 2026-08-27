"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

import PolaroidModal from "./PolaroidModal";

type Polaroid = {
    id: string;
    image_path: string;
    caption: string;
    instagram_url: string;
};

export default function PolaroidsSection({
    polaroids,
}: {
    polaroids: Polaroid[];
}) {
    const router = useRouter();

    const [open, setOpen] = useState(false);

    const [selected, setSelected] =
        useState<Polaroid | null>(null);
    const [pendingDelete, setPendingDelete] =
        useState<Polaroid | null>(null);
    const [deleteError, setDeleteError] =
        useState<string | null>(null);
    const [isDeleting, setIsDeleting] =
        useState(false);

    const deletePolaroid = async () => {
        if (!pendingDelete) return;

        setIsDeleting(true);
        setDeleteError(null);

        try {
            const response = await fetch(
                `/api/admin/polaroids/${pendingDelete.id}`,
                {
                    method: "DELETE",
                }
            );

            if (!response.ok) {
                throw new Error("Delete failed");
            }

            setPendingDelete(null);
            router.refresh();
        } catch {
            setDeleteError("Could not delete this polaroid.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="
                bg-neutral-900
                border
                border-neutral-800
                rounded-2xl
                p-6
            ">

                <div className="
                    flex
                    items-center
                    justify-between
                    mb-6
                ">

                    <div>

                        <h2 className="text-xl font-black">
                            Backstage Polaroids
                        </h2>

                        <p className="
                            text-sm
                            text-neutral-500
                            mt-1
                        ">
                            Behind the scenes content.
                        </p>

                    </div>

                    <button
                        onClick={() => {
                            setSelected(null);
                            setOpen(true);
                        }}
                        className="
                            bg-red-600
                            hover:bg-red-500
                            px-4
                            py-2
                            rounded-xl
                            font-semibold
                        "
                    >
                        Add Polaroid
                    </button>

                </div>

                <div className="
                    grid
                    sm:grid-cols-2
                    lg:grid-cols-3
                    xl:grid-cols-4
                    gap-5
                ">

                    {polaroids.map(
                        (photo) => (
                            <div
                                key={photo.id}
                                className="
                                    bg-neutral-950
                                    border
                                    border-neutral-800
                                    rounded-2xl
                                    overflow-hidden
                                "
                            >

                                <div className="relative aspect-square">

                                    <Image
                                        src={
                                            photo.image_path
                                        }
                                        alt=""
                                        fill
                                        sizes="(max-width:640px) 50vw, (max-width:1280px) 25vw, 20vw"
                                        className="
                                            object-cover
                                        "
                                    />

                                </div>

                                <div className="p-4">

                                    <div className="
                                        text-sm
                                        text-neutral-300
                                        line-clamp-3
                                        min-h-[60px]
                                    ">
                                        {
                                            photo.caption
                                        }
                                    </div>

                                    <div className="
                                        flex
                                        gap-2
                                        mt-4
                                    ">

                                        <button
                                            onClick={() => {
                                                setSelected(
                                                    photo
                                                );

                                                setOpen(
                                                    true
                                                );
                                            }}
                                            className="
                                                flex-1
                                                px-3
                                                py-2
                                                rounded-lg
                                                bg-neutral-800
                                                hover:bg-neutral-700
                                            "
                                        >
                                            Edit
                                        </button>

                                        <button
                                            onClick={() => {
                                                setDeleteError(null);
                                                setPendingDelete(photo);
                                            }}
                                            className="
                                                px-3
                                                py-2
                                                rounded-lg
                                                bg-red-600
                                                hover:bg-red-500
                                            "
                                        >
                                            Delete
                                        </button>

                                    </div>

                                </div>

                            </div>
                        )
                    )}

                </div>

            </div>

            <PolaroidModal
                key={selected?.id ?? "new-polaroid"}
                open={open}
                onClose={() =>
                    setOpen(false)
                }
                onSaved={() =>
                    router.refresh()
                }
                polaroid={selected}
            />

            {pendingDelete && (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-polaroid-title"
                >
                    <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl">
                        <h3
                            id="delete-polaroid-title"
                            className="text-lg font-bold"
                        >
                            Delete polaroid
                        </h3>
                        <p className="mt-2 text-sm text-neutral-400">
                            Remove this backstage polaroid? This cannot be undone.
                        </p>
                        {deleteError && (
                            <p className="mt-3 text-sm text-red-300" role="alert">
                                {deleteError}
                            </p>
                        )}
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setPendingDelete(null)}
                                disabled={isDeleting}
                                className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-semibold hover:bg-neutral-700 disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={deletePolaroid}
                                disabled={isDeleting}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500 disabled:opacity-60"
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
