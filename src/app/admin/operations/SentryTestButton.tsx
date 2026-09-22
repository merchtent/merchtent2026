"use client";

import { useState, useTransition } from "react";
import { RadioTower } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

export default function SentryTestButton() {
    const toast = useToast();
    const [armed, setArmed] = useState(false);
    const [pending, startTransition] = useTransition();

    const send = () => {
        if (!armed) {
            setArmed(true);
            return;
        }

        startTransition(async () => {
            const response = await fetch("/api/admin/monitoring/test", { method: "POST" });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                toast({ title: "Monitoring test failed", description: payload?.error ?? "Sentry did not accept the test event.", variant: "error" });
                return;
            }
            toast({ title: "Monitoring event sent", description: `Check Sentry and the alert destination. Event ${payload.eventId}.` });
            setArmed(false);
        });
    };

    return (
        <button type="button" disabled={pending} onClick={send} onBlur={() => setArmed(false)} className="inline-flex items-center gap-2 border border-neutral-700 px-3 py-2 text-xs font-black uppercase text-neutral-200 hover:border-lime-300 disabled:opacity-50">
            <RadioTower className="h-4 w-4" />
            {pending ? "Sending..." : armed ? "Confirm test event" : "Test monitoring"}
        </button>
    );
}
