// app/dashboard/artist/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import EditArtistHeroForm from "./EditArtistHeroForm";

function publicImageUrl(path?: string | null) {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artist-images/${encodeURIComponent(
        path
    )}`;
    // ↑ if you're storing in a different bucket, change here
}

export const revalidate = 0;

export default async function ArtistProfilePage() {
    const supabase = getServerSupabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        <p>You must be signed in.</p>
                        <p className="mt-2">
                            <Link href="/auth/sign-in" className="underline">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    const { data: artist, error } = await supabase
        .from("artists")
        .select("id, display_name, hero_image_path, bio, website_url, facebook_url, instagram_url, bandcamp_url, spotify_url")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        console.error(error);
        return notFound();
    }
    if (!artist) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-100">
                <div className="max-w-5xl mx-auto px-4 py-10">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                        <p>No artist profile found for your account.</p>
                        <p className="mt-2">
                            <Link href="/auth/sign-up" className="underline">
                                Create artist profile
                            </Link>
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    const previewUrl = artist.hero_image_path
        ? publicImageUrl(artist.hero_image_path)
        : null;

    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* angled banner */}
            <section className="relative py-0 mb-6">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">
                                Artist Dashboard
                            </p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                Edit artist profile
                            </h1>
                            <p className="text-xs text-neutral-600 mt-1">
                                You can change your hero image here.
                            </p>
                        </div>
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 text-xs border px-3 py-1 rounded-lg"
                        >
                            Back to dashboard
                        </Link>
                    </div>
                </div>
            </section>

            <section className="max-w-5xl mx-auto px-4 pb-10">
                <div
                    className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-7"
                    style={{ clipPath: "polygon(1% 0,100% 0,99% 100%,0 100%)" }}
                >
                    {/* read-only name */}
                    <div className="mb-5">
                        <label className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
                            Artist name
                        </label>
                        <input
                            value={artist.display_name ?? ""}
                            readOnly
                            className="w-full h-10 rounded-lg bg-neutral-950 border border-neutral-800 px-3 text-sm text-neutral-200 cursor-not-allowed"
                        />
                        <p className="text-[11px] text-neutral-500 mt-1">
                            Display name can’t be edited here.
                        </p>
                    </div>

                    <EditArtistHeroForm
                        artistId={artist.id}
                        displayName={artist.display_name}
                        initialHeroPath={artist.hero_image_path ?? ""}
                        initialHeroUrl={
                            artist.hero_image_path
                                ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artist-images/${encodeURIComponent(
                                    artist.hero_image_path
                                )}`
                                : null
                        }
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
