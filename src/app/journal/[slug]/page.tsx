import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import StructuredData from "@/components/StructuredData";
import { publicEnv } from "@/lib/env";
import { publicStorageUrl } from "@/lib/storage";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";

type JournalArtist = { display_name?: string | null; slug?: string | null; hero_image_path?: string | null };
type JournalEntry = { id: string; slug: string; title: string; excerpt?: string | null; cover_image?: string | null; created_at?: string | null; published_at?: string | null; artist?: JournalArtist | JournalArtist[] | null };

async function getEntry(slug: string): Promise<JournalEntry | null> {
    const supabase = getPublicServerSupabase();
    const { data } = await supabase.from("journal")
        .select("id, slug, title, excerpt, cover_image, created_at, published_at, artist:artists(display_name,slug,hero_image_path)")
        .eq("status", "published").eq("slug", slug).maybeSingle();
    return (data as JournalEntry | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const entry = await getEntry(slug);
    if (!entry) return { title: "Journal post not found", robots: { index: false, follow: false } };
    const image = publicStorageUrl("journal-images", entry.cover_image);
    return {
        title: entry.title,
        description: entry.excerpt || `Read ${entry.title} in the Merch Tent journal.`,
        alternates: { canonical: `/journal/${entry.slug}` },
        robots: { index: true, follow: true },
        openGraph: { type: "article", url: `/journal/${entry.slug}`, title: entry.title, description: entry.excerpt || undefined, publishedTime: entry.published_at ?? entry.created_at ?? undefined, images: image ? [{ url: image, alt: entry.title }] : undefined },
    };
}

export default async function JournalPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const entry = await getEntry(slug);
    if (!entry) notFound();
    const artist = Array.isArray(entry.artist) ? entry.artist[0] : entry.artist;
    const image = publicStorageUrl("journal-images", entry.cover_image);
    const avatar = publicStorageUrl("artist-images", artist?.hero_image_path);
    const published = entry.published_at ?? entry.created_at;
    return <>
        <StructuredData data={{ "@context": "https://schema.org", "@type": "Article", headline: entry.title, description: entry.excerpt || undefined, url: `${publicEnv.siteUrl()}/journal/${entry.slug}`, datePublished: published || undefined, image: image || undefined, author: { "@type": artist?.display_name ? "MusicGroup" : "Organization", name: artist?.display_name ?? "Merch Tent" }, publisher: { "@id": `${publicEnv.siteUrl()}/#store` } }} />
        <main className="min-h-screen bg-black text-white"><article className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-16">
            <Link href="/journal" className="text-sm font-bold text-lime-300 hover:text-white">← Back to journal</Link>
            <header className="mt-8"><p className="text-xs font-black uppercase tracking-[0.28em] text-red-500">Merch Tent journal</p><h1 className="mt-3 text-4xl font-black uppercase leading-[0.92] md:text-6xl">{entry.title}</h1>
                <div className="mt-6 flex items-center gap-3">{avatar ? <Image src={avatar} alt={artist?.display_name ?? "Artist"} width={44} height={44} className="h-11 w-11 object-cover" /> : null}<div><p className="text-sm font-black">{artist?.display_name ?? "Merch Tent"}</p>{published ? <time className="text-xs text-neutral-500" dateTime={published}>{new Date(published).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</time> : null}</div></div>
            </header>
            {image ? <div className="relative mt-9 aspect-[16/9] overflow-hidden border border-neutral-800"><Image src={image} alt={entry.title} fill priority sizes="(max-width: 896px) 100vw, 896px" className="object-cover" /></div> : null}
            <div className="mt-9 border-l-4 border-lime-300 bg-neutral-950 p-6 text-lg leading-8 text-neutral-200">{entry.excerpt || "More from this artist is coming soon."}</div>
            <aside className="mt-10 border border-neutral-800 bg-neutral-950 p-6"><h2 className="text-2xl font-black uppercase">Keep exploring the scene.</h2><div className="mt-5 flex flex-wrap gap-3">{artist?.slug ? <Link href={`/artists/${artist.slug}`} className="bg-lime-300 px-5 py-3 text-sm font-black uppercase text-black">View {artist.display_name}</Link> : null}<Link href="/new" className="border border-neutral-600 px-5 py-3 text-sm font-black uppercase">Shop new drops</Link></div></aside>
        </article></main>
    </>;
}
