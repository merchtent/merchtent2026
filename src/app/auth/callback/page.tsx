"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
                    window.location.replace(`/auth/callback/complete?code=${encodeURIComponent(code)}`);
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
                        if (!r.ok) throw new Error(await r.text());
                    }
                }

                // Now cookies are set server-side — onboard safely
                const pending = localStorage.getItem("pending_display_name");
                if (pending) {
                    const onboard = await fetch("/auth/onboard", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ display_name: pending }),
                    });
                    // Optional: helpful during setup
                    if (!onboard.ok) {
                        console.warn("Onboard failed:", onboard.status, await onboard.text());
                    }
                    localStorage.removeItem("pending_display_name");
                }

                router.replace("/dashboard");
            } catch (e: any) {
                console.error(e);
                setMsg(`Sign-in failed: ${e?.message ?? e}`);
            }
        };
        run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <main className="p-6">{msg}</main>;
}
