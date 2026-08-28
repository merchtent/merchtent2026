"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { Heart, Star } from "lucide-react";
import Link from "next/link";
import { toggleSavedArtist, toggleWishlistedProduct } from "@/app/dashboard/saved/actions";

type SavedToggleButtonProps = {
    type: "artist" | "product";
    id: string;
    initialSaved?: boolean;
    variant?: "solid" | "ghost" | "icon";
    className?: string;
};

export default function SavedToggleButton({
    type,
    id,
    initialSaved = false,
    variant = "ghost",
    className = "",
}: SavedToggleButtonProps) {
    const [isPending, startTransition] = useTransition();
    const [saved, setSaved] = useOptimistic(initialSaved);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        fetch(`/api/account/saved-state?type=${type}&id=${id}`, { cache: "no-store" })
            .then((response) => response.ok ? response.json() : null)
            .then((json) => {
                if (mounted && typeof json?.saved === "boolean") setSaved(json.saved);
            })
            .catch(() => undefined);

        return () => {
            mounted = false;
        };
    }, [id, setSaved, type]);
    const Icon = type === "artist" ? Star : Heart;
    const label = saved
        ? type === "artist"
            ? "Saved artist"
            : "In wishlist"
        : type === "artist"
            ? "Save artist"
            : "Add to wishlist";

    const base =
        variant === "solid"
            ? "inline-flex items-center justify-center gap-2 bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-500"
            : variant === "icon"
                ? "inline-flex h-9 w-9 items-center justify-center border border-neutral-700 bg-black/80 text-white hover:border-red-500 hover:text-red-400"
                : "inline-flex items-center justify-center gap-2 border border-neutral-700 px-5 py-3 text-sm font-black text-white hover:border-red-500 hover:text-red-400";

    return (
        <span className="relative inline-flex flex-col items-start">
            <button
                type="button"
                aria-pressed={saved}
                aria-label={label}
                disabled={isPending}
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setError(null);
                    startTransition(async () => {
                        setSaved(!saved);
                        const result =
                            type === "artist"
                                ? await toggleSavedArtist(id)
                                : await toggleWishlistedProduct(id);
                        if (result.ok && typeof result.saved === "boolean") {
                            setSaved(result.saved);
                        } else {
                            setSaved(saved);
                            setError(result.error ?? "Could not save this.");
                        }
                    });
                }}
                className={`${base} ${saved ? "border-red-500 text-red-400" : ""} ${className} disabled:opacity-60`}
            >
                <Icon className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
                {variant === "icon" ? null : label}
            </button>
            {error && variant !== "icon" ? (
                <span className="mt-2 text-xs text-red-300">
                    {error.includes("Sign in") ? (
                        <>
                            <Link href="/auth/sign-in" className="underline">
                                Sign in
                            </Link>{" "}
                            to save this.
                        </>
                    ) : (
                        error
                    )}
                </span>
            ) : null}
        </span>
    );
}
