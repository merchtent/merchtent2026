"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function ArtistEditForm({
    artist,
}: {
    artist: any;
}) {
    const router = useRouter();

    const [isPending, startTransition] =
        useTransition();

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
                alert("Failed to save");
                return;
            }

            router.push(
                `/admin/artists/${artist.id}`
            );

            router.refresh();
        });
    };

    return (
        <div className="space-y-6">

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