"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { completeAccountSetup } from "./actions";

type AccountType = "fan" | "artist";

export default function AccountSetupForm({
    initialEmail,
}: {
    initialEmail: string | null;
}) {
    const searchParams = useSearchParams();
    const requestedType = searchParams.get("type");
    const initialType: AccountType = requestedType === "artist" ? "artist" : "fan";
    const [accountType, setAccountType] = useState<AccountType>(initialType);
    const [displayName, setDisplayName] = useState(initialEmail?.split("@")[0] ?? "");
    const [artistName, setArtistName] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            const pendingType = localStorage.getItem("pending_account_type");
            const pendingDisplayName = localStorage.getItem("pending_display_name");
            const pendingArtistName = localStorage.getItem("pending_artist_name");

            if (pendingType === "artist" || pendingType === "fan") {
                setAccountType(pendingType);
            }

            if (pendingDisplayName) {
                setDisplayName(pendingDisplayName);
            }

            if (pendingArtistName) {
                setArtistName(pendingArtistName);
            }
        }, 0);

        return () => window.clearTimeout(timeout);
    }, []);

    const helper = useMemo(
        () =>
            accountType === "artist"
                ? "Sell merch, design products, view sales, and cash out artist earnings."
                : "Track purchases, earn merch credits, and keep your fan history in one place.",
        [accountType]
    );

    async function action(formData: FormData) {
        setError(null);
        try {
            await completeAccountSetup(formData);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not finish setup.");
        }
    }

    return (
        <form action={action} className="space-y-6">
            <input type="hidden" name="account_type" value={accountType} />

            <div className="grid gap-3 md:grid-cols-2">
                <button
                    type="button"
                    onClick={() => setAccountType("fan")}
                    className={`rounded-2xl border p-4 text-left transition ${accountType === "fan"
                        ? "border-red-500 bg-red-500/15"
                        : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"
                        }`}
                >
                    <p className="text-lg font-black">Fan</p>
                    <p className="mt-2 text-sm text-neutral-400">
                        Buy merch, view orders, and collect credits.
                    </p>
                </button>
                <button
                    type="button"
                    onClick={() => setAccountType("artist")}
                    className={`rounded-2xl border p-4 text-left transition ${accountType === "artist"
                        ? "border-red-500 bg-red-500/15"
                        : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"
                        }`}
                >
                    <p className="text-lg font-black">Artist / Band</p>
                    <p className="mt-2 text-sm text-neutral-400">
                        Create products, manage sales, and get paid.
                    </p>
                </button>
            </div>

            <p className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300">
                {helper}
            </p>

            <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Display name
                </span>
                <input
                    name="display_name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-neutral-100"
                    placeholder="Your name"
                />
            </label>

            {accountType === "artist" ? (
                <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                        Artist / band name
                    </span>
                    <input
                        name="artist_name"
                        value={artistName}
                        onChange={(event) => setArtistName(event.target.value)}
                        minLength={2}
                        maxLength={60}
                        required
                        className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-neutral-100"
                        placeholder="e.g. Greg Mitchell Trio"
                    />
                </label>
            ) : null}

            {error ? (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                </p>
            ) : null}

            <button
                type="submit"
                className="rounded-xl border border-red-500 bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-500"
            >
                Finish setup
            </button>
        </form>
    );
}
