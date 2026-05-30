"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";



export default function ArtistToggleButtons({
    artistId,
    featured,
    isPublic,
}: {
    artistId: string;
    featured: boolean;
    isPublic: boolean;
}) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const toggleFeatured = () => {
        startTransition(async () => {
            await fetch(
                `/api/admin/artists/${artistId}/toggle-featured`,
                {
                    method: "POST",
                }
            );

            router.refresh();
        });
    };

    const togglePublic = () => {
        startTransition(async () => {
            await fetch(
                `/api/admin/artists/${artistId}/toggle-public`,
                {
                    method: "POST",
                }
            );

            router.refresh();
        });
    };

    return (
        <div className="flex gap-2">

            <button
                onClick={togglePublic}
                disabled={isPending}
                className={`
        px-2
        py-1
        rounded-lg
        text-xs
        font-semibold
        transition
        ${isPending
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer"
                    }
        ${isPublic
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                    }
    `}
            >
                {isPublic ? "PUBLIC" : "HIDDEN"}
            </button>

            <button
                onClick={toggleFeatured}
                disabled={isPending}
                className={`
        px-2
        py-1
        rounded-lg
        text-xs
        font-semibold
        transition
        ${isPending
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer"
                    }
        ${isPublic
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                    }
    `}
            >
                FEATURED
            </button>

        </div>
    );
}