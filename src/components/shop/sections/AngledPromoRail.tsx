"use client";

import { Button } from "@/components/ui/button";
import { BadgePercent, Megaphone } from "lucide-react";

export default function AngledPromoRail() {
    return (
        <section className="relative py-0">
            <div className="-skew-y-3 bg-neutral-100 text-neutral-900 border-y border-neutral-200">
                <div className="skew-y-3 max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14 grid md:grid-cols-3 gap-6 items-center">
                    <div className="md:col-span-2">
                        <h3 className="text-3xl md:text-5xl font-black leading-[0.95]">
                            OPENING SALE // LIVE
                        </h3>
                        <p className="mt-2 text-neutral-700">
                            Fresh drops only. Limited-time launch pricing on brand-new merch.
                        </p>

                    </div>
                    <div className="flex md:justify-end gap-3">
                        <Button asChild><a href="category/tees" className="inline-flex items-center"><BadgePercent className="h-4 w-4 mr-2" /> See Tees</a></Button>
                        <Button variant="secondary" asChild><a href="/new" className="inline-flex items-center"><Megaphone className="h-4 w-4 mr-2" /> New this week</a></Button>
                    </div>
                </div>
            </div>
        </section>
    )
}