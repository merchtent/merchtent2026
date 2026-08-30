import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import ArtistEditForm from "@/components/admin/ArtistEditForm";

export default async function EditArtistPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const supabase = getServerSupabase();

    const { data: artist } = await supabase
        .from("artists")
        .select("*")
        .eq("id", id)
        .single();

    if (!artist) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 p-5 md:p-8">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-lime-300">Artist editor</p>

                <h1 className="mt-2 text-5xl font-black uppercase leading-[0.88] md:text-7xl">
                    Edit artist.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                    Update the public artist profile, socials and store-facing artist metadata.
                </p>
            </section>

            <section className="max-w-5xl p-5 md:p-8">
                <ArtistEditForm
                    artist={artist}
                />
            </section>

        </main>
    );
}
