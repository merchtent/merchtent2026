"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import { readConsent, saveConsent, type ConsentPreferences } from "@/lib/marketing/consent";
import { captureMarketingAttribution } from "@/lib/marketing/attribution";
import {
    configureGoogleAnalytics,
    GA4_MEASUREMENT_ID,
    updateGoogleConsent,
} from "@/lib/marketing/google";

export default function ConsentBanner({ nonce }: { nonce?: string }) {
    const [visible, setVisible] = useState(false);
    const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

    useEffect(() => {
        function applyConsent(consent: ConsentPreferences | null) {
            updateGoogleConsent(consent);
            setAnalyticsEnabled(consent?.analytics === true);
            if (consent?.analytics) configureGoogleAnalytics();
        }

        const consent = readConsent();
        applyConsent(consent);
        const timer = window.setTimeout(() => setVisible(!consent), 0);
        const open = () => setVisible(true);
        const changed = (event: Event) => {
            applyConsent((event as CustomEvent<ConsentPreferences>).detail ?? readConsent());
        };
        window.addEventListener("merch-tent:open-consent", open);
        window.addEventListener("merch-tent:consent", changed);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener("merch-tent:open-consent", open);
            window.removeEventListener("merch-tent:consent", changed);
        };
    }, []);

    function choose(analytics: boolean, marketing: boolean) {
        saveConsent({ analytics, marketing });
        if (marketing) captureMarketingAttribution();
        setVisible(false);
    }

    return <>
        {analyticsEnabled && GA4_MEASUREMENT_ID ? <Script
            id="merch-tent-ga4"
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_MEASUREMENT_ID)}`}
            strategy="afterInteractive"
            nonce={nonce}
            onReady={configureGoogleAnalytics}
        /> : null}
        {visible ? <aside className="fixed inset-x-3 bottom-3 z-[100] border border-neutral-700 bg-black p-4 text-white shadow-2xl md:left-auto md:max-w-xl md:p-5" aria-label="Privacy choices">
            <p className="text-sm font-black uppercase text-lime-300">Your privacy choices</p>
            <p className="mt-2 text-sm leading-6 text-neutral-300">Necessary storage keeps the shop working. With your permission, analytics helps us improve the store and marketing storage helps measure campaigns. We do not sell personal information.</p>
            <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => choose(true, true)} className="bg-lime-300 px-4 py-2 text-xs font-black uppercase text-black">Allow optional</button>
                <button onClick={() => choose(true, false)} className="border border-neutral-600 px-4 py-2 text-xs font-black uppercase">Analytics only</button>
                <button onClick={() => choose(false, false)} className="border border-neutral-600 px-4 py-2 text-xs font-black uppercase">Necessary only</button>
                <Link href="/privacy" className="px-2 py-2 text-xs font-bold text-neutral-400 underline">Privacy policy</Link>
            </div>
        </aside> : null}
    </>;
}
