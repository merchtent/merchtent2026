"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

type EditableArtist = {
    id: string;
    display_name?: string | null;
    slug?: string | null;
    bio?: string | null;
    instagram_url?: string | null;
    spotify_url?: string | null;
    bandcamp_url?: string | null;
    website_url?: string | null;
};

export default function ArtistEditForm({
    artist,
}: {
    artist: EditableArtist;
}) {
    const router = useRouter();
    const toast = useToast();

    const [isPending, startTransition] =
        useTransition();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [form, setForm] = useState({
        display_name:
            artist.display_name ?? "",
        slug:
            artist.slug ?? "",
        bio:
            artist.bio ?? "",
        instagram_url:
            artist.instagram_url ?? "",
        spotify_url:
            artist.spotify_url ?? "",
        bandcamp_url:
            artist.bandcamp_url ?? "",
        website_url:
            artist.website_url ?? "",
    });

    const save = () => {
        setErrorMessage(null);

        startTransition(async () => {

            const response = await fetch(
                `/api/admin/artists/${artist.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify(form),
                }
            );

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                const message = payload?.error ?? payload?.message ?? "Failed to save artist.";
                setErrorMessage(message);
                toast({ title: "Artist not saved", description: message, variant: "error" });
                return;
            }

            toast({ title: "Artist saved", variant: "success" });
            router.push(
                `/admin/artists/${artist.id}`
            );

            router.refresh();
        });
    };

    return (
        <div className="space-y-6">
            {errorMessage ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {errorMessage}
                </p>
            ) : null}

            <div>
                <label className="block mb-2 text-sm text-neutral-400">
                    Display Name
                </label>

                <input
                    value={form.display_name}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            display_name:
                                e.target.value,
                        })
                    }
                    className="w-full rounded-xl bg-neutral-900 border border-neutral-700 p-3"
                />
            </div>

            <div>
                <label className="block mb-2 text-sm text-neutral-400">
                    Slug
                </label>

                <input
                    value={form.slug}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            slug:
                                e.target.value,
                        })
                    }
                    className="w-full rounded-xl bg-neutral-900 border border-neutral-700 p-3"
                />
            </div>

            <div>
                <label className="block mb-2 text-sm text-neutral-400">
                    Bio
                </label>

                <textarea
                    rows={8}
                    value={form.bio}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            bio:
                                e.target.value,
                        })
                    }
                    className="w-full rounded-xl bg-neutral-900 border border-neutral-700 p-3"
                />
            </div>

            <div className="grid md:grid-cols-2 gap-4">

                <div>
                    <label className="block mb-2 text-sm text-neutral-400">
                        Instagram
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
                        className="w-full rounded-xl bg-neutral-900 border border-neutral-700 p-3"
                    />
                </div>

                <div>
                    <label className="block mb-2 text-sm text-neutral-400">
                        Spotify
                    </label>

                    <input
                        value={form.spotify_url}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                spotify_url:
                                    e.target.value,
                            })
                        }
                        className="w-full rounded-xl bg-neutral-900 border border-neutral-700 p-3"
                    />
                </div>

                <div>
                    <label className="block mb-2 text-sm text-neutral-400">
                        Bandcamp
                    </label>

                    <input
                        value={form.bandcamp_url}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                bandcamp_url:
                                    e.target.value,
                            })
                        }
                        className="w-full rounded-xl bg-neutral-900 border border-neutral-700 p-3"
                    />
                </div>

                <div>
                    <label className="block mb-2 text-sm text-neutral-400">
                        Website
                    </label>

                    <input
                        value={form.website_url}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                website_url:
                                    e.target.value,
                            })
                        }
                        className="w-full rounded-xl bg-neutral-900 border border-neutral-700 p-3"
                    />
                </div>

            </div>

            <button
                onClick={save}
                disabled={isPending}
                className="
                    bg-red-600
                    hover:bg-red-500
                    px-6
                    py-3
                    rounded-xl
                    font-semibold
                "
            >
                {isPending
                    ? "Saving..."
                    : "Save Artist"}
            </button>

        </div>
    );
}
