"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Disc3, Mail, ShieldCheck, Store } from "lucide-react";

type AccountType = "fan" | "artist";

const ACCESS_ERROR = "Could not save your early access request. Please try again.";

const accountOptions = [
    {
        type: "artist" as const,
        title: "Artist / Band",
        body: "Build products, launch drops, track sales, and get invited into the creator tools first.",
        icon: Store,
    },
    {
        type: "fan" as const,
        title: "Fan",
        body: "Follow artists, save orders, earn merch credits, and get first notice when fan accounts open.",
        icon: Disc3,
    },
];

const proof = [
    "Small artist group first",
    "Invite-only onboarding",
    "No spam, no public account until approved",
];

export default function SignUpPage() {
    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [accountType, setAccountType] = useState<AccountType>("artist");
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);

        const cleanEmail = email.trim().toLowerCase();
        const cleanName = displayName.trim();

        if (accountType === "artist" && (cleanName.length < 2 || cleanName.length > 80)) {
            setErr("Artist or band name must be 2-80 characters.");
            return;
        }

        try {
            setLoading(true);
            const response = await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: cleanEmail,
                    name: cleanName || null,
                    source: `early-access-${accountType}`,
                    utm: JSON.stringify({
                        account_type: accountType,
                        display_name: cleanName || null,
                        page: "/auth/sign-up",
                    }),
                    consent: true,
                }),
            });

            if (!response.ok) {
                setErr(ACCESS_ERROR);
                return;
            }

            localStorage.setItem("pending_account_type", accountType);
            if (cleanName) localStorage.setItem("pending_display_name", cleanName);
            setSent(true);
        } catch {
            setErr(ACCESS_ERROR);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="bg-black text-white">
            <section className="grid min-h-[calc(100vh-6rem)] border-b border-neutral-800 lg:grid-cols-[0.96fr_1.04fr]">
                <div className="relative flex min-h-[620px] flex-col justify-between overflow-hidden border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                    <div className="absolute inset-0">
                        <Image
                            src="https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=80"
                            alt="Crowd at a live music show"
                            fill
                            sizes="(max-width: 1024px) 100vw, 48vw"
                            className="object-cover opacity-55"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/72 to-black/10" />
                        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_18px)] opacity-25" />
                    </div>

                    <div className="relative z-10">
                        <p className="inline-flex bg-red-600 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em]">
                            Early access
                        </p>
                    </div>

                    <div className="relative z-10 max-w-3xl">
                        <h1 className="text-6xl font-black uppercase leading-[0.82] md:text-8xl">
                            We&apos;re not fully open just yet.
                        </h1>
                        <p className="mt-6 max-w-2xl text-base font-bold leading-7 text-neutral-200 md:text-lg">
                            We&apos;re currently onboarding a small group of artists while we refine the platform.
                            You can still sign up below. We&apos;ll invite you as soon as spots open.
                        </p>
                    </div>
                </div>

                <div className="grid bg-neutral-950 lg:grid-rows-[auto_1fr]">
                    <div className="border-b border-neutral-800 p-5 md:p-8">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-500">
                            Join the list
                        </p>
                        <h2 className="mt-2 max-w-3xl text-4xl font-black uppercase leading-none md:text-6xl">
                            Request your Merch Tent invite.
                        </h2>
                    </div>

                    <div className="grid lg:grid-cols-[1fr_0.72fr]">
                        <section className="border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                            {sent ? (
                                <div className="border border-neutral-800 bg-black p-5 md:p-7">
                                    <div className="grid h-14 w-14 place-items-center bg-red-600">
                                        <Mail className="h-7 w-7" />
                                    </div>
                                    <h3 className="mt-8 text-4xl font-black uppercase leading-none">
                                        You&apos;re on the early access list.
                                    </h3>
                                    <p className="mt-4 text-sm leading-6 text-neutral-300">
                                        We saved <span className="font-black text-white">{email}</span> as a{" "}
                                        <span className="font-black text-white">{accountType}</span> request. No public
                                        account has been activated yet. We&apos;ll invite you when the next spots open.
                                    </p>
                                    <div className="mt-6 flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSent(false);
                                                setErr(null);
                                            }}
                                            className="border border-neutral-700 px-4 py-3 text-sm font-black uppercase tracking-[0.08em] hover:border-red-400"
                                        >
                                            Add another email
                                        </button>
                                        <Link
                                            href="/"
                                            className="inline-flex items-center gap-2 bg-red-600 px-4 py-3 text-sm font-black uppercase tracking-[0.08em] hover:bg-red-500"
                                        >
                                            Back to the scene
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <form className="space-y-5" onSubmit={onSubmit}>
                                    <div>
                                        <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
                                            I want access as
                                        </span>
                                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                                            {accountOptions.map((option) => {
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
                                                        <p className="mt-6 text-2xl font-black uppercase leading-none">{option.title}</p>
                                                        <p className={`mt-3 text-sm leading-5 ${active ? "text-white/80" : "text-neutral-400"}`}>
                                                            {option.body}
                                                        </p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="displayName" className="block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
                                            {accountType === "artist" ? "Artist / band name" : "Display name"}
                                        </label>
                                        <input
                                            id="displayName"
                                            className="mt-2 w-full border border-neutral-700 bg-black px-4 py-3 text-white placeholder:text-neutral-600 focus:border-red-500 focus:outline-none"
                                            placeholder={accountType === "artist" ? "e.g. The Seaside Riot" : "e.g. Casey"}
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            maxLength={80}
                                            required={accountType === "artist"}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="email" className="block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
                                            Email address
                                        </label>
                                        <input
                                            id="email"
                                            type="email"
                                            className="mt-2 w-full border border-neutral-700 bg-black px-4 py-3 text-white placeholder:text-neutral-600 focus:border-red-500 focus:outline-none"
                                            placeholder="you@bandmail.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <button
                                        disabled={loading}
                                        className="inline-flex w-full items-center justify-center gap-2 bg-red-600 px-5 py-4 text-sm font-black uppercase tracking-[0.1em] text-white hover:bg-red-500 disabled:opacity-60 md:w-auto"
                                    >
                                        {loading ? "Saving request..." : "Request early access"}
                                        <ArrowRight className="h-4 w-4" />
                                    </button>

                                    {err ? <p className="text-sm font-bold text-red-400">{err}</p> : null}
                                </form>
                            )}
                        </section>

                        <aside className="grid content-between gap-6 bg-black p-5 md:p-8">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-500">
                                    Why invite-only?
                                </p>
                                <p className="mt-3 text-2xl font-black uppercase leading-none">
                                    Better launches. Cleaner support. Fewer random accounts.
                                </p>
                                <p className="mt-4 text-sm leading-6 text-neutral-400">
                                    We&apos;ll keep account creation controlled while the artist tools, product designer,
                                    payouts, and fulfilment flow settle into production shape.
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

                            <div className="relative min-h-[260px] overflow-hidden border border-neutral-800">
                                <Image
                                    src="https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80"
                                    alt="Artist performing live"
                                    fill
                                    sizes="(max-width: 1024px) 100vw, 28vw"
                                    className="object-cover opacity-70"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                                <div className="absolute bottom-4 left-4 right-4">
                                    <p className="inline-flex bg-red-600 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em]">
                                        Scene first
                                    </p>
                                    <p className="mt-3 text-2xl font-black uppercase leading-none">
                                        Artist accounts open in waves.
                                    </p>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </section>

            <section className="grid border-b border-neutral-800 md:grid-cols-3">
                {[
                    ["Submit", "Tell us whether you are an artist or a fan."],
                    ["Review", "We check the queue and onboard artists in small batches."],
                    ["Invite", "Approved users receive the real account link when spots open."],
                ].map(([title, body], index) => (
                    <div key={title} className="border-b border-r border-neutral-800 bg-neutral-950 p-5 md:border-b-0">
                        <p className="bg-red-600 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                            {String(index + 1).padStart(2, "0")}
                        </p>
                        <h3 className="mt-10 text-3xl font-black uppercase leading-none">{title}</h3>
                        <p className="mt-3 text-sm leading-6 text-neutral-400">{body}</p>
                    </div>
                ))}
            </section>

            <section className="px-5 py-6 text-xs text-neutral-500 md:px-8">
                By requesting access you agree to our{" "}
                <Link href="/terms" className="text-neutral-300 underline hover:text-white">Terms</Link> and{" "}
                <Link href="/privacy" className="text-neutral-300 underline hover:text-white">Privacy Policy</Link>.
                We&apos;ll only use your email for Merch Tent access and platform updates.
            </section>
        </main>
    );
}
