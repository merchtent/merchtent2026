"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

export type ArtistPhotoItem = {
    id: string;
    image_path: string;
    caption: string | null;
    sort_order: number | null;
    publicUrl: string;
};

type Props = {
    initialPhotos: ArtistPhotoItem[];
};

export default function ArtistPhotosManager({ initialPhotos }: Props) {
    const [photos, setPhotos] = useState(initialPhotos);
    const [caption, setCaption] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.currentTarget.value = "";
        if (!file) return;

        setError(null);
        setSuccess(null);
        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("caption", caption);

            const res = await fetch("/api/artist-photo-upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.error || "Upload failed");
            }

            setPhotos((current) => [data.photo, ...current].slice(0, 12));
            setCaption("");
            setSuccess("Band photo added.");
        } catch (err) {
            setError(getErrorMessage(err, "Could not upload band photo."));
        } finally {
            setIsUploading(false);
        }
    }

    async function deletePhoto(id: string) {
        setError(null);
        setSuccess(null);
        setDeletingId(id);

        try {
            const res = await fetch("/api/artist-photo-delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || "Delete failed");
            }

            setPhotos((current) => current.filter((photo) => photo.id !== id));
            setSuccess("Band photo removed.");
        } catch (err) {
            setError(getErrorMessage(err, "Could not remove band photo."));
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <section className="border border-neutral-800 bg-neutral-950">
            <div className="border-b border-neutral-800 p-4 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-lime-300">
                            Band photos
                        </p>
                        <h3 className="mt-2 text-2xl font-black uppercase leading-none text-white md:text-3xl">
                            Photos for features and your artist page.
                        </h3>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
                            Upload live shots, promo images, rehearsal photos, or anything that makes the artist feel real.
                            These can appear on your public artist page and in featured spots around the store.
                        </p>
                    </div>
                    <ImagePlus className="h-7 w-7 text-red-500" />
                </div>
            </div>

            <div className="grid gap-4 p-4 md:p-5 lg:grid-cols-[340px_1fr]">
                <div className="border border-neutral-800 bg-black p-4">
                    <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
                        Optional caption
                    </label>
                    <textarea
                        rows={4}
                        value={caption}
                        onChange={(event) => setCaption(event.target.value)}
                        placeholder="Live at The Tote, new promo shoot, backstage before doors..."
                        className="mt-2 w-full border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm leading-6 text-neutral-200 outline-none placeholder:text-neutral-700 focus:border-lime-300"
                    />
                    <label className="mt-4 inline-flex cursor-pointer items-center gap-2 bg-lime-300 px-4 py-3 text-sm font-black uppercase tracking-[0.08em] text-black hover:bg-lime-200">
                        <Upload className="h-4 w-4" />
                        {isUploading ? "Uploading..." : "Upload photo"}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="sr-only"
                            disabled={isUploading}
                        />
                    </label>
                    <p className="mt-3 text-xs leading-5 text-neutral-500">
                        JPG, PNG, or WebP. Stage and landscape shots work best for homepage features.
                    </p>
                </div>

                <div>
                    {photos.length ? (
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {photos.map((photo) => (
                                <article key={photo.id} className="border border-neutral-800 bg-black">
                                    <div className="relative aspect-[4/3] bg-neutral-900">
                                        <Image
                                            src={photo.publicUrl}
                                            alt={photo.caption || "Artist promo photo"}
                                            fill
                                            sizes="(max-width: 768px) 100vw, 280px"
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="flex items-start justify-between gap-3 border-t border-neutral-800 p-3">
                                        <p className="line-clamp-2 text-sm leading-5 text-neutral-300">
                                            {photo.caption || "Band photo"}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => deletePhoto(photo.id)}
                                            disabled={deletingId === photo.id}
                                            className="grid h-9 w-9 shrink-0 place-items-center border border-neutral-700 text-red-400 hover:border-red-500 disabled:opacity-50"
                                            aria-label="Remove band photo"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="grid min-h-[260px] place-items-center border border-dashed border-neutral-800 bg-black p-6 text-center">
                            <div>
                                <ImagePlus className="mx-auto h-10 w-10 text-neutral-600" />
                                <p className="mt-4 text-xl font-black uppercase text-white">No band photos yet</p>
                                <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
                                    Add a few real photos so the storefront has more life than just product mockups.
                                </p>
                            </div>
                        </div>
                    )}

                    {error ? <p className="mt-3 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">{error}</p> : null}
                    {success ? <p className="mt-3 border border-lime-300/40 bg-lime-300/10 px-4 py-3 text-sm font-bold text-lime-200">{success}</p> : null}
                </div>
            </div>
        </section>
    );
}
