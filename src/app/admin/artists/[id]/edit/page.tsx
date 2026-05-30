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
        <div className="max-w-4xl py-6 px-6">

            <h1 className="text-4xl font-black mb-8">
                Edit Artist
            </h1>

            <ArtistEditForm
                artist={artist}
            />

        </div>
    );
}