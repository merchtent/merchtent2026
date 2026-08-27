"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowRight,
    Check,
    Disc3,
    Eye,
    EyeOff,
    LockKeyhole,
    Mail,
    ShieldCheck,
    Store,
} from "lucide-react";
import { publicEnv } from "@/lib/env";
import { getBrowserSupabase } from "@/lib/supabase/client";

type AccountType = "artist" | "fan";

const SIGN_UP_ERROR = "Could not create your account. Please check your details and try again.";

const accountTypes = [
    {
        type: "artist" as const,
        title: "Artist / Band",
        kicker: "Sell from the table",
        body: "Design drops, publish products, track sales, and connect payouts once approved.",
        icon: Store,
    },
    {
        type: "fan" as const,
        title: "Fan",
        kicker: "Back the scene",
        body: "Save orders, follow artists, earn merch credits, and keep your gig-table history.",
        icon: Disc3,
    },
];

const proof = [
    "Email/password account",
    "Account setup after confirmation",
    "Artist tools can stay approval-gated",
];

export default function CreateAccountPage() {
    const router = useRouter();
    const supabase = getBrowserSupabase();
    const [accountType, setAccountType] = useState<AccountType>("artist");
    const [displayName, setDisplayName] = useState("");
    const [artistName, setArtistName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        setMessage(null);

        const cleanEmail = email.trim().toLowerCase();
        const cleanDisplayName = displayName.trim();
        const cleanArtistName = artistName.trim();

        if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
            setErr("Enter a valid email address.");
            return;
        }

        if (password.length < 8) {
            setErr("Password must be at least 8 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setErr("Passwords do not match.");
            return;
        }

        if (accountType === "artist" && (cleanArtistName.length < 2 || cleanArtistName.length > 60)) {
            setErr("Artist or band name must be 2-60 characters.");
            return;
        }

        try {
            setLoading(true);
            localStorage.setItem("pending_account_type", accountType);
            localStorage.setItem("pending_display_name", cleanDisplayName || cleanArtistName || cleanEmail.split("@")[0]);
            if (cleanArtistName) localStorage.setItem("pending_artist_name", cleanArtistName);

            const callback = new URL("/auth/callback", publicEnv.siteUrl());
            callback.searchParams.set("type", accountType);
            callback.searchParams.set("next", "/account/setup");

            const { data, error } = await supabase.auth.signUp({
                email: cleanEmail,
                password,
                options: {
                    emailRedirectTo: callback.toString(),
                    data: {
                        account_type: accountType,
                        display_name: cleanDisplayName || cleanArtistName || null,
                        artist_name: accountType === "artist" ? cleanArtistName : null,
                    },
                },
            });

            if (error) {
                setErr(SIGN_UP_ERROR);
                return;
            }

            if (data.session) {
                router.replace(`/account/setup?type=${accountType}`);
                router.refresh();
                return;
            }

            setMessage("Account created. Check your email to confirm it, then finish setup.");
        } catch {
            setErr(SIGN_UP_ERROR);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="bg-black text-white">
            <section className="grid min-h-[calc(100vh-6rem)] border-b border-neutral-800 lg:grid-cols-[0.88fr_1.12fr]">
                <div className="relative flex min-h-[620px] flex-col justify-between overflow-hidden border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                    <div className="absolute inset-0">
                        <Image
                            src="https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=80"
                            alt="Fans watching a live show"
                            fill
                            sizes="(max-width: 1024px) 100vw, 44vw"
                            className="object-cover opacity-60"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/76 to-black/10" />
                        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_18px)] opacity-25" />
                    </div>

                    <div className="relative z-10">
                        <p className="inline-flex bg-red-600 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em]">
                            Future signup flow
                        </p>
                    </div>

                    <div className="relative z-10 max-w-3xl">
                        <h1 className="text-6xl font-black uppercase leading-[0.82] md:text-8xl">
                            Make an account for the scene.
                        </h1>
                        <p className="mt-6 max-w-2xl text-base font-bold leading-7 text-neutral-200 md:text-lg">
                            This is the real email/password signup flow, parked away from the public early-access page
                            until you are ready to open Merch Tent properly.
                        </p>
                    </div>
                </div>

                <div className="grid bg-neutral-950 lg:grid-rows-[auto_1fr]">
                    <div className="border-b border-neutral-800 p-5 md:p-8">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-500">
                            Create account
                        </p>
                        <h2 className="mt-2 max-w-4xl text-4xl font-black uppercase leading-none md:text-6xl">
                            Artist or fan. Same door, different dashboard.
                        </h2>
                    </div>

                    <div className="grid lg:grid-cols-[1fr_0.58fr]">
                        <section className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                            <form className="space-y-5" onSubmit={onSubmit}>
                                <div>
                                    <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
                                        Account type
                                    </span>
                                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                                        {accountTypes.map((option) => {
                                            const Icon = option.icon;
                                            const active = accountType === option.type;
                                            return (
                                                <button
                                                    key={option.type}
                                                    type="button"
                                                    onClick={() => setAccountType(option.type)}
                                                    className={`border p-4 text-left transition ${active
                                                        ? "border-red-500 bg-red-600 text-white"
                                                        : "border-neutral-800 bg-black hover:border-red-500"
                                                        }`}
                                                    aria-pressed={active}
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <Icon className={active ? "h-6 w-6 text-white" : "h-6 w-6 text-red-400"} />
                                                        {active ? <Check className="h-5 w-5" /> : null}
                                                    </div>
                                                    <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] opacity-80">
                                                        {option.kicker}
                                                    </p>
                                                    <p className="mt-2 text-2xl font-black uppercase leading-none">{option.title}</p>
                                                    <p className={`mt-3 text-sm leading-5 ${active ? "text-white/80" : "text-neutral-400"}`}>
                                                        {option.body}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <label className="block">
                                        <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
                                            Display name
                                        </span>
                                        <input
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            maxLength={80}
                                            placeholder="e.g. Casey"
                                            className="mt-2 w-full border border-neutral-700 bg-black px-4 py-3 text-white placeholder:text-neutral-600 focus:border-red-500 focus:outline-none"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
                                            Artist / band name
                                        </span>
                                        <input
                                            value={artistName}
                                            onChange={(e) => setArtistName(e.target.value)}
                                            required={accountType === "artist"}
                                            maxLength={60}
                                            placeholder={accountType === "artist" ? "e.g. The Seaside Riot" : "Optional"}
                                            className="mt-2 w-full border border-neutral-700 bg-black px-4 py-3 text-white placeholder:text-neutral-600 focus:border-red-500 focus:outline-none"
                                        />
                                    </label>
                                </div>

                                <label className="block">
                                    <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
                                        Email address
                                    </span>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                        placeholder="you@bandmail.com"
                                        className="mt-2 w-full border border-neutral-700 bg-black px-4 py-3 text-white placeholder:text-neutral-600 focus:border-red-500 focus:outline-none"
                                    />
                                </label>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <label className="block">
                                        <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
                                            Password
                                        </span>
                                        <div className="mt-2 flex border border-neutral-700 bg-black focus-within:border-red-500">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                minLength={8}
                                                autoComplete="new-password"
                                                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-white focus:outline-none"
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
                                    </label>

                                    <label className="block">
                                        <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
                                            Confirm password
                                        </span>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            minLength={8}
                                            autoComplete="new-password"
                                            className="mt-2 w-full border border-neutral-700 bg-black px-4 py-3 text-white focus:border-red-500 focus:outline-none"
                                        />
                                    </label>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        disabled={loading}
                                        className="inline-flex w-full items-center justify-center gap-2 bg-red-600 px-5 py-4 text-sm font-black uppercase tracking-[0.1em] text-white hover:bg-red-500 disabled:opacity-60 md:w-auto"
                                    >
                                        {loading ? "Creating account..." : "Create account"}
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                    <Link
                                        href="/auth/sign-up"
                                        className="inline-flex w-full items-center justify-center border border-neutral-700 px-5 py-4 text-sm font-black uppercase tracking-[0.1em] text-white hover:border-red-500 md:w-auto"
                                    >
                                        Keep early access page
                                    </Link>
                                </div>

                                {err ? <p className="text-sm font-bold text-red-400">{err}</p> : null}
                                {message ? <p className="text-sm font-bold text-green-300">{message}</p> : null}
                            </form>
                        </section>

                        <aside className="grid content-between gap-6 bg-black p-5 md:p-8">
                            <div>
                                <div className="grid h-14 w-14 place-items-center bg-red-600">
                                    <LockKeyhole className="h-7 w-7" />
                                </div>
                                <p className="mt-8 text-[11px] font-black uppercase tracking-[0.28em] text-red-500">
                                    How it behaves
                                </p>
                                <p className="mt-3 text-3xl font-black uppercase leading-none">
                                    Proper account creation, still easy to gate.
                                </p>
                                <p className="mt-4 text-sm leading-6 text-neutral-400">
                                    Supabase creates the auth user. If confirmation is enabled, the user lands back on
                                    account setup after email confirmation. If confirmation is disabled, they go there
                                    immediately.
                                </p>
                            </div>

                            <div className="space-y-3">
                                {proof.map((item) => (
                                    <div key={item} className="flex items-center gap-3 border border-neutral-800 bg-neutral-950 p-3">
                                        <ShieldCheck className="h-5 w-5 text-red-400" />
                                        <span className="text-sm font-black uppercase tracking-[0.08em]">{item}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border border-neutral-800 bg-neutral-950 p-4 text-sm leading-6 text-neutral-400">
                                Already approved?{" "}
                                <Link href="/auth/sign-in" className="font-black text-white underline decoration-red-500 underline-offset-4 hover:text-red-300">
                                    Sign in with email/password
                                </Link>
                                .
                            </div>

                            <div className="flex items-center gap-3 border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-400">
                                <Mail className="h-5 w-5 text-red-400" />
                                Confirmation emails use the configured Supabase Auth redirect allowlist.
                            </div>
                        </aside>
                    </div>
                </div>
            </section>
        </main>
    );
}
