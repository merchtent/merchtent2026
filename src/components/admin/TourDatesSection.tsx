"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TourDateModal from "./TourDateModal";

type TourDate = {
    id: string;
    artist: string;
    venue: string;
    city: string;
    event_date: string;
    ticket_url: string;
};

export default function TourDatesSection({
    tourDates,
    artists,
}: {
    tourDates: TourDate[];
    artists: string[];
}) {
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<TourDate | null>(null);
    const [pendingDelete, setPendingDelete] = useState<TourDate | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const deleteDate = async () => {
        if (!pendingDelete) return;

        setIsDeleting(true);
        setDeleteError(null);

        try {
            const response = await fetch(`/api/admin/tour-dates/${pendingDelete.id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Delete failed");
            }

            setPendingDelete(null);
            router.refresh();
        } catch {
            setDeleteError("Could not delete this tour date.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="border border-white/10 bg-black p-6">

                <div className="flex items-center justify-between mb-6">

                    <div>
                        <h2 className="text-xl font-black">
                            Tour Dates
                        </h2>

                        <p className="text-sm text-neutral-500 mt-1">
                            Manage upcoming gigs shown across the site.
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            setSelected(null);
                            setOpen(true);
                        }}
                        className="
                            bg-[#b6ff3f]
                            hover:bg-white
                            text-black
                            px-4
                            py-2
                            font-black
                            uppercase
                        "
                    >
                        Add Tour Date
                    </button>

                </div>

                <div className="overflow-x-auto border border-white/10">
                    <table className="w-full">

                        <thead className="bg-white/[0.04]">

                            <tr>

                                <th className="text-left p-4">
                                    Date
                                </th>

                                <th className="text-left p-4">
                                    Artist
                                </th>

                                <th className="text-left p-4">
                                    Venue
                                </th>

                                <th className="text-left p-4">
                                    City
                                </th>

                                <th className="text-left p-4">
                                    Tickets
                                </th>

                                <th className="text-left p-4">
                                    Actions
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {tourDates.map((date) => (

                                <tr
                                    key={date.id}
                                    className="
                        border-t
                        border-white/10
                        hover:bg-white/[0.04]
                        transition
                    "
                                >

                                    <td className="p-4">

                                        <div className="font-medium">
                                            {new Date(
                                                date.event_date
                                            ).toLocaleDateString("en-AU", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </div>

                                    </td>

                                    <td className="p-4">

                                        <div className="font-semibold">
                                            {date.artist}
                                        </div>

                                    </td>

                                    <td className="p-4">
                                        {date.venue}
                                    </td>

                                    <td className="p-4">
                                        {date.city}
                                    </td>

                                    <td className="p-4">

                                        <a
                                            href={date.ticket_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="
                                text-[#b6ff3f]
                                hover:text-white
                                font-medium
                            "
                                        >
                                            View Tickets →
                                        </a>

                                    </td>

                                    <td className="p-4">

                                        <div className="flex gap-2">

                                            <button
                                                onClick={() => {
                                                    setSelected(date);
                                                    setOpen(true);
                                                }}
                                                className="
                                    px-3
                                    py-1.5
                                    border
                                    border-white/15
                                    bg-black
                                    hover:border-[#b6ff3f]
                                    text-sm
                                    font-medium
                                "
                                            >
                                                Edit
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setDeleteError(null);
                                                    setPendingDelete(date);
                                                }}
                                                className="
                                    px-3
                                    py-1.5
                                    bg-red-600
                                    hover:bg-red-500
                                    text-sm
                                    font-medium
                                "
                                            >
                                                Delete
                                            </button>

                                        </div>

                                    </td>

                                </tr>

                            ))}

                            {tourDates.length === 0 && (

                                <tr>

                                    <td
                                        colSpan={6}
                                        className="
                            text-center
                            p-12
                            text-neutral-500
                        "
                                    >
                                        No tour dates configured yet.
                                    </td>

                                </tr>

                            )}

                        </tbody>

                    </table>
                </div>

            </div>

            <TourDateModal
                key={selected?.id ?? "new-tour-date"}
                open={open}
                onClose={() => setOpen(false)}
                onSaved={() => router.refresh()}
                tourDate={selected}
                artists={artists}
            />

            {pendingDelete && (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-tour-date-title"
                >
                    <div className="w-full max-w-md border border-white/10 bg-black p-5">
                        <h3 id="delete-tour-date-title" className="text-lg font-bold">
                            Delete tour date
                        </h3>
                        <p className="mt-2 text-sm text-neutral-400">
                            Remove {pendingDelete.artist} at {pendingDelete.venue}? This cannot be undone.
                        </p>
                        {deleteError && (
                            <p className="mt-3 text-sm text-red-300" role="alert">
                                {deleteError}
                            </p>
                        )}
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setPendingDelete(null)}
                                disabled={isDeleting}
                                className="border border-white/15 bg-black px-4 py-2 text-sm font-black uppercase hover:border-[#b6ff3f] disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={deleteDate}
                                disabled={isDeleting}
                                className="bg-red-600 px-4 py-2 text-sm font-black uppercase hover:bg-red-500 disabled:opacity-60"
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
