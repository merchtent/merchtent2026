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
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">

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
                            bg-red-600
                            hover:bg-red-500
                            px-4
                            py-2
                            rounded-xl
                            font-semibold
                        "
                    >
                        Add Tour Date
                    </button>

                </div>

                <div className="overflow-x-auto rounded-xl border border-neutral-800">
                    <table className="w-full">

                        <thead className="bg-neutral-950">

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
                        border-neutral-800
                        hover:bg-neutral-800/30
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
                                text-red-400
                                hover:text-red-300
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
                                    rounded-lg
                                    bg-neutral-800
                                    hover:bg-neutral-700
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
                                    rounded-lg
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
                    <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl">
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
                                className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-semibold hover:bg-neutral-700 disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={deleteDate}
                                disabled={isDeleting}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500 disabled:opacity-60"
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
