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
        text-xs
        font-black
        uppercase
        tracking-[0.14em]
        transition
        ${isPending
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer"
                    }
        ${isPublic
                        ? "bg-[#b6ff3f] text-black border border-[#b6ff3f]"
                        : "bg-black text-white/45 border border-white/15"
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
        text-xs
        font-black
        uppercase
        tracking-[0.14em]
        transition
        ${isPending
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer"
                    }
        ${featured
                        ? "bg-red-600 text-white border border-red-500"
                        : "bg-black text-white/45 border border-white/15"
                    }
    `}
            >
                FEATURED
            </button>

        </div>
    );
}
