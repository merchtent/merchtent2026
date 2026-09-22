// src/components/home/JoinTheList.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { marketingAttributionJson } from "@/lib/marketing/attribution";
import { trackMarketingEvent } from "@/lib/marketing/events";

export default function JoinTheList() {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [ok, setOk] = useState<null | boolean>(null);
    const [err, setErr] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setOk(null);
        setErr(null);

        // super-light validation
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            setErr("Please enter a valid email.");
            return;
        }

        try {
            setLoading(true);
            const res = await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    name: name || undefined,
                    source: "homepage:join-the-list",
                    utm: marketingAttributionJson(),
                    consent: true,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "Subscription failed");
            setOk(true);
            trackMarketingEvent("newsletter_signup", { source: "homepage:join-the-list" });
            setEmail("");
            setName("");
        } catch (e: unknown) {
            setOk(false);
            setErr(getErrorMessage(e, "Something went wrong"));
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="mx-auto max-w-7xl border-y border-white/10 bg-black px-4 py-12 text-center text-white md:px-8 md:py-16">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#b6ff3f]">First dibs</p>
            <h3 className="mt-3 text-4xl font-black uppercase leading-none md:text-6xl">Join the list.</h3>
            <p className="mt-3 text-sm text-white/60">Drop alerts, artist news, and the odd thing worth opening.</p>

            <form onSubmit={onSubmit} className="mx-auto mt-7 flex max-w-3xl flex-col gap-2 sm:flex-row">
                <Input
                    type="text"
                    placeholder="Name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 border-white/15 bg-[#080808] text-white placeholder:text-white/35"
                />
                <Input
                    type="email"
                    placeholder="Email address"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 border-white/15 bg-[#080808] text-white placeholder:text-white/35"
                />
                <Button type="submit" disabled={loading} className="h-12 border border-[#b6ff3f] bg-[#b6ff3f] px-6 text-sm font-black uppercase tracking-wide text-black hover:bg-white disabled:opacity-50">
                    {loading ? "Subscribing…" : "Subscribe"}
                </Button>
            </form>

            {ok && (
                <p className="mt-3 text-sm text-green-400">Thanks for subscribing! You’re on the list.</p>
            )}
            {err && (
                <p className="mt-3 text-sm text-red-400">{err}</p>
            )}
        </section>
    );
}
