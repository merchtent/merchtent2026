"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import PolaroidModal from "./PolaroidModal";

export default function PolaroidsSection({
    polaroids,
}: {
    polaroids: any[];
}) {
    const router = useRouter();

    const [open, setOpen] = useState(false);

    const [selected, setSelected] =
        useState<any>(null);

    const deletePolaroid = async (
        id: string
    ) => {
        if (
            !confirm(
                "Delete this polaroid?"
            )
        ) {
            return;
        }

        await fetch(
            `/api/admin/polaroids/${id}`,
            {
                method: "DELETE",
            }
        );

        router.refresh();
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

                                <div className="aspect-square">

                                    <img
                                        src={
                                            photo.image_path
                                        }
                                        alt=""
                                        className="
                                            h-full
                                            w-full
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
                                            onClick={() =>
                                                deletePolaroid(
                                                    photo.id
                                                )
                                            }
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
                open={open}
                onClose={() =>
                    setOpen(false)
                }
                onSaved={() =>
                    router.refresh()
                }
                polaroid={selected}
            />
        </>
    );
}