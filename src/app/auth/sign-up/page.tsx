"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import Link from "next/link";

export default function SignUpPage() {
    const supabase = getBrowserSupabase();
    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function requestLink(targetEmail: string) {
        const { error } = await supabase.auth.signInWithOtp({
            email: targetEmail,
            options: { emailRedirectTo: `${location.origin}/auth/callback` },
        });
        return error;
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);

        const name = displayName.trim();
        if (name.length < 2 || name.length > 60) {
            setErr("Artist name must be 2–60 characters.");
            return;
        }

        try {
            setLoading(true);
            localStorage.setItem("pending_display_name", name);

            const error = await requestLink(email);
            if (error) setErr(error.message);
            else setSent(true);
        } catch (e: any) {
            setErr(e?.message ?? "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    async function resend() {
        try {
            setErr(null);
            setResending(true);
            const error = await requestLink(email);
            if (error) setErr(error.message);
            else setSent(true);
        } catch (e: any) {
            setErr(e?.message ?? "Could not resend right now.");
        } finally {
            setResending(false);
        }
    }

    return (
        <main className="max-w-2xl mx-auto px-4 py-10">
            {/* Header / Welcome */}
            <section className="mb-6">
                <p className="uppercase tracking-[0.25em] text-xs text-red-500">Join</p>
                <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                    Create your artist account
                </h1>
                <p className="mt-2 text-sm text-neutral-300">
                    It’s free to join. You’ll receive a secure magic link via email to finish
                    setting up your account—no password required.
                </p>
            </section>

            {/* How it works */}
            {!sent && (
                <section className="rounded-2xl border border-neutral-700 bg-neutral-900 p-4 mb-6 text-sm">
                    <p className="font-semibold mb-2 text-neutral-100">How sign up works</p>
                    <ol className="list-decimal list-inside space-y-1 text-neutral-200">
                        <li>Tell us your artist/band name and email.</li>
                        <li>We’ll email you a <strong>magic sign-in link</strong>.</li>
                        <li>Click the link to return here and complete onboarding.</li>
                    </ol>
                    <p className="mt-3 text-neutral-400">
                        Tip: if you don’t see the email within a minute, check Spam/Promotions.
                    </p>
                </section>
            )}

            {/* Form / Sent states */}
            {sent ? (
                <section className="rounded-2xl border border-neutral-700 bg-neutral-900 p-5 space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold text-neutral-100">Check your inbox</h2>
                        <p className="text-sm text-neutral-300 mt-1">
                            We sent a magic link to{" "}
                            <span className="font-medium text-neutral-100">{email}</span>.
                            Click it to finish setting up your artist profile.
                        </p>
                    </div>

                    <div className="text-sm text-neutral-300">
                        Not there? Try:
                        <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Checking Spam/Promotions</li>
                            <li>
                                Adding <span className="font-mono text-neutral-200">no-reply@supabase.io</span> to your contacts
                            </li>
                            <li>Resending the email</li>
                        </ul>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={resend}
                            disabled={resending}
                            className="rounded-xl px-4 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-500 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                        >
                            {resending ? "Resending…" : "Resend link"}
                        </button>
                        <button
                            onClick={() => setSent(false)}
                            className="rounded-xl px-4 py-2 border border-neutral-600 text-neutral-100 text-sm hover:bg-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                        >
                            Use a different email
                        </button>
                    </div>

                    {err && <p className="text-sm text-red-400">{err}</p>}

                    {/* What you can do next */}
                    <div className="pt-4 border-t border-neutral-700">
                        <h3 className="text-sm font-semibold text-neutral-100">What you’ll get after sign-up</h3>
                        <ul className="mt-2 grid gap-2 text-sm text-neutral-300">
                            <li>🧰 <strong>Dashboard:</strong> manage products, pricing & publishing</li>
                            <li>🖼️ <strong>Artwork uploads:</strong> upload graphics and design merch</li>
                            <li>🛒 <strong>Sales & orders:</strong> real-time sales and order history</li>
                            <li>💸 <strong>Payouts:</strong> withdraw your artist share when you’re ready</li>
                            <li>🌱 <strong>Print-on-demand:</strong> eco-friendly, no bulk orders needed</li>
                        </ul>
                    </div>
                </section>
            ) : (
                <form className="space-y-4" onSubmit={onSubmit}>
                    {/* Field: Artist name */}
                    <div>
                        <label className="block text-[11px] font-semibold text-neutral-200 mb-1">
                            Artist / Band name
                        </label>
                        <input
                            className="w-full rounded-xl px-3 py-2.5 text-neutral-100 bg-neutral-900 border border-neutral-600 placeholder:text-neutral-400
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950
                         shadow-inner"
                            placeholder="e.g. Greg Mitchell Trio"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            minLength={2}
                            maxLength={60}
                            required
                            aria-describedby="nameHelp"
                        />
                        <p id="nameHelp" className="mt-1 text-xs text-neutral-400">
                            Shown publicly on your products and artist page.
                        </p>
                    </div>

                    {/* Field: Email */}
                    <div>
                        <label className="block text-[11px] font-semibold text-neutral-200 mb-1">
                            Email address
                        </label>
                        <input
                            type="email"
                            className="w-full rounded-xl px-3 py-2.5 text-neutral-100 bg-neutral-900 border border-neutral-600 placeholder:text-neutral-400
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950
                         shadow-inner"
                            placeholder="you@bandmail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            aria-describedby="emailHelp"
                        />
                        <p id="emailHelp" className="mt-1 text-xs text-neutral-400">
                            We’ll send a secure magic link here. No password needed.
                        </p>
                    </div>

                    {/* CTA */}
                    <button
                        disabled={loading}
                        className="relative rounded-xl px-5 py-3 text-sm font-black tracking-wide bg-red-600 hover:bg-red-500 text-white
                       shadow-lg shadow-red-900/30 border border-red-500 disabled:opacity-60
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
                        style={{ clipPath: "polygon(1% 0,100% 0,98% 100%,0 100%)" }}
                    >
                        {loading ? "Sending…" : "Send magic link"}
                    </button>

                    {err && <p className="text-sm text-red-400">{err}</p>}
                </form>
            )}

            {/* Footer note */}
            <section className="mt-8 text-xs text-neutral-400">
                By continuing you agree to our{" "}
                <Link href="/terms" className="underline">Terms</Link> and{" "}
                <Link href="/privacy" className="underline">Privacy Policy</Link>. We never share your email.
            </section>
        </main>
    );
}
