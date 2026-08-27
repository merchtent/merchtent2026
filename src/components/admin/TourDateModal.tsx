"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ToastProvider";

type TourDate = {
    id?: string;
    artist: string;
    venue: string;
    city: string;
    event_date: string;
    ticket_url: string;
};

const emptyTourDate: TourDate = {
    artist: "",
    venue: "",
    city: "",
    event_date: "",
    ticket_url: "",
};

function initialTourDateForm(tourDate?: TourDate | null): TourDate {
    return tourDate
        ? {
            id: tourDate.id,
            artist: tourDate.artist ?? "",
            venue: tourDate.venue ?? "",
            city: tourDate.city ?? "",
            event_date: tourDate.event_date ?? "",
            ticket_url: tourDate.ticket_url ?? "",
        }
        : emptyTourDate;
}

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
    const toast = useToast();

    const [form, setForm] = useState<TourDate>(() => initialTourDateForm(tourDate));
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const save = () => {
        setErrorMessage(null);

        if (
            !form.artist ||
            !form.venue ||
            !form.city ||
            !form.event_date
        ) {
            const message = "Please complete all required fields.";
            setErrorMessage(message);
            toast({ title: "Tour date not saved", description: message, variant: "error" });
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
                const message = error.message ?? "Failed to save tour date.";
                setErrorMessage(message);
                toast({ title: "Tour date not saved", description: message, variant: "error" });
                return;
            }

            toast({
                title: form.id ? "Tour date updated" : "Tour date added",
                variant: "success",
            });
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
                    {errorMessage ? (
                        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                            {errorMessage}
                        </p>
                    ) : null}

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
