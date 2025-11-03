"use client";

import { useState } from "react";
import Link from "next/link";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function SignInPage() {
    const supabase = getBrowserSupabase();
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function requestLink(targetEmail: string) {

        const appUrl =
            process.env.NEXT_PUBLIC_SITE_URL ??
            (typeof window !== "undefined" ? window.location.origin : "");

        const { error } = await supabase.auth.signInWithOtp({
            email: targetEmail,
            options: { emailRedirectTo: `${appUrl}/auth/callback` },
        });
        return error;
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        try {
            setLoading(true);
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
        setErr(null);
        try {
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
                <p className="uppercase tracking-[0.25em] text-xs text-red-500">Welcome back</p>
                <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">Sign in</h1>
                <p className="mt-2 text-sm text-neutral-300">
                    Enter your email and we’ll send you a secure <strong>magic link</strong>.
                    No password needed.
                </p>
            </section>

            {/* Info card */}
            {!sent && (
                <section className="rounded-2xl border border-neutral-700 bg-neutral-900 p-4 mb-6 text-sm">
                    <p className="font-semibold mb-2 text-neutral-100">How it works</p>
                    <ol className="list-decimal list-inside space-y-1 text-neutral-200">
                        <li>Type your email below and submit.</li>
                        <li>Open the email from us and click the magic link.</li>
                        <li>You’ll be brought straight back here, signed in.</li>
                    </ol>
                    <p className="mt-3 text-neutral-400">
                        Tip: don’t see it? Check Spam/Promotions or try resending.
                    </p>
                </section>
            )}

            {sent ? (
                <section className="rounded-2xl border border-neutral-700 bg-neutral-900 p-5 space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold text-neutral-100">Check your inbox</h2>
                        <p className="text-sm text-neutral-300 mt-1">
                            We sent a magic link to{" "}
                            <span className="font-medium text-neutral-100">{email}</span>.
                            Click it to sign in.
                        </p>
                    </div>

                    <div className="text-sm text-neutral-300">
                        Not there? Try:
                        <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Checking Spam/Promotions</li>
                            <li>
                                Adding <span className="font-mono text-neutral-200">no-reply@supabase.io</span> to contacts
                            </li>
                            <li>Resending the email</li>
                        </ul>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={resend}
                            disabled={resending}
                            className="rounded-xl px-4 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-500 disabled:opacity-60
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                        >
                            {resending ? "Resending…" : "Resend link"}
                        </button>
                        <button
                            onClick={() => setSent(false)}
                            className="rounded-xl px-4 py-2 border border-neutral-600 text-neutral-100 text-sm hover:bg-neutral-900
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                        >
                            Use a different email
                        </button>
                    </div>

                    {err && <p className="text-sm text-red-400">{err}</p>}
                </section>
            ) : (
                <form className="space-y-4" onSubmit={onSubmit}>
                    <div>
                        <label className="block text-[11px] font-semibold text-neutral-200 mb-1">Email address</label>
                        <input
                            type="email"
                            placeholder="you@bandmail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full rounded-xl px-3 py-2.5 text-neutral-100 bg-neutral-900 border border-neutral-600 placeholder:text-neutral-400
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950
                         shadow-inner"
                            aria-describedby="emailHelp"
                        />
                        <p id="emailHelp" className="mt-1 text-xs text-neutral-400">
                            We’ll email you a one-time sign-in link.
                        </p>
                    </div>

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

            {/* Footer nav & legal */}
            <section className="mt-8 flex items-center justify-between text-xs text-neutral-400">
                <div>
                    New here?{" "}
                    <Link href="/auth/sign-up" className="underline">
                        Create an artist account
                    </Link>
                    .
                </div>
                <div>
                    <Link href="/terms" className="underline">Terms</Link> ·{" "}
                    <Link href="/privacy" className="underline">Privacy</Link>
                </div>
            </section>
        </main>
    );
}
