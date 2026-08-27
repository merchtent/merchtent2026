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
                const supabase = getBrowserSupabase();
                // A) PKCE: ?code=... → exchange in browser, then let server write cookies.
                const code = search.get("code");
                if (code) {
                    const { error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) {
                        console.error("auth callback code exchange failed", error.message);
                    }
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
                        if (!r.ok) {
                            console.error("auth callback hash token cookie sync failed", await r.text());
                            throw new Error("Could not finish setting up your session.");
                        }
                    }
                }

                const session = await waitForBrowserSession(supabase);
                if (session?.access_token && session.refresh_token) {
                    await syncSessionCookie(session);
                } else if (code || window.location.hash) {
                    throw new Error("Could not finish setting up your session. Please request a fresh password email and open it in the same browser.");
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

async function waitForBrowserSession(supabase: ReturnType<typeof getBrowserSupabase>) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.error("auth callback browser session lookup failed", error.message);
        }
        if (data.session?.access_token && data.session.refresh_token) {
            return data.session;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 250));
    }

    return null;
}

async function syncSessionCookie(session: { access_token: string; refresh_token: string }) {
    const response = await fetch("/auth/set-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
        }),
    });

    if (!response.ok) {
        console.error("auth callback session cookie sync failed", await response.text());
        throw new Error("Could not finish setting up your session.");
    }
}

function nextPathWithAccountType(next: string | null, type: string | null) {
    const path = safeNextPath(next);
    if (type !== "artist" && type !== "fan") return path;
    if (!path.startsWith("/account/setup")) return path;

    const url = new URL(path, "https://merchtent.local");
    url.searchParams.set("type", type);
    return `${url.pathname}${url.search}`;
}
