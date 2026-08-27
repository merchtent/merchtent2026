"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck, Sparkles, Ticket } from "lucide-react";
import { passwordResetErrorMessage } from "@/lib/auth/supabase-client-errors";
import { getBrowserSupabase } from "@/lib/supabase/client";

const SIGN_IN_ERROR = "Could not sign in. Check your email and password.";

const accessNotes = [
    "Existing approved accounts only",
    "Email and password sign-in",
    "Reset link available if needed",
];

const accountPaths = [
    {
        title: "Artist dashboard",
        body: "Products, sales, payout setup, activity, and launch tools.",
        icon: Sparkles,
    },
    {
        title: "Fan account",
        body: "Orders, merch credits, saved artists, and scene updates.",
        icon: Ticket,
    },
];

export default function SignInPage() {
    const router = useRouter();
    const supabase = getBrowserSupabase();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        setMessage(null);

        try {
            setLoading(true);
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password,
            });

            if (error) {
                setErr(SIGN_IN_ERROR);
                return;
            }

            router.replace("/dashboard");
            router.refresh();
        } catch {
            setErr(SIGN_IN_ERROR);
        } finally {
            setLoading(false);
        }
    }

    async function sendPasswordReset() {
        setErr(null);
        setMessage(null);

        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
            setErr("Enter your account email first.");
            return;
        }

        try {
            setResetting(true);
            const redirectOrigin = window.location.origin;
            const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
                redirectTo: `${redirectOrigin}/auth/callback?next=/dashboard/account`,
            });

            if (error) {
                console.error("password reset request failed", error.message);
                setErr(passwordResetErrorMessage(error));
                return;
            }

            setMessage("Password setup email sent. Open it, then choose a new password.");
        } catch {
            setErr("Could not send password setup email. Please try again.");
        } finally {
            setResetting(false);
        }
    }

    return (
        <main className="bg-black text-white">
            <section className="grid min-h-[calc(100vh-6rem)] border-b border-neutral-800 lg:grid-cols-[0.92fr_1.08fr]">
                <div className="relative flex min-h-[620px] flex-col justify-between overflow-hidden border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                    <div className="absolute inset-0">
                        <Image
                            src="https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1600&q=80"
                            alt="Artist performing on stage"
                            fill
                            sizes="(max-width: 1024px) 100vw, 46vw"
                            className="object-cover opacity-60"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/72 to-black/10" />
                        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_18px)] opacity-25" />
                    </div>

                    <div className="relative z-10">
                        <p className="inline-flex bg-red-600 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em]">
                            Welcome back
                        </p>
                    </div>

                    <div className="relative z-10 max-w-3xl">
                        <h1 className="text-6xl font-black uppercase leading-[0.82] md:text-8xl">
                            Back through the side door.
                        </h1>
                        <p className="mt-6 max-w-2xl text-base font-bold leading-7 text-neutral-200 md:text-lg">
                            Sign in with the email and password on your approved Merch Tent account. No public signup,
                            no magic-link login, just direct account access.
                        </p>
                    </div>
                </div>

                <div className="grid bg-neutral-950 lg:grid-rows-[auto_1fr]">
                    <div className="border-b border-neutral-800 p-5 md:p-8">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-500">
                            Secure sign in
                        </p>
                        <h2 className="mt-2 max-w-3xl text-4xl font-black uppercase leading-none md:text-6xl">
                            Email and password.
                        </h2>
                    </div>

                    <div className="grid lg:grid-cols-[1fr_0.72fr]">
                        <section className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                            <form className="space-y-5" onSubmit={onSubmit}>
                                <div className="border border-neutral-800 bg-black p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="grid h-12 w-12 shrink-0 place-items-center bg-red-600">
                                            <KeyRound className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-black uppercase leading-none">
                                                Existing account access
                                            </p>
                                            <p className="mt-3 text-sm leading-6 text-neutral-400">
                                                New public signup is currently invite-only. If you already have access,
                                                use the password connected to your approved email.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
                                        Email address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="you@bandmail.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                        className="mt-2 w-full border border-neutral-700 bg-black px-4 py-3 text-white placeholder:text-neutral-600 focus:border-red-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
                                        Password
                                    </label>
                                    <div className="mt-2 flex border border-neutral-700 bg-black focus-within:border-red-500">
                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            minLength={8}
                                            autoComplete="current-password"
                                            className="min-w-0 flex-1 bg-transparent px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((value) => !value)}
                                            className="grid w-12 place-items-center border-l border-neutral-800 text-neutral-400 hover:text-white"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        disabled={loading}
                                        className="inline-flex w-full items-center justify-center gap-2 bg-red-600 px-5 py-4 text-sm font-black uppercase tracking-[0.1em] text-white hover:bg-red-500 disabled:opacity-60 md:w-auto"
                                    >
                                        {loading ? "Signing in..." : "Sign in"}
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={resetting}
                                        onClick={sendPasswordReset}
                                        className="inline-flex w-full items-center justify-center border border-neutral-700 px-5 py-4 text-sm font-black uppercase tracking-[0.1em] text-white hover:border-red-500 disabled:opacity-60 md:w-auto"
                                    >
                                        {resetting ? "Sending..." : "Set/reset password"}
                                    </button>
                                </div>

                                {err ? <p className="text-sm font-bold text-red-400">{err}</p> : null}
                                {message ? <p className="text-sm font-bold text-green-300">{message}</p> : null}
                            </form>
                        </section>

                        <aside className="grid content-between gap-6 bg-black p-5 md:p-8">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-500">
                                    Account paths
                                </p>
                                <p className="mt-3 text-2xl font-black uppercase leading-none">
                                    One door. The dashboard changes by account.
                                </p>
                                <p className="mt-4 text-sm leading-6 text-neutral-400">
                                    Artists see launch and sales tools. Fans see orders, credits, and artists they back.
                                </p>
                            </div>

                            <div className="grid gap-3">
                                {accountPaths.map((path) => {
                                    const Icon = path.icon;
                                    return (
                                        <div key={path.title} className="border border-neutral-800 bg-neutral-950 p-4">
                                            <Icon className="h-5 w-5 text-red-400" />
                                            <p className="mt-5 text-xl font-black uppercase leading-none">{path.title}</p>
                                            <p className="mt-3 text-sm leading-5 text-neutral-400">{path.body}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="space-y-3">
                                {accessNotes.map((note) => (
                                    <div key={note} className="flex items-center gap-3 border border-neutral-800 bg-neutral-950 p-3">
                                        <ShieldCheck className="h-5 w-5 text-red-400" />
                                        <span className="text-sm font-black uppercase tracking-[0.08em]">{note}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border border-neutral-800 bg-neutral-950 p-4 text-sm leading-6 text-neutral-400">
                                New here?{" "}
                                <Link href="/auth/sign-up" className="font-black text-white underline decoration-red-500 underline-offset-4 hover:text-red-300">
                                    Request early access
                                </Link>
                                .
                            </div>
                        </aside>
                    </div>
                </div>
            </section>

            <section className="flex flex-col gap-3 border-b border-neutral-800 px-5 py-6 text-xs text-neutral-500 md:flex-row md:items-center md:justify-between md:px-8">
                <p>Use a strong password. Password reset emails are only for accounts already approved for access.</p>
                <p>
                    <Link href="/terms" className="text-neutral-300 underline hover:text-white">Terms</Link>
                    <span className="px-2 text-neutral-700">/</span>
                    <Link href="/privacy" className="text-neutral-300 underline hover:text-white">Privacy</Link>
                </p>
            </section>
        </main>
    );
}
