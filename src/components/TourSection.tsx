"use client";

import { Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

type TourDate = {
    id: string;
    artist: string;
    venue: string;
    city: string;
    event_date: string;
    ticket_url: string;
};

export default function TourSection({ dates }: { dates: TourDate[] }) {
    if (!dates.length) return null;

    return (
        <section
            id="tour"
            className="bg-neutral-900 py-12 md:py-16 border-y border-neutral-800"
        >
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl md:text-2xl font-semibold">Tour Dates</h2>
                </div>

                <div className="grid md:grid-cols-4 gap-4 md:gap-6">
                    {dates.map((t) => (
                        <div
                            key={t.id}
                            className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 md:p-6"
                        >
                            <p className="text-red-400 text-sm font-semibold">
                                {new Date(t.event_date).toLocaleDateString("en-AU", {
                                    month: "short",
                                    day: "numeric",
                                })}
                            </p>

                            <p className="mt-1 text-lg font-medium">{t.artist}</p>
                            <p className="text-sm text-neutral-400">
                                {t.venue}, {t.city}
                            </p>

                            <Button asChild className="mt-4 w-full">
                                <a
                                    href={t.ticket_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Ticket className="h-4 w-4 mr-2" />
                                    Tickets
                                </a>
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
