"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readConsent, saveConsent } from "@/lib/marketing/consent";
import { captureMarketingAttribution } from "@/lib/marketing/attribution";

export default function ConsentBanner() {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const timer = window.setTimeout(() => setVisible(!readConsent()), 0);
        return () => window.clearTimeout(timer);
    }, []);
    if (!visible) return null;

    function choose(analytics: boolean, marketing: boolean) {
        saveConsent({ analytics, marketing });
        if (marketing) captureMarketingAttribution();
        setVisible(false);
    }

    return <aside className="fixed inset-x-3 bottom-3 z-[100] border border-neutral-700 bg-black p-4 text-white shadow-2xl md:left-auto md:max-w-xl md:p-5" aria-label="Privacy choices">
        <p className="text-sm font-black uppercase text-lime-300">Your privacy choices</p>
        <p className="mt-2 text-sm leading-6 text-neutral-300">Necessary storage keeps the shop working. With your permission, analytics helps us improve the store and marketing storage helps measure campaigns. We do not sell personal information.</p>
        <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => choose(true, true)} className="bg-lime-300 px-4 py-2 text-xs font-black uppercase text-black">Allow optional</button>
            <button onClick={() => choose(true, false)} className="border border-neutral-600 px-4 py-2 text-xs font-black uppercase">Analytics only</button>
            <button onClick={() => choose(false, false)} className="border border-neutral-600 px-4 py-2 text-xs font-black uppercase">Necessary only</button>
            <Link href="/privacy" className="px-2 py-2 text-xs font-bold text-neutral-400 underline">Privacy policy</Link>
        </div>
    </aside>;
}
