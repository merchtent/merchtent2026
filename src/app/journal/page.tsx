import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";
import { publicStorageUrl } from "@/lib/storage";

export const revalidate = 300;
export const metadata: Metadata = {
    title: "Australian Band Merch Journal",
    description: "Artist stories, merch launches and notes from the Australian live music scene.",
    alternates: { canonical: "/journal" },
    robots: { index: true, follow: true },
};
type Entry = { id: string; slug: string; title: string; excerpt?: string | null; cover_image?: string | null };

export default async function JournalPage() {
    const supabase = getPublicServerSupabase();
    const { data } = await supabase.from("journal").select("id, slug, title, excerpt, cover_image, published_at, created_at").eq("status", "published").order("published_at", { ascending: false }).limit(50);
    const entries = (data ?? []) as Entry[];
    return <main className="min-h-screen bg-black text-white"><header className="border-b border-neutral-800 px-5 py-16 md:px-10 md:py-24"><p className="text-xs font-black uppercase tracking-[0.28em] text-lime-300">Backstage notes</p><h1 className="mt-3 text-6xl font-black uppercase leading-none md:text-8xl">Journal.</h1><p className="mt-5 max-w-2xl text-neutral-400">Published artist stories, launch notes and merch from the room.</p></header>
        <section className="grid md:grid-cols-2 lg:grid-cols-3">{entries.map((entry) => { const image = publicStorageUrl("journal-images", entry.cover_image); return <Link key={entry.id} href={`/journal/${entry.slug}`} className="group border-b border-r border-neutral-800 bg-neutral-950"><div className="relative aspect-[4/3] overflow-hidden bg-neutral-900">{image ? <Image src={image} alt={entry.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition group-hover:scale-105" /> : null}</div><div className="p-6"><h2 className="text-2xl font-black uppercase leading-tight">{entry.title}</h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-400">{entry.excerpt}</p></div></Link>; })}{entries.length === 0 ? <div className="p-8 md:col-span-2 lg:col-span-3"><h2 className="text-3xl font-black uppercase">The journal is ready.</h2><p className="mt-3 text-neutral-400">Published stories will appear here.</p></div> : null}</section>
    </main>;
}
