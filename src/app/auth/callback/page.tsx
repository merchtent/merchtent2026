"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
                // A) PKCE: ?code=... → let server write cookies
                const code = search.get("code");
                if (code) {
                    const type = search.get("type");
                    const nextPath = safeNextPath(search.get("next"));
                    const next = new URL("/auth/callback/complete", window.location.origin);
                    next.searchParams.set("code", code);
                    next.searchParams.set("next", nextPath);
                    if (type === "artist" || type === "fan") {
                        next.searchParams.set("type", type);
                    }
                    window.location.replace(next.toString());
                    return;
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
                if (pending || pendingType) {
                    const onboard = await fetch("/auth/onboard", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            display_name: pending,
                            account_type: pendingType === "artist" ? "artist" : "fan",
                        }),
                    });
                    if (!onboard.ok) {
                        setMsg("Sign-in completed, but account setup needs attention.");
                        return;
                    }
                    localStorage.removeItem("pending_display_name");
                    localStorage.removeItem("pending_account_type");
                }

                router.replace(safeNextPath(search.get("next")));
            } catch (e: unknown) {
                setMsg(e instanceof Error ? `Sign-in failed: ${e.message}` : "Sign-in failed.");
            }
        };
        run();
    }, [router, search]);

    return <main className="p-6">{msg}</main>;
}
