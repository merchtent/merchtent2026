// src/components/home/JoinTheList.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "Subscription failed");
            setOk(true);
            setEmail("");
            setName("");
        } catch (e: any) {
            setOk(false);
            setErr(e?.message ?? "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16 text-center">
            <h3 className="text-2xl font-semibold">Join the list</h3>
            <p className="mt-2 text-neutral-300">First dibs on drops, sales &amp; news.</p>

            <form onSubmit={onSubmit} className="mt-5 flex flex-col sm:flex-row gap-2  mx-auto">
                <Input
                    type="text"
                    placeholder="Name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
                />
                <Input
                    type="email"
                    placeholder="Email address"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
                />
                <Button type="submit" disabled={loading} className="relative rounded-xl px-5 py-3 text-sm font-black tracking-wide bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 border border-red-500 disabled:opacity-50"
                    style={{
                        clipPath: "polygon(6% 0,100% 0,94% 100%,0 100%)",
                    }}>
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
