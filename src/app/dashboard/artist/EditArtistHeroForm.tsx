// app/dashboard/artist/EditArtistHeroForm.tsx
"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { ArrowRight, ExternalLink, ImageUp, Instagram, Link as LinkIcon, Music, Save, Upload } from "lucide-react";
import { updateArtistProfile } from "./actions";
import { getErrorMessage } from "@/lib/errors";
import { publicStorageUrl } from "@/lib/storage";

type Props = {
    artistId: string;
    displayName: string;
    initialHeroPath: string;
    initialHeroUrl: string | null;
    initialBio: string | null;
    initialWebsiteUrl: string | null;
    initialFacebookUrl: string | null;
    initialInstagramUrl: string | null;
    initialBandcampUrl: string | null;
    initialSpotifyUrl: string | null;
};

export default function EditArtistHeroForm({
    artistId,
    displayName,
    initialHeroPath,
    initialHeroUrl,
    initialBio,
    initialWebsiteUrl,
    initialFacebookUrl,
    initialInstagramUrl,
    initialBandcampUrl,
    initialSpotifyUrl,
}: Props) {
    const [heroPath, setHeroPath] = useState(initialHeroPath);
    const [previewUrl, setPreviewUrl] = useState(initialHeroUrl);
    const [bio, setBio] = useState(initialBio ?? "");
    const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl ?? "");
    const [facebookUrl, setFacebookUrl] = useState(initialFacebookUrl ?? "");
    const [instagramUrl, setInstagramUrl] = useState(initialInstagramUrl ?? "");
    const [bandcampUrl, setBandcampUrl] = useState(initialBandcampUrl ?? "");
    const [spotifyUrl, setSpotifyUrl] = useState(initialSpotifyUrl ?? "");

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [isUploading, setIsUploading] = useState(false);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        startTransition(async () => {
            const res = await updateArtistProfile({
                artistId,
                hero_image_path: heroPath,
                bio,
                website_url: websiteUrl,
                facebook_url: facebookUrl,
                instagram_url: instagramUrl,
                bandcamp_url: bandcampUrl,
                spotify_url: spotifyUrl,
            });
            if (res.error) {
                setError(res.error);
            } else {
                setSuccess("Artist profile updated.");
                setPreviewUrl(publicStorageUrl("artist-images", heroPath));
            }
        });
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setSuccess(null);
        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/artist-hero-upload", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || "Upload failed");
            }

            // we got { path, publicUrl }
            setHeroPath(data.path);
            setPreviewUrl(data.publicUrl);
            setSuccess("Uploaded image. Don’t forget to Save.");
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Upload failed"));
        } finally {
            setIsUploading(false);
        }
    }

    const links = [
        { label: "Website", value: websiteUrl, setValue: setWebsiteUrl, placeholder: "https://example.com", icon: ExternalLink },
        { label: "Instagram", value: instagramUrl, setValue: setInstagramUrl, placeholder: "https://instagram.com/yourband", icon: Instagram },
        { label: "Spotify", value: spotifyUrl, setValue: setSpotifyUrl, placeholder: "https://open.spotify.com/artist/...", icon: Music },
        { label: "Bandcamp", value: bandcampUrl, setValue: setBandcampUrl, placeholder: "https://yourband.bandcamp.com", icon: Music },
        { label: "Facebook", value: facebookUrl, setValue: setFacebookUrl, placeholder: "https://facebook.com/yourband", icon: LinkIcon },
    ];

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <section className="border border-neutral-800 bg-neutral-950">
                <div className="border-b border-neutral-800 p-4 md:p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-500">
                        Storefront details
                    </p>
                    <h3 className="mt-2 text-2xl font-black uppercase leading-none text-white md:text-3xl">
                        Artist profile basics.
                    </h3>
                </div>

                <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
                    <div className="space-y-5 p-4 md:p-5">
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
                                Artist name
                            </label>
                            <div className="mt-2 border border-neutral-800 bg-black px-4 py-3">
                                <p className="text-lg font-black uppercase leading-none text-white">{displayName}</p>
                                <p className="mt-1 text-xs text-neutral-500">Locked here for now.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
                                Hero image
                            </label>
                            <div className="mt-2 flex flex-wrap items-center gap-3">
                                <label className="inline-flex cursor-pointer items-center gap-2 bg-lime-300 px-4 py-3 text-sm font-black uppercase tracking-[0.08em] text-black hover:bg-lime-200">
                                    <Upload className="h-4 w-4" />
                                    {isUploading ? "Uploading..." : "Choose image"}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="sr-only"
                                    />
                                </label>
                                <span className="text-sm text-neutral-500">Landscape stage, room, artwork, or crowd image.</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
                                Artist story
                            </label>
                        <textarea
                            rows={7}
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Tell fans about the band, current releases, shows, tour energy, and why this drop exists."
                                className="mt-2 w-full border border-neutral-700 bg-black px-4 py-3 text-sm leading-6 text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-lime-300"
                        />
                        <p className="mt-2 text-xs text-neutral-500">
                            Keep it human. A few specific details beat a polished press release.
                        </p>
                    </div>
                    </div>

                    <aside className="border-t border-neutral-800 bg-black p-4 lg:border-l lg:border-t-0 md:p-5">
                        <div className="flex items-center gap-2 text-[#b7ff3c]">
                            <ImageUp className="h-4 w-4" />
                            <p className="text-[11px] font-black uppercase tracking-[0.18em]">Preview</p>
                        </div>
                        <div className="mt-3 border border-neutral-800 bg-neutral-950 p-2">
                            {previewUrl ? (
                                <div className="relative h-52 w-full overflow-hidden">
                                    <Image
                                        src={previewUrl}
                                        alt="Hero image preview"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="grid h-52 place-items-center bg-neutral-900 text-center text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
                                    No hero image yet
                                </div>
                            )}
                        </div>
                        <p className="mt-3 text-xs leading-5 text-neutral-500">
                            This is the image used on the public artist page.
                        </p>
                    </aside>
                </div>
            </section>

            <section className="border border-neutral-800 bg-neutral-950 p-4 md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-[#b7ff3c]">
                        <LinkIcon className="h-5 w-5" />
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.18em]">Links</p>
                            <p className="mt-1 text-sm text-neutral-500">Add the places fans should follow or listen.</p>
                        </div>
                    </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {links.map((link) => {
                            const Icon = link.icon;
                            return (
                            <label key={link.label} className="block">
                                    <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
                                        <Icon className="h-4 w-4 text-[#b7ff3c]" />
                                        {link.label}
                                    </span>
                                    <input
                                        value={link.value}
                                        onChange={(e) => link.setValue(e.target.value)}
                                        placeholder={link.placeholder}
                                    className="mt-2 h-11 w-full border border-neutral-700 bg-black px-3 text-sm text-neutral-200 outline-none placeholder:text-neutral-700 focus:border-lime-300"
                                    />
                                </label>
                            );
                        })}
                </div>
            </section>

            {error ? (
                <p className="border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
                    {error}
                </p>
            ) : null}
            {success ? (
                <p className="border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-bold text-green-300">
                    {success}
                </p>
            ) : null}

            <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 border border-neutral-800 bg-black/90 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">
                    {isUploading ? "Uploading hero image..." : "Save changes before checking the public page."}
                </p>
                <button
                    type="submit"
                    disabled={isPending || isUploading}
                    className="inline-flex min-h-12 items-center gap-2 bg-lime-300 px-6 text-sm font-black uppercase tracking-[0.08em] text-black hover:bg-lime-200 disabled:opacity-50"
                >
                    <Save className="h-4 w-4" />
                    {isPending ? "Saving..." : "Save profile"}
                    <ArrowRight className="h-4 w-4" />
                </button>
            </div>
        </form>
    );
}
