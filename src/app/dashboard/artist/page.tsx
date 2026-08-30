// app/dashboard/artist/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, Image as ImageIcon, Music2, Radio } from "lucide-react";
import EditArtistHeroForm from "./EditArtistHeroForm";
import ArtistPhotosManager, { type ArtistPhotoItem } from "./ArtistPhotosManager";
import { logger } from "@/lib/logger";
import { requireArtistPage } from "@/lib/auth/artist";
import { publicStorageUrl } from "@/lib/storage";

export const revalidate = 0;

export default async function ArtistProfilePage() {
    const { supabase, user, artist: artistSummary } = await requireArtistPage();

    const { data: artist, error } = await supabase
        .from("artists")
        .select("id, display_name, hero_image_path, bio, website_url, facebook_url, instagram_url, bandcamp_url, spotify_url")
        .eq("id", artistSummary.id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        logger.error("artist dashboard profile load failed", {
            userId: user.id,
            error,
        });
        return notFound();
    }
    if (!artist) return notFound();

    const heroUrl = publicStorageUrl("artist-images", artist.hero_image_path);
    const liveLinks = [
        artist.website_url,
        artist.instagram_url,
        artist.spotify_url,
        artist.bandcamp_url,
        artist.facebook_url,
    ].filter(Boolean).length;

    const { data: photoData, error: photosError } = await supabase
        .from("artist_photos")
        .select("id, image_path, caption, sort_order")
        .eq("artist_id", artist.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(12);

    if (photosError) {
        logger.error("artist dashboard photos load failed", {
            userId: user.id,
            artistId: artist.id,
            error: photosError.message,
        });
    }

    const photos: ArtistPhotoItem[] = ((photoData ?? []) as Array<{
        id: string;
        image_path: string;
        caption: string | null;
        sort_order: number | null;
    }>).map((photo) => ({
        ...photo,
        publicUrl: publicStorageUrl("artist-images", photo.image_path) ?? "/merch-placeholder.svg",
    }));

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 bg-black">
                <div className="grid lg:grid-cols-[1fr_0.72fr]">
                    <div className="relative min-h-[300px] overflow-hidden border-b border-neutral-800 p-5 md:p-7 lg:border-b-0 lg:border-r">
                        {heroUrl ? (
                            <div
                                className="absolute inset-0 opacity-35"
                                style={{ backgroundImage: `url(${heroUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
                            />
                        ) : (
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(239,68,68,0.22),transparent_30%),linear-gradient(135deg,#111,#000_55%,#1f0505)]" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/82 to-black/35" />
                        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.06)_0_1px,transparent_1px_18px)] opacity-30" />

                        <div className="relative z-10 flex min-h-[245px] flex-col justify-between">
                            <Link
                                href="/dashboard"
                                className="inline-flex w-fit items-center gap-2 border border-white/15 bg-black/70 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-neutral-200 hover:border-red-500 hover:text-white"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Dashboard
                            </Link>

                            <div>
                                <p className="inline-flex bg-red-600 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em]">
                                    Artist storefront
                                </p>
                                <h1 className="mt-5 max-w-4xl text-3xl font-black uppercase leading-tight md:text-5xl">
                                    {artist.display_name}
                                </h1>
                                <p className="mt-5 max-w-2xl text-sm font-bold leading-6 text-neutral-300 md:text-base">
                                    Shape the public page fans land on before they back the drop. Make the story, image,
                                    and links feel like the artist, not a blank admin form.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid border-neutral-800 bg-neutral-950 md:grid-cols-3 lg:grid-cols-1">
                        <ProfileStat
                            icon={<ImageIcon className="h-5 w-5" />}
                            label="Hero"
                            value={heroUrl ? "Live" : "Missing"}
                            sub={heroUrl ? "Public image set" : "Add a scene image"}
                        />
                        <ProfileStat
                            icon={<Radio className="h-5 w-5" />}
                            label="Bio"
                            value={artist.bio?.trim() ? "Written" : "Needed"}
                            sub={artist.bio?.trim() ? "Story added" : "Tell fans the vibe"}
                        />
                        <ProfileStat
                            icon={<Music2 className="h-5 w-5" />}
                            label="Links"
                            value={`${liveLinks}/5`}
                            sub="Social and music links"
                        />
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-black">
                <div className="mx-auto max-w-6xl p-5 md:p-8">
                    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-500">
                                Edit profile
                            </p>
                            <h2 className="mt-2 text-2xl font-black uppercase leading-tight md:text-4xl">
                                The bits fans see first.
                            </h2>
                        </div>
                        <Link
                            href={`/artists/${artist.id}`}
                            className="inline-flex items-center gap-2 border border-neutral-700 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] hover:border-red-500"
                        >
                            View public page
                        </Link>
                    </div>
                        <EditArtistHeroForm
                            artistId={artist.id}
                            displayName={artist.display_name}
                            initialHeroPath={artist.hero_image_path ?? ""}
                            initialHeroUrl={heroUrl}
                            initialBio={artist.bio}
                            initialWebsiteUrl={artist.website_url}
                            initialFacebookUrl={artist.facebook_url}
                            initialInstagramUrl={artist.instagram_url}
                            initialBandcampUrl={artist.bandcamp_url}
                            initialSpotifyUrl={artist.spotify_url}
                        />
                        <div className="mt-6">
                            <ArtistPhotosManager initialPhotos={photos} />
                        </div>
                </div>
            </section>
        </main>
    );
}

function ProfileStat({
    icon,
    label,
    value,
    sub,
}: {
    icon: ReactNode;
    label: string;
    value: string;
    sub: string;
}) {
    return (
        <div className="border-b border-r border-neutral-800 p-5 last:border-b-0 md:border-b-0 lg:border-r-0 lg:border-b md:p-7">
            <div className="flex items-center justify-between gap-4 text-red-400">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neutral-500">{label}</p>
                {icon}
            </div>
            <p className="mt-5 text-4xl font-black uppercase leading-none text-white">{value}</p>
            <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-neutral-500">{sub}</p>
        </div>
    );
}
