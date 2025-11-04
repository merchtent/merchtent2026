// src/components/HeaderClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useCart } from "@/components/CartProvider";
import MiniCartDrawer from "@/components/MiniCartDrawer";
import { motion } from "framer-motion";
import {
    Menu,
    X,
    Disc3,
    Ticket,
    Music2,
    Star,
    Heart,
    Globe,
    Sparkles,
    Instagram,
} from "lucide-react";

type Props = { initialEmail: string | null };

// ---------- Site Theme Helpers ----------
const brand = {
    name: "MERCH TENT",
    tagline: "Band Merch for local & unsigned bands",
    accent: "#ef4444",
};

const nav = [
    { label: "Tees", href: "/category/tees" },
    { label: "Hoodies", href: "/category/hoodies" }, // <- fixed leading slash
    { label: "Tank Tops", href: "/category/tanks" },  // <- fixed leading slash
    { label: "Artists", href: "/artists" },
];

const authNav = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Orders", href: "/orders" },
];

const unAuthNav = [
    { label: "Sign Up", href: "/auth/sign-up" },
    { label: "Sign In", href: "/auth/sign-in" },
];

export default function HeaderClient({ initialEmail }: Props) {
    const router = useRouter();
    const supabase = getBrowserSupabase();
    const [email, setEmail] = useState<string | null>(initialEmail);
    const [loadingSignOut, setLoadingSignOut] = useState(false);
    const { count, toggle } = useCart();
    const [mobileMenu, setMobileMenu] = useState(false);

    // Helper: set email from a Supabase session object safely
    const setEmailFromSession = (session: { user?: { email?: string | null } } | null) => {
        if (session?.user?.email) {
            setEmail(session.user.email);
        }
    };

    useEffect(() => {
        let mounted = true;

        // A) Hydrate opportunistically from current session (don’t clear if null)
        (async () => {
            try {
                const { data } = await supabase.auth.getSession();
                if (!mounted) return;
                setEmailFromSession(data.session ?? null);
            } catch {
                /* ignore */
            }
        })();

        // B) React to Supabase auth events, incl. INITIAL_SESSION
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
            if (!mounted) return;

            switch (event) {
                case "INITIAL_SESSION":
                case "SIGNED_IN":
                case "TOKEN_REFRESHED":
                case "USER_UPDATED":
                    setEmailFromSession(session ?? null);
                    break;
                case "SIGNED_OUT":
                    setEmail(null);
                    break;
                default:
                    // ignore PASSWORD_RECOVERY, LINKED_IDENTITY, etc.
                    break;
            }
        });

        // C) Resync when the tab regains focus or becomes visible
        const resync = async () => {
            try {
                const { data } = await supabase.auth.getSession();
                if (!mounted) return;
                // Only update if something changed (prevents unnecessary re-renders)
                const nextEmail = data.session?.user?.email ?? null;
                setEmail((prev) => (prev === nextEmail ? prev : nextEmail));
            } catch {
                /* ignore */
            }
        };
        window.addEventListener("focus", resync);
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") resync();
        });

        // D) Cross-tab sync (if user signs in/out in another tab)
        const onStorage = (e: StorageEvent) => {
            // Supabase v2 uses "sb-[project-ref]-auth-token" locally; we resync on any storage change
            if (e.key && e.key.includes("-auth-token")) {
                resync();
            }
        };
        window.addEventListener("storage", onStorage);

        return () => {
            mounted = false;
            try {
                sub.subscription.unsubscribe();
            } catch { }
            window.removeEventListener("focus", resync);
            document.removeEventListener("visibilitychange", resync);
            window.removeEventListener("storage", onStorage);
        };
    }, [supabase]);

    const signOut = async () => {
        try {
            setLoadingSignOut(true);

            // 1) sign out on the client
            await supabase.auth.signOut();

            // 2) tell server to clear cookies
            await fetch("/auth/sign-out", { method: "POST" }).catch(() => { });

            // 3) update local ui
            setEmail(null);

            // 4) now actually navigate
            router.replace("/");
        } finally {
            setLoadingSignOut(false);
        }
    };


    return (
        <>
            {/* Announcement / Marquee */}
            <div className="w-full bg-red-600 text-white text-xs md:text-sm py-4 tracking-wide">
                <div className="max-w-7xl mx-auto px-4 overflow-hidden">
                    <motion.div
                        className="flex whitespace-nowrap will-change-transform"
                        animate={{ x: ["0%", "-50%"] }}
                        transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
                    >
                        <div className="flex items-center gap-8 pr-8">
                            <span className="inline-flex items-center gap-2">
                                <Disc3 className="h-4 w-4" /> New artists every week
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <Ticket className="h-4 w-4" /> Launch Sales
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <Music2 className="h-4 w-4" /> Free shipping over $100
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <Star className="h-4 w-4" /> Limited edition drops
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <Heart className="h-4 w-4" /> Official band merch
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <Globe className="h-4 w-4" /> Worldwide shipping
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <Sparkles className="h-4 w-4" /> Sustainable materials
                            </span>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Sub-header */}
            <div className="w-full bg-neutral-950 text-neutral-200 text-xs md:text-sm py-2 border-b border-neutral-200/30">
                <div className="max-w-7xl mx-auto px-4 grid grid-cols-3 items-center">
                    <div className="flex items-center gap-3">
                        <a
                            href="https://www.instagram.com/merchtent.au/"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Instagram"
                            className="hover:text-white"
                        >
                            <Instagram className="h-4 w-4" />
                        </a>
                    </div>
                    <div className="text-center font-medium text-neutral-100">
                        <b>MERCH FOR LOCAL & UNSIGNED BANDS</b>
                    </div>
                    <div className="flex items-center justify-end">
                        <span className="px-2 py-0.5 rounded border border-neutral-700 text-neutral-200">
                            AUD $
                        </span>
                    </div>
                </div>
            </div>

            {/* Header */}
            <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/70 bg-neutral-900/95 border-b border-neutral-800">
                <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                    <div className="h-16 grid grid-cols-3 items-center">
                        {/* Left */}
                        <div className="flex items-center">
                            <button
                                className="md:hidden p-2"
                                aria-label="Toggle menu"
                                onClick={() => setMobileMenu(true)}
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            <nav className="hidden md:flex gap-6">
                                {nav.map((n) => (
                                    <a
                                        key={n.label}
                                        href={n.href}
                                        className="text-sm text-neutral-300 hover:text-white transition-colors"
                                    >
                                        {n.label}
                                    </a>
                                ))}
                            </nav>
                        </div>
                        {/* Center */}
                        <div className="flex justify-center">
                            <a
                                href="/"
                                className="font-black tracking-[0.25em] text-lg hover:text-red-400 transition-colors"
                            >
                                {brand.name}
                            </a>
                        </div>
                        {/* Right */}
                        <div className="flex items-center justify-end gap-3">
                            {email ? (
                                <>
                                    <nav className="hidden md:flex gap-6">
                                        {authNav.map((n) => (
                                            <a
                                                key={n.label}
                                                href={n.href}
                                                className="text-sm text-neutral-300 hover:text-white transition-colors"
                                            >
                                                {n.label}
                                            </a>
                                        ))}
                                    </nav>
                                    <button
                                        onClick={signOut}
                                        className="text-sm underline ml-2 hidden md:flex hover:cursor-pointer hover:text-white"
                                        disabled={loadingSignOut}
                                    >
                                        {loadingSignOut ? "Signing out…" : "Sign out"}
                                    </button>
                                </>
                            ) : (
                                <nav className="hidden md:flex gap-6">
                                    {unAuthNav.map((n) => (
                                        <a
                                            key={n.label}
                                            href={n.href}
                                            className="text-sm text-neutral-300 hover:text-white transition-colors"
                                        >
                                            {n.label}
                                        </a>
                                    ))}
                                </nav>
                            )}

                            <button onClick={toggle} className="relative rounded-xl border px-3 py-1 ml-3">
                                Cart
                                {count > 0 && (
                                    <span className="absolute -top-2 -right-2 text-xs bg-black text-white rounded-full px-1.5 py-0.5">
                                        {count}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {mobileMenu && (
                    <div className="md:hidden border-t border-neutral-800 bg-neutral-950">
                        <div className="max-w-7xl mx-auto px-4 py-4 space-y-3">
                            <button className="ml-auto mb-2 p-2" onClick={() => setMobileMenu(false)}>
                                <X className="h-5 w-5" />
                            </button>
                            {nav.map((n) => (
                                <a key={n.label} href={n.href} className="block py-2 text-sm">
                                    {n.label}
                                </a>
                            ))}
                            <div className="pt-2 border-t border-neutral-800 mt-2">
                                {email ? (
                                    <>
                                        {authNav.map((n) => (
                                            <a key={n.label} href={n.href} className="block py-2 text-sm">
                                                {n.label}
                                            </a>
                                        ))}
                                        <button
                                            onClick={signOut}
                                            className="mt-2 text-sm underline"
                                            disabled={loadingSignOut}
                                        >
                                            {loadingSignOut ? "Signing out…" : "Sign out"}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {unAuthNav.map((n) => (
                                            <a key={n.label} href={n.href} className="block py-2 text-sm">
                                                {n.label}
                                            </a>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </header>

            <MiniCartDrawer />
        </>
    );
}
