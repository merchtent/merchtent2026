"use client";

const SESSION_KEY = "mt_session_id";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

type StoredSession = {
    id: string;
    last_activity_at: number;
};

function newSession(now: number): StoredSession | null {
    if (typeof crypto.randomUUID !== "function") return null;
    return { id: crypto.randomUUID(), last_activity_at: now };
}

export function getAnalyticsSessionId(): string | null {
    if (typeof window === "undefined") return null;

    try {
        const now = Date.now();
        const raw = localStorage.getItem(SESSION_KEY);
        let stored: StoredSession | null = null;

        if (raw) {
            try {
                const parsed = JSON.parse(raw) as StoredSession;
                if (parsed?.id && Number.isFinite(parsed.last_activity_at)) stored = parsed;
            } catch {
                // Migrate the original raw UUID format into a timed session.
                stored = { id: raw, last_activity_at: now };
            }
        }

        if (!stored || now - stored.last_activity_at > SESSION_TIMEOUT_MS) {
            stored = newSession(now);
        } else {
            stored.last_activity_at = now;
        }

        if (!stored) return null;
        localStorage.setItem(SESSION_KEY, JSON.stringify(stored));
        return stored.id;
    } catch {
        return newSession(Date.now())?.id ?? null;
    }
}
