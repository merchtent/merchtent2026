// src/components/HeaderClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useCart } from "@/components/CartProvider";
import MiniCartDrawer from "@/components/MiniCartDrawer";
import BrandLogo from "@/components/BrandLogo";
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
    ArrowRight,
    ShoppingBag,
} from "lucide-react";

type Props = { initialEmail: string | null };

const nav = [
    { label: "Tees", href: "/category/tees", meta: "front row" },
    { label: "Hoodies", href: "/category/hoodies", meta: "cold nights" },
    { label: "Hats", href: "/category/hats", meta: "top shelf" },
    { label: "Tank Tops", href: "/category/tanks", meta: "pit ready" },
    { label: "Artists", href: "/artists", meta: "the scene" },
];

const authNav = [
    { label: "Dashboard", href: "/dashboard", meta: "your hub" },
    { label: "Orders", href: "/dashboard/orders", meta: "tracking" },
];

const unAuthNav = [
    { label: "Sign Up", href: "/auth/sign-up", meta: "early access" },
    { label: "Sign In", href: "/auth/sign-in", meta: "backstage" },
];

export default function HeaderClient({ initialEmail }: Props) {
    const router = useRouter();
    const pathname = usePathname();
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

        // A) Hydrate opportunistically from current session
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
                    break;
            }
        });

        // C) Resync when the tab regains focus or becomes visible
        const resync = async () => {
            try {
                const { data } = await supabase.auth.getSession();
                if (!mounted) return;
                const nextEmail = data.session?.user?.email ?? null;
                setEmail((prev) => (prev === nextEmail ? prev : nextEmail));
            } catch {
                /* ignore */
            }
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") resync();
        };

        const onStorage = (e: StorageEvent) => {
            if (e.key && e.key.includes("-auth-token")) {
                resync();
            }
        };

        window.addEventListener("focus", resync);
        document.addEventListener("visibilitychange", onVisibilityChange);
        window.addEventListener("storage", onStorage);

        return () => {
            mounted = false;
            try {
                sub.subscription.unsubscribe();
            } catch { }
            window.removeEventListener("focus", resync);
            document.removeEventListener("visibilitychange", onVisibilityChange);
            window.removeEventListener("storage", onStorage);
        };
    }, [supabase]);

    const signOut = async () => {
        try {
            setLoadingSignOut(true);

            await supabase.auth.signOut();
            await fetch("/auth/sign-out", { method: "POST" }).catch(() => { });
            setEmail(null);
            router.replace("/");
        } finally {
            setLoadingSignOut(false);
        }
    };

    const isActive = (href: string) => {
        if (href === "/dashboard") return pathname === href;
        return pathname === href || pathname.startsWith(`${href}/`);
    };

    const navLinkClass = (href: string) =>
        [
            "group relative flex min-h-12 flex-col justify-center border border-white/10 px-3 py-2 text-left uppercase transition",
            "bg-black/35 hover:-translate-y-0.5 hover:border-red-500 hover:bg-red-600 hover:text-white hover:shadow-[6px_6px_0_rgba(255,255,255,0.08)]",
            isActive(href)
                ? "border-red-500 bg-red-600 text-white shadow-[4px_4px_0_rgba(255,255,255,0.12)]"
                : "text-neutral-100",
        ].join(" ");

    return (
        <div className="site-shell-header">
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
                                <Disc3 className="h-4 w-4" /> New Artists Every Week
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <Ticket className="h-4 w-4" /> Launch Sales
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <Music2 className="h-4 w-4" /> Print On Demand
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <Star className="h-4 w-4" /> Limited Edition Drops
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <Heart className="h-4 w-4" /> Official Band Merch
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <Globe className="h-4 w-4" /> Worldwide Shipping
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <Sparkles className="h-4 w-4" /> Sustainable Materials
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
            <header className="sticky top-0 z-40 border-b border-white/15 bg-black/95 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur supports-[backdrop-filter]:bg-black/82">
                <div className="mx-auto max-w-[1500px] px-3 md:px-5 lg:px-6">
                    <div className="grid min-h-[4.35rem] grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
                        {/* Left */}
                        <div className="flex items-center">
                            <button
                                className="grid h-11 w-11 place-items-center border border-white/20 bg-red-600 text-white shadow-[4px_4px_0_rgba(255,255,255,0.12)] xl:hidden"
                                aria-label="Toggle menu"
                                onClick={() => setMobileMenu(true)}
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            <nav className="hidden items-stretch gap-1 xl:flex" aria-label="Shop navigation">
                                {nav.map((n) => (
                                    <Link
                                        key={n.label}
                                        href={n.href}
                                        className={navLinkClass(n.href)}
                                    >
                                        <span className="text-[0.7rem] font-black leading-none tracking-[0.14em]">{n.label}</span>
                                        <span className="mt-1 text-[0.54rem] font-black tracking-[0.2em] text-white/50 group-hover:text-white/80">
                                            {n.meta}
                                        </span>
                                    </Link>
                                ))}
                            </nav>
                        </div>

                        {/* Center */}
                        <div className="relative flex min-h-[4.35rem] w-full items-center justify-center overflow-visible text-center">
                            <span className="absolute inset-x-[-18px] top-1/2 hidden h-px bg-gradient-to-r from-transparent via-red-500/45 to-transparent md:block" />
                            <BrandLogo className="relative z-10 origin-center scale-[1.1] drop-shadow-[0_10px_22px_rgba(0,0,0,0.55)] md:scale-[1.27]" />
                        </div>

                        {/* Right */}
                        <div className="flex items-center justify-end gap-2">
                            {email ? (
                                <>
                                    <nav className="hidden items-stretch gap-1 xl:flex" aria-label="Account navigation">
                                        {authNav.map((n) => (
                                            <Link
                                                key={n.label}
                                                href={n.href}
                                                className={navLinkClass(n.href)}
                                            >
                                                <span className="text-[0.7rem] font-black leading-none tracking-[0.14em]">{n.label}</span>
                                                <span className="mt-1 text-[0.54rem] font-black tracking-[0.2em] text-white/50 group-hover:text-white/80">
                                                    {n.meta}
                                                </span>
                                            </Link>
                                        ))}
                                    </nav>
                                    <button
                                        onClick={signOut}
                                        className="hidden min-h-12 items-center border border-white/10 px-3 text-[0.65rem] font-black uppercase tracking-[0.16em] text-neutral-300 transition hover:border-white hover:bg-white hover:text-black hover:cursor-pointer md:flex"
                                        disabled={loadingSignOut}
                                    >
                                        {loadingSignOut ? "Signing out..." : "Sign out"}
                                    </button>
                                </>
                            ) : (
                                <nav className="hidden items-stretch gap-1 md:flex" aria-label="Account navigation">
                                    {unAuthNav.map((n) => (
                                        <Link
                                            key={n.label}
                                            href={n.href}
                                            className={n.label === "Sign Up" ? `${navLinkClass(n.href)} border-red-500 bg-red-600 text-white` : navLinkClass(n.href)}
                                        >
                                            <span className="text-[0.7rem] font-black leading-none tracking-[0.14em]">{n.label}</span>
                                            <span className="mt-1 text-[0.54rem] font-black tracking-[0.2em] text-white/50 group-hover:text-white/80">
                                                {n.meta}
                                            </span>
                                        </Link>
                                    ))}
                                </nav>
                            )}

                            <button
                                onClick={toggle}
                                className="relative ml-1 inline-flex min-h-12 items-center gap-2 border border-white bg-white px-3 text-[0.72rem] font-black uppercase tracking-[0.12em] text-black transition hover:-translate-y-0.5 hover:bg-red-600 hover:text-white md:px-4"
                            >
                                <ShoppingBag className="h-4 w-4" />
                                <span className="hidden sm:inline">Cart</span>
                                {count > 0 && (
                                    <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[0.62rem] text-white ring-2 ring-black">
                                        {count}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {mobileMenu && (
                    <div className="border-t border-white/15 bg-black xl:hidden">
                        <div className="mx-auto max-w-7xl px-3 py-4">
                            <div className="mb-4 flex items-center justify-between border border-white/10 bg-neutral-950 p-3">
                                <div>
                                    <p className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-red-500">Main menu</p>
                                    <p className="mt-1 text-xl font-black uppercase leading-none text-white">Shop the scene</p>
                                </div>
                                <button className="grid h-10 w-10 place-items-center border border-white/20 text-white" onClick={() => setMobileMenu(false)} aria-label="Close menu">
                                <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {nav.map((n) => (
                                    <Link key={n.label} href={n.href} className={navLinkClass(n.href)} onClick={() => setMobileMenu(false)}>
                                        <span className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-black leading-none tracking-[0.14em]">{n.label}</span>
                                            <ArrowRight className="h-4 w-4" />
                                        </span>
                                        <span className="mt-2 text-[0.6rem] font-black tracking-[0.2em] text-white/50">{n.meta}</span>
                                    </Link>
                                ))}
                            </div>
                            <div className="mt-3 border-t border-white/15 pt-3">
                                {email ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {authNav.map((n) => (
                                            <Link key={n.label} href={n.href} className={navLinkClass(n.href)} onClick={() => setMobileMenu(false)}>
                                                <span className="flex items-center justify-between gap-2">
                                                    <span className="text-sm font-black leading-none tracking-[0.14em]">{n.label}</span>
                                                    <ArrowRight className="h-4 w-4" />
                                                </span>
                                                <span className="mt-2 text-[0.6rem] font-black tracking-[0.2em] text-white/50">{n.meta}</span>
                                            </Link>
                                        ))}
                                        <button
                                            onClick={signOut}
                                            className="col-span-2 min-h-12 border border-white/20 text-[0.7rem] font-black uppercase tracking-[0.16em] text-neutral-200"
                                            disabled={loadingSignOut}
                                        >
                                            {loadingSignOut ? "Signing out..." : "Sign out"}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {unAuthNav.map((n) => (
                                            <Link key={n.label} href={n.href} className={n.label === "Sign Up" ? `${navLinkClass(n.href)} border-red-500 bg-red-600 text-white` : navLinkClass(n.href)} onClick={() => setMobileMenu(false)}>
                                                <span className="flex items-center justify-between gap-2">
                                                    <span className="text-sm font-black leading-none tracking-[0.14em]">{n.label}</span>
                                                    <ArrowRight className="h-4 w-4" />
                                                </span>
                                                <span className="mt-2 text-[0.6rem] font-black tracking-[0.2em] text-white/50">{n.meta}</span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </header>

            <MiniCartDrawer />
        </div>
    );
}
