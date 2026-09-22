"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <html lang="en">
            <body className="grid min-h-screen place-items-center bg-black p-6 text-white">
                <main className="max-w-xl border border-red-500/50 bg-neutral-950 p-8 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-lime-300">Merch Tent</p>
                    <h1 className="mt-3 text-4xl font-black uppercase">Something went wrong.</h1>
                    <p className="mt-3 text-neutral-400">The issue has been reported. Try the page again in a moment.</p>
                    <button type="button" onClick={reset} className="mt-6 bg-red-600 px-5 py-3 font-black uppercase text-white">Try again</button>
                </main>
            </body>
        </html>
    );
}
