"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { completeAccountSetup } from "./actions";
import { marketingAttributionJson } from "@/lib/marketing/attribution";

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
                ? "Use the self-service tools to create products, publish merch, view sales, and cash out artist earnings."
                : "Track purchases, earn merch credits, and keep your fan history in one place.",
        [accountType]
    );

    async function action(formData: FormData) {
        setError(null);
        try {
            formData.set("marketing_attribution", marketingAttributionJson());
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
                    className={`border p-4 text-left transition ${accountType === "fan"
                        ? "border-[#b6ff3f] bg-[#b6ff3f]"
                        : "border-black/10 bg-white hover:border-[#477a00]"
                        }`}
                >
                    <p className="text-lg font-black uppercase">Fan</p>
                    <p className={`mt-2 text-sm ${accountType === "fan" ? "text-black/70" : "text-black/55"}`}>
                        Buy merch, view orders, and collect credits.
                    </p>
                </button>
                <button
                    type="button"
                    onClick={() => setAccountType("artist")}
                    className={`border p-4 text-left transition ${accountType === "artist"
                        ? "border-[#b6ff3f] bg-[#b6ff3f]"
                        : "border-black/10 bg-white hover:border-[#477a00]"
                        }`}
                >
                    <p className="text-lg font-black uppercase">Artist / Band</p>
                    <p className={`mt-2 text-sm ${accountType === "artist" ? "text-black/70" : "text-black/55"}`}>
                        Create products, manage sales, and get paid.
                    </p>
                </button>
            </div>

            <p className="border border-black/10 bg-white px-4 py-3 text-sm text-black/65">
                {helper}
            </p>

            <label className="block">
                <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.18em] text-[#477a00]">
                    Display name
                </span>
                <input
                    name="display_name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="h-11 w-full border border-black/15 bg-white px-3 text-sm text-black outline-none focus:border-[#477a00]"
                    placeholder="Your name"
                />
            </label>

            {accountType === "artist" ? (
                <label className="block">
                    <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.18em] text-[#477a00]">
                        Artist / band name
                    </span>
                    <input
                        name="artist_name"
                        value={artistName}
                        onChange={(event) => setArtistName(event.target.value)}
                        minLength={2}
                        maxLength={60}
                        required
                        className="h-11 w-full border border-black/15 bg-white px-3 text-sm text-black outline-none focus:border-[#477a00]"
                        placeholder="e.g. Greg Mitchell Trio"
                    />
                </label>
            ) : null}

            {error ? (
                <p className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
                    {error}
                </p>
            ) : null}

            <button
                type="submit"
                className="border border-[#b6ff3f] bg-[#b6ff3f] px-5 py-3 text-sm font-black uppercase text-black hover:bg-white"
            >
                Finish setup
            </button>
        </form>
    );
}
