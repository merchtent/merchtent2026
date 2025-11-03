"use client";

import { createContext, useContext, useMemo, useState, useEffect } from "react";

type ToastVariant = "info" | "success" | "error";

type Toast = {
    id: string;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    durationMs?: number; // default 2500
    variant?: ToastVariant;
};

type ToastCtx = {
    toast: (t: Omit<Toast, "id">) => void;
    dismiss: (id: string) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export default function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    // auto-dismiss per toast
    useEffect(() => {
        const timers = toasts.map((t) => {
            const ms = t.durationMs ?? 2500;
            const id = window.setTimeout(
                () => setToasts((prev) => prev.filter((x) => x.id !== t.id)),
                ms
            );
            return id;
        });
        return () => timers.forEach(clearTimeout);
    }, [toasts]);

    const api = useMemo<ToastCtx>(
        () => ({
            toast: (t) => {
                const id = crypto.randomUUID();
                setToasts((prev) => [...prev, { id, variant: "info", ...t }]);
            },
            dismiss: (id) => setToasts((prev) => prev.filter((t) => t.id !== id)),
        }),
        []
    );

    return (
        <Ctx.Provider value={api}>
            {children}

            {/* stack: desktop bottom-right, mobile bottom-center */}
            <div className="pointer-events-none fixed z-50 flex flex-col gap-2 right-4 bottom-4 sm:right-4 sm:left-auto sm:bottom-4 left-2 right-2 sm:left-auto sm:w-auto">
                {toasts.map((t) => (
                    <ToastCard key={t.id} t={t} onDismiss={() => api.dismiss(t.id)} />
                ))}
            </div>
        </Ctx.Provider>
    );
}

function ToastCard({
    t,
    onDismiss,
}: {
    t: Toast;
    onDismiss: () => void;
}) {
    const ms = t.durationMs ?? 2500;

    // progress bar animation (CSS transition from 100% → 0%)
    const [started, setStarted] = useState(false);
    useEffect(() => {
        const id = requestAnimationFrame(() => setStarted(true));
        return () => cancelAnimationFrame(id);
    }, []);

    const theme =
        t.variant === "success"
            ? { ring: "ring-emerald-500/30", bar: "bg-emerald-500", badge: "text-emerald-300" }
            : t.variant === "error"
                ? { ring: "ring-red-500/30", bar: "bg-red-500", badge: "text-red-300" }
                : { ring: "ring-red-500/30", bar: "bg-red-500", badge: "text-red-300" }; // info defaults to red accent to match brand

    return (
        <div
            className={`pointer-events-auto w-full sm:w-80 rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-100 shadow-xl ring-1 ${theme.ring}`}
            style={{ clipPath: "polygon(6% 0,100% 0,94% 100%,0 100%)" }}
            role="status"
            aria-live="polite"
        >
            {/* noise overlay */}
            <div
                aria-hidden
                className="absolute inset-0 opacity-[0.06] mix-blend-soft-light"
                style={{
                    backgroundImage:
                        "radial-gradient(circle at 20% 10%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 30%, #fff 1px, transparent 1px)",
                    backgroundSize: "12px 12px, 14px 14px",
                }}
            />
            <div className="relative p-4">
                <div className="flex items-start gap-3">
                    {/* badge dot */}
                    <span
                        className={`mt-1 inline-block h-2.5 w-2.5 rounded-full ${theme.bar}`}
                        aria-hidden
                    />
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{t.title}</div>
                        {t.description && (
                            <div className="text-sm text-neutral-300 mt-0.5">
                                {t.description}
                            </div>
                        )}
                        {t.actionLabel && (
                            <button
                                onClick={() => {
                                    onDismiss();
                                    t.onAction?.();
                                }}
                                className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-900"
                            >
                                {t.actionLabel}
                            </button>
                        )}
                    </div>
                    <button
                        onClick={onDismiss}
                        className="text-sm text-neutral-400 hover:text-white -m-1 p-1"
                        aria-label="Dismiss"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* progress bar */}
            <div className="relative h-1 overflow-hidden rounded-b-2xl bg-neutral-900">
                <div
                    className={`${theme.bar} h-full transition-[width]`}
                    style={{
                        width: started ? "0%" : "100%",
                        transitionDuration: `${ms}ms`,
                        transitionTimingFunction: "linear",
                    }}
                />
            </div>
        </div>
    );
}

export function useToast() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
    return ctx.toast;
}
