import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import journal_img from "@/images/journal.png";
import avatar_img from "@/images/journal.png";

// 🔧 Replace this with DB call later (Supabase)
const journalEntries = [
    {
        slug: "merch-tent-launch",
        title: "We’re Live! Merch Tent Launch",
        tag: "Announcement",
        artist: "Merch Tent",
        content: `
            The store is officially live.

            This has been in the works for a while — building a place where bands can drop merch without the usual friction.

            Right now you can grab tees, hoodies, posters, and more.
            
            Over the next few weeks we’ll be rolling out:
            - Limited drops
            - Artist collabs
            - Tour-only merch releases
            
            This is just the start.
        `,
        image: journal_img,
        avatar: avatar_img,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    {
        slug: "corner-hotel-gig",
        title: "Last Night at The Corner",
        tag: "Gig",
        artist: "The Static Fires",
        content: `
            Last night was chaos in the best way.

            The room filled early, and by the second set it was shoulder-to-shoulder.

            Merch table got smashed — hoodies gone before the final song.

            These are the nights that make it all worth it.
        `,
        image: journal_img,
        avatar: avatar_img,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10),
    },
];

function timeAgo(date: Date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    const intervals: any = {
        year: 31536000,
        month: 2592000,
        day: 86400,
        hour: 3600,
        minute: 60,
    };

    for (const key in intervals) {
        const interval = Math.floor(seconds / intervals[key]);
        if (interval >= 1) {
            return `${interval} ${key}${interval > 1 ? "s" : ""} ago`;
        }
    }

    return "just now";
}

export default function JournalSlugPage({
    params,
}: {
    params: { slug: string };
}) {
    const entry = journalEntries.find((e) => e.slug === params.slug);

    if (!entry) return notFound();

    return (
        <section className="bg-black text-white min-h-screen">
            <div className="max-w-4xl mx-auto px-4 md:px-6 py-10">

                {/* Back */}
                <Link
                    href="/journal"
                    className="text-sm text-neutral-400 hover:text-white"
                >
                    ← Back to Journal
                </Link>

                {/* Header */}
                <div className="mt-6">
                    <span className="text-xs uppercase tracking-widest text-neutral-500">
                        {entry.tag}
                    </span>

                    <h1 className="text-3xl md:text-5xl font-black mt-2">
                        {entry.title}
                    </h1>

                    {/* Author */}
                    <div className="flex items-center gap-3 mt-4">
                        <Image
                            src={entry.avatar}
                            alt={entry.artist}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                            <p className="text-sm font-semibold">
                                {entry.artist}
                            </p>
                            <p className="text-xs text-neutral-500">
                                {timeAgo(entry.createdAt)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Hero Image */}
                <div className="relative mt-8 rounded-2xl overflow-hidden border border-neutral-800">
                    <Image
                        src={entry.image}
                        alt={entry.title}
                        className="w-full h-[300px] md:h-[420px] object-cover"
                    />
                </div>

                {/* Content */}
                <div className="prose prose-invert max-w-none mt-8">
                    {entry.content.split("\n").map((p, i) => (
                        <p key={i}>{p}</p>
                    ))}
                </div>

                {/* CTA SECTION (this is the money maker) */}
                <div className="mt-12 p-6 rounded-2xl border border-neutral-800 bg-neutral-950">
                    <h3 className="text-xl font-bold">
                        Shop this artist
                    </h3>
                    <p className="text-neutral-400 mt-2">
                        Support the artist — grab their latest merch.
                    </p>

                    <div className="mt-4 flex gap-3">
                        <Link
                            href={`/artist/${entry.artist}`}
                            className="px-5 py-2 rounded-full bg-white text-black text-sm font-semibold hover:opacity-90"
                        >
                            View Merch
                        </Link>

                        <Link
                            href={`/artist/${entry.artist}`}
                            className="px-5 py-2 rounded-full border border-neutral-700 text-sm hover:border-white"
                        >
                            View Artist
                        </Link>
                    </div>
                </div>

                {/* Related (simple version) */}
                <div className="mt-12">
                    <h3 className="text-lg font-bold mb-4">
                        More from the journal
                    </h3>

                    <div className="grid md:grid-cols-2 gap-4">
                        {journalEntries
                            .filter((e) => e.slug !== entry.slug)
                            .map((e) => (
                                <Link
                                    key={e.slug}
                                    href={`/journal/${e.slug}`}
                                    className="block p-4 border border-neutral-800 rounded-xl hover:border-white/30"
                                >
                                    <p className="text-sm text-neutral-400">
                                        {e.tag}
                                    </p>
                                    <p className="font-semibold mt-1">
                                        {e.title}
                                    </p>
                                </Link>
                            ))}
                    </div>
                </div>
            </div>
        </section>
    );
}