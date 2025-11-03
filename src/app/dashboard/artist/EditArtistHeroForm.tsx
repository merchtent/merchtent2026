// app/dashboard/artist/EditArtistHeroForm.tsx
"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { updateArtistProfile } from "./actions";

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

    function buildPublicUrl(path: string) {
        if (!path) return null;
        return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artist-images/${encodeURIComponent(
            path
        )}`;
    }

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
                setPreviewUrl(heroPath ? buildPublicUrl(heroPath) : null);
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
        } catch (err: any) {
            setError(err.message ?? "Upload failed");
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-5">
            {/* Display name (read-only) */}
            <div>
                <label className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
                    Artist name
                </label>
                <input
                    value={displayName}
                    disabled
                    className="w-full h-10 rounded-lg bg-neutral-900 border border-neutral-800 px-3 text-sm text-neutral-200"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                    Display name can’t be edited here.
                </p>
            </div>

            {/* upload input */}
            <div>
                <label className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
                    Upload new hero
                </label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-neutral-200 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-500"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                    JPG / PNG. Stored in <code>artist-images</code>. Landscape works best.
                </p>
            </div>

            {/* hero path manual */}
            {/* <div>
                <label className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
                    Hero image path
                </label>
                <input
                    value={heroPath}
                    onChange={(e) => setHeroPath(e.target.value)}
                    placeholder="artist/{id}/hero.jpg"
                    className="w-full h-10 rounded-lg bg-neutral-950 border border-neutral-700 px-3 text-sm text-neutral-200"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                    This is saved to <code>artists.hero_image_path</code>.
                </p>
            </div> */}

            {/* bio */}
            <div>
                <label className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
                    Bio
                </label>
                <textarea
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell fans about the band, current releases, shows, etc."
                    className="w-full rounded-lg bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-neutral-200"
                />
            </div>

            {/* links */}
            <div className="grid md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
                        Website
                    </label>
                    <input
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full h-9 rounded-lg bg-neutral-950 border border-neutral-700 px-2 text-sm text-neutral-200"
                    />
                </div>
                <div>
                    <label className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
                        Facebook
                    </label>
                    <input
                        value={facebookUrl}
                        onChange={(e) => setFacebookUrl(e.target.value)}
                        placeholder="https://facebook.com/yourband"
                        className="w-full h-9 rounded-lg bg-neutral-950 border border-neutral-700 px-2 text-sm text-neutral-200"
                    />
                </div>
                <div>
                    <label className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
                        Instagram
                    </label>
                    <input
                        value={instagramUrl}
                        onChange={(e) => setInstagramUrl(e.target.value)}
                        placeholder="https://instagram.com/yourband"
                        className="w-full h-9 rounded-lg bg-neutral-950 border border-neutral-700 px-2 text-sm text-neutral-200"
                    />
                </div>
                <div>
                    <label className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
                        Bandcamp
                    </label>
                    <input
                        value={bandcampUrl}
                        onChange={(e) => setBandcampUrl(e.target.value)}
                        placeholder="https://yourband.bandcamp.com"
                        className="w-full h-9 rounded-lg bg-neutral-950 border border-neutral-700 px-2 text-sm text-neutral-200"
                    />
                </div>
                <div>
                    <label className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
                        Spotify
                    </label>
                    <input
                        value={spotifyUrl}
                        onChange={(e) => setSpotifyUrl(e.target.value)}
                        placeholder="https://open.spotify.com/artist/..."
                        className="w-full h-9 rounded-lg bg-neutral-950 border border-neutral-700 px-2 text-sm text-neutral-200"
                    />
                </div>
            </div>

            {/* preview */}
            <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-neutral-400">
                    Preview
                </p>
                <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 min-h-[140px] grid place-items-center">
                    {previewUrl ? (
                        <div className="relative w-full h-40 rounded-lg overflow-hidden">
                            <Image
                                src={previewUrl}
                                alt="Hero image preview"
                                fill
                                className="object-cover"
                            />
                        </div>
                    ) : (
                        <p className="text-xs text-neutral-500">
                            No image. Upload or enter a path to preview.
                        </p>
                    )}
                </div>
            </div>

            {error ? (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">
                    {error}
                </p>
            ) : null}
            {success ? (
                <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
                    {success}
                </p>
            ) : null}

            <button
                type="submit"
                disabled={isPending || isUploading}
                className="inline-flex items-center gap-2 h-10 rounded-xl bg-red-600 hover:bg-red-500 text-white px-6 text-sm font-semibold disabled:opacity-50"
            >
                {isPending ? "Saving…" : "Save profile"}
            </button>
            {isUploading ? (
                <p className="text-[11px] text-neutral-500 mt-1">Uploading…</p>
            ) : null}
        </form>
    );
}
