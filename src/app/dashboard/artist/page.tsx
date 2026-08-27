// app/dashboard/artist/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import EditArtistHeroForm from "./EditArtistHeroForm";
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

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 bg-black">
                <div className="grid lg:grid-cols-[1fr_auto]">
                    <div className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-400">
                            Artist profile
                        </p>
                        <h1 className="mt-3 text-5xl font-black uppercase leading-[0.86] md:text-7xl">
                            Edit storefront.
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                            Update the public artist story, links, and hero image fans see before they buy.
                        </p>
                    </div>
                    <div className="flex items-end p-5 md:p-8">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 border border-neutral-700 px-5 py-3 text-sm font-black hover:border-red-500"
                        >
                            Back to dashboard
                        </Link>
                    </div>
                </div>
            </section>

            <section className="p-5 md:p-8">
                <div className="border border-neutral-800 bg-neutral-950 p-6 md:p-8">
                    <div className="mb-5">
                        <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-500">
                            Artist name
                        </label>
                        <input
                            value={artist.display_name ?? ""}
                            readOnly
                            className="h-11 w-full cursor-not-allowed border border-neutral-800 bg-black px-3 text-sm text-neutral-200"
                        />
                        <p className="text-[11px] text-neutral-500 mt-1">
                            Display name can’t be edited here.
                        </p>
                    </div>

                    <EditArtistHeroForm
                        artistId={artist.id}
                        displayName={artist.display_name}
                        initialHeroPath={artist.hero_image_path ?? ""}
                        initialHeroUrl={publicStorageUrl("artist-images", artist.hero_image_path)}
                        initialBio={artist.bio}
                        initialWebsiteUrl={artist.website_url}
                        initialFacebookUrl={artist.facebook_url}
                        initialInstagramUrl={artist.instagram_url}
                        initialBandcampUrl={artist.bandcamp_url}
                        initialSpotifyUrl={artist.spotify_url}
                    />
                </div>
            </section>
        </main>
    );
}
