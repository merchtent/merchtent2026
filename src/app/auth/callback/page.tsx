"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

function safeNextPath(value: string | null) {
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
        return "/account/setup";
    }
    return value;
}

export default function AuthCallbackPage() {
    const router = useRouter();
    const search = useSearchParams();
    const [msg, setMsg] = useState("Finishing sign-in…");

    useEffect(() => {
        const run = async () => {
            try {
                // A) PKCE: ?code=... → exchange in browser, then let server write cookies.
                const code = search.get("code");
                if (code) {
                    const supabase = getBrowserSupabase();
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) throw new Error("Could not finish setting up your session.");

                    const session = data.session ?? (await supabase.auth.getSession()).data.session;
                    if (!session?.access_token || !session.refresh_token) {
                        throw new Error("Could not finish setting up your session.");
                    }

                    const response = await fetch("/auth/set-session", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            access_token: session.access_token,
                            refresh_token: session.refresh_token,
                        }),
                    });
                    if (!response.ok) throw new Error("Could not finish setting up your session.");
                }

                // B) Hash tokens: #access_token=...&refresh_token=... → post to server to write cookies
                if (typeof window !== "undefined" && window.location.hash) {
                    const hash = new URLSearchParams(window.location.hash.slice(1));
                    const access_token = hash.get("access_token");
                    const refresh_token = hash.get("refresh_token");
                    if (access_token && refresh_token) {
                        const r = await fetch("/auth/set-session", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ access_token, refresh_token }),
                        });
                        if (!r.ok) throw new Error("Could not finish setting up your session.");
                    }
                }

                // Now cookies are set server-side — onboard safely
                const pending = localStorage.getItem("pending_display_name");
                const pendingType = localStorage.getItem("pending_account_type");
                const pendingArtist = localStorage.getItem("pending_artist_name");
                if (pending || pendingType) {
                    const onboard = await fetch("/auth/onboard", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            display_name: pending,
                            artist_name: pendingArtist,
                            account_type: pendingType === "artist" ? "artist" : "fan",
                        }),
                    });
                    if (!onboard.ok) {
                        setMsg("Sign-in completed, but account setup needs attention.");
                        return;
                    }
                    localStorage.removeItem("pending_display_name");
                    localStorage.removeItem("pending_account_type");
                    localStorage.removeItem("pending_artist_name");
                }

                router.replace(nextPathWithAccountType(search.get("next"), search.get("type")));
            } catch (e: unknown) {
                setMsg(e instanceof Error ? `Sign-in failed: ${e.message}` : "Sign-in failed.");
            }
        };
        run();
    }, [router, search]);

    return <main className="p-6">{msg}</main>;
}

function nextPathWithAccountType(next: string | null, type: string | null) {
    const path = safeNextPath(next);
    if (type !== "artist" && type !== "fan") return path;
    if (!path.startsWith("/account/setup")) return path;

    const url = new URL(path, "https://merchtent.local");
    url.searchParams.set("type", type);
    return `${url.pathname}${url.search}`;
}
