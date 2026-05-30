"use client";

import { useEffect, useState, useTransition } from "react";

type TourDate = {
    id?: string;
    artist: string;
    venue: string;
    city: string;
    event_date: string;
    ticket_url: string;
};

interface Props {
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
    tourDate?: TourDate | null;
    artists?: string[];
}

export default function TourDateModal({
    open,
    onClose,
    onSaved,
    tourDate,
    artists = [],
}: Props) {
    const [isPending, startTransition] = useTransition();

    const [form, setForm] = useState<TourDate>({
        artist: "",
        venue: "",
        city: "",
        event_date: "",
        ticket_url: "",
    });

    useEffect(() => {
        if (tourDate) {
            setForm({
                id: tourDate.id,
                artist: tourDate.artist ?? "",
                venue: tourDate.venue ?? "",
                city: tourDate.city ?? "",
                event_date: tourDate.event_date ?? "",
                ticket_url: tourDate.ticket_url ?? "",
            });
        } else {
            setForm({
                artist: "",
                venue: "",
                city: "",
                event_date: "",
                ticket_url: "",
            });
        }
    }, [tourDate, open]);

    const save = () => {
        if (
            !form.artist ||
            !form.venue ||
            !form.city ||
            !form.event_date
        ) {
            alert("Please complete all required fields");
            return;
        }

        startTransition(async () => {
            const response = await fetch(
                form.id
                    ? `/api/admin/tour-dates/${form.id}`
                    : "/api/admin/tour-dates",
                {
                    method: form.id ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(form),
                }
            );

            if (!response.ok) {
                const error = await response.json();
                alert(error.message ?? "Failed to save");
                return;
            }

            onSaved();
            onClose();
        });
    };

    if (!open) return null;

    return (
        <div
            className="
                fixed inset-0 z-50
                bg-black/70
                flex items-center justify-center
                p-4
            "
        >
            <div
                className="
                    w-full
                    max-w-2xl
                    bg-neutral-900
                    border
                    border-neutral-800
                    rounded-2xl
                    p-6
                "
            >
                <div className="flex items-center justify-between mb-6">

                    <h2 className="text-2xl font-black">
                        {form.id
                            ? "Edit Tour Date"
                            : "Add Tour Date"}
                    </h2>

                    <button
                        onClick={onClose}
                        className="
                            text-neutral-400
                            hover:text-white
                        "
                    >
                        ✕
                    </button>

                </div>

                <div className="space-y-5">

                    <div>
                        <label className="block mb-2 text-sm text-neutral-400">
                            Artist
                        </label>

                        {artists.length > 0 ? (
                            <select
                                value={form.artist}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        artist: e.target.value,
                                    })
                                }
                                className="
                                    w-full
                                    bg-neutral-950
                                    border
                                    border-neutral-700
                                    rounded-xl
                                    px-4
                                    py-3
                                "
                            >
                                <option value="">
                                    Select Artist
                                </option>

                                {artists.map((artist) => (
                                    <option
                                        key={artist}
                                        value={artist}
                                    >
                                        {artist}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                value={form.artist}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        artist: e.target.value,
                                    })
                                }
                                className="
                                    w-full
                                    bg-neutral-950
                                    border
                                    border-neutral-700
                                    rounded-xl
                                    px-4
                                    py-3
                                "
                            />
                        )}
                    </div>

                    <div>
                        <label className="block mb-2 text-sm text-neutral-400">
                            Venue
                        </label>

                        <input
                            value={form.venue}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    venue: e.target.value,
                                })
                            }
                            className="
                                w-full
                                bg-neutral-950
                                border
                                border-neutral-700
                                rounded-xl
                                px-4
                                py-3
                            "
                        />
                    </div>

                    <div>
                        <label className="block mb-2 text-sm text-neutral-400">
                            City
                        </label>

                        <input
                            value={form.city}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    city: e.target.value,
                                })
                            }
                            className="
                                w-full
                                bg-neutral-950
                                border
                                border-neutral-700
                                rounded-xl
                                px-4
                                py-3
                            "
                        />
                    </div>

                    <div>
                        <label className="block mb-2 text-sm text-neutral-400">
                            Event Date
                        </label>

                        <input
                            type="date"
                            value={form.event_date}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    event_date: e.target.value,
                                })
                            }
                            className="
                                w-full
                                bg-neutral-950
                                border
                                border-neutral-700
                                rounded-xl
                                px-4
                                py-3
                            "
                        />
                    </div>

                    <div>
                        <label className="block mb-2 text-sm text-neutral-400">
                            Ticket URL
                        </label>

                        <input
                            value={form.ticket_url}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    ticket_url: e.target.value,
                                })
                            }
                            placeholder="https://"
                            className="
                                w-full
                                bg-neutral-950
                                border
                                border-neutral-700
                                rounded-xl
                                px-4
                                py-3
                            "
                        />
                    </div>

                </div>

                <div className="flex justify-end gap-3 mt-8">

                    <button
                        onClick={onClose}
                        className="
                            px-4
                            py-3
                            rounded-xl
                            bg-neutral-800
                            hover:bg-neutral-700
                        "
                    >
                        Cancel
                    </button>

                    <button
                        onClick={save}
                        disabled={isPending}
                        className="
                            px-5
                            py-3
                            rounded-xl
                            bg-red-600
                            hover:bg-red-500
                            font-semibold
                        "
                    >
                        {isPending
                            ? "Saving..."
                            : "Save Tour Date"}
                    </button>

                </div>

            </div>
        </div>
    );
}