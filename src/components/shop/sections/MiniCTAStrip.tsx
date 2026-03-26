"use client";

import { Button } from "@/components/ui/button";
import { Megaphone } from "lucide-react";

export default function MiniCTAStrip() {
    return (
        <section className="py-8 md:py-10">

            <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">

                <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 px-5 md:px-6 py-5 overflow-hidden">

                    {/* subtle texture */}
                    <div
                        className="absolute inset-0 opacity-[0.04] pointer-events-none"
                        style={{
                            backgroundImage:
                                "linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(0deg,rgba(255,255,255,0.1) 1px,transparent 1px)",
                            backgroundSize: "20px 20px",
                        }}
                    />

                    {/* CONTENT */}
                    <div className="flex items-center gap-3 text-center md:text-left">

                        <div className="bg-red-600 p-2 rounded-lg">
                            <Megaphone className="w-4 h-4 text-white" />
                        </div>

                        <div>
                            <p className="text-sm md:text-base font-semibold">
                                Got a band?
                            </p>
                            <p className="text-xs md:text-sm text-neutral-400">
                                Launch your merch. No cost. No risk. Get paid.
                            </p>
                        </div>
                    </div>

                    {/* CTA */}
                    <a href="/artists/apply">
                        <Button className="bg-red-600 hover:bg-red-500 text-white font-bold px-5">
                            Sign up your band
                        </Button>
                    </a>

                </div>

            </div>
        </section>
    );
}