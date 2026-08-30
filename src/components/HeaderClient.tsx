// src/components/HeaderClient.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useCart } from "@/components/CartProvider";
import MiniCartDrawer from "@/components/MiniCartDrawer";
import BrandLogo from "@/components/BrandLogo";
import {
    Menu,
    X,
    ArrowRight,
    Search,
    ShoppingBag,
} from "lucide-react";

type Props = { initialEmail: string | null };

type SearchArtist = {
    id: string;
    name: string;
    slug: string;
    image: string;
};

type SearchProduct = {
    id: string;
    title: string;
    price: number;
    image: string;
    slug: string;
    badge: string;
};

type SearchResults = {
    artists: SearchArtist[];
    products: SearchProduct[];
};

const nav = [
    { label: "Tees", href: "/category/tees", meta: "front row" },
    { label: "Hoodies", href: "/category/hoodies", meta: "cold nights" },
    { label: "Hats", href: "/category/hats", meta: "top shelf" },
    { label: "Tank Tops", href: "/category/tanks", meta: "pit ready" },
    { label: "Artists", href: "/artists", meta: "the scene" },
];

const mobileNav = [
    { label: "Home", href: "/", meta: "front door" },
    ...nav,
];

const authNav = [
    { label: "Dashboard", href: "/dashboard", meta: "your hub" },
    { label: "Orders", href: "/dashboard/orders", meta: "tracking" },
];

export default function HeaderClient({ initialEmail }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = getBrowserSupabase();
    const [email, setEmail] = useState<string | null>(initialEmail);
    const [loadingSignOut, setLoadingSignOut] = useState(false);
    const { count, toggle } = useCart();
    const [mobileMenu, setMobileMenu] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResults>({ artists: [], products: [] });

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
            "bg-black/35 hover:-translate-y-0.5 hover:border-lime-300 hover:bg-white/[0.04] hover:text-white hover:shadow-[6px_6px_0_rgba(190,242,100,0.1)]",
            isActive(href)
                ? "border-lime-300 bg-white/[0.06] text-white shadow-[4px_4px_0_rgba(190,242,100,0.16)]"
                : "text-neutral-100",
        ].join(" ");

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const q = searchQuery.trim();
        router.push(q ? `/new?q=${encodeURIComponent(q)}` : "/new");
        setSearchOpen(false);
        setMobileMenu(false);
    };

    const updateSearchQuery = (value: string) => {
        setSearchQuery(value);
        setSearchOpen(true);

        if (value.trim().length < 2) {
            setSearchResults({ artists: [], products: [] });
            setSearchLoading(false);
        }
    };

    const closeSearchNavigation = () => {
        setSearchOpen(false);
        setMobileMenu(false);
    };

    const navigateSearchResult = (href: string) => {
        router.push(href);
        closeSearchNavigation();
    };

    useEffect(() => {
        const q = searchQuery.trim();

        if (q.length < 2) {
            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                setSearchLoading(true);
                const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
                    signal: controller.signal,
                    headers: { Accept: "application/json" },
                });
                if (!response.ok) throw new Error("Search failed");
                const data = (await response.json()) as SearchResults;
                setSearchResults({
                    artists: Array.isArray(data.artists) ? data.artists : [],
                    products: Array.isArray(data.products) ? data.products : [],
                });
            } catch {
                if (!controller.signal.aborted) {
                    setSearchResults({ artists: [], products: [] });
                }
            } finally {
                if (!controller.signal.aborted) {
                    setSearchLoading(false);
                }
            }
        }, 180);

        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [searchQuery]);

    const searchHasQuery = searchQuery.trim().length >= 2;
    const searchHasResults = searchResults.artists.length > 0 || searchResults.products.length > 0;

    const searchSuggestions = (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 border border-white/15 bg-neutral-950 shadow-[0_18px_44px_rgba(0,0,0,0.58)]">
            <div className="border-b border-white/10 px-3 py-2">
                <p className="text-[0.56rem] font-black uppercase tracking-[0.24em] text-lime-300">Quick search</p>
            </div>
            {!searchHasQuery ? (
                <p className="px-3 py-4 text-sm text-neutral-400">Start typing an artist, product or drop.</p>
            ) : searchLoading ? (
                <p className="px-3 py-4 text-sm text-neutral-400">Searching the scene...</p>
            ) : !searchHasResults ? (
                <div className="px-3 py-4">
                    <p className="text-sm font-bold text-white">Nothing found yet.</p>
                    <button
                        type="button"
                        onPointerDown={(event) => {
                            event.preventDefault();
                            navigateSearchResult(`/new?q=${encodeURIComponent(searchQuery.trim())}`);
                        }}
                        className="mt-2 inline-flex text-[0.65rem] font-black uppercase tracking-[0.16em] text-lime-300"
                    >
                        Search all drops
                    </button>
                </div>
            ) : (
                <div className="max-h-[70vh] overflow-y-auto p-2">
                    {searchResults.artists.length > 0 && (
                        <div className="mb-2">
                            <p className="px-2 pb-1 text-[0.55rem] font-black uppercase tracking-[0.22em] text-red-500">Artists</p>
                            <div className="space-y-1">
                                {searchResults.artists.map((artist) => (
                                    <button
                                        key={artist.id}
                                        type="button"
                                        onPointerDown={(event) => {
                                            event.preventDefault();
                                            navigateSearchResult(`/artists/${artist.slug}`);
                                        }}
                                        className="group flex w-full items-center gap-3 border border-white/10 bg-black/40 p-2 text-left transition hover:border-lime-300 hover:bg-white/[0.04]"
                                    >
                                        <span className="relative h-11 w-11 shrink-0 overflow-hidden bg-neutral-900">
                                            <Image src={artist.image} alt="" fill sizes="44px" className="object-cover" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-black text-white">{artist.name}</span>
                                            <span className="mt-0.5 block text-[0.58rem] font-black uppercase tracking-[0.18em] text-neutral-500 group-hover:text-lime-300">
                                                Artist page
                                            </span>
                                        </span>
                                        <ArrowRight className="h-4 w-4 shrink-0 text-red-500 group-hover:text-lime-300" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {searchResults.products.length > 0 && (
                        <div>
                            <p className="px-2 pb-1 text-[0.55rem] font-black uppercase tracking-[0.22em] text-red-500">Products</p>
                            <div className="space-y-1">
                                {searchResults.products.map((product) => (
                                    <button
                                        key={product.id}
                                        type="button"
                                        onPointerDown={(event) => {
                                            event.preventDefault();
                                            navigateSearchResult(`/product/${product.slug}`);
                                        }}
                                        className="group flex w-full items-center gap-3 border border-white/10 bg-black/40 p-2 text-left transition hover:border-lime-300 hover:bg-white/[0.04]"
                                    >
                                        <span className="relative h-14 w-14 shrink-0 overflow-hidden bg-neutral-100">
                                            <Image src={product.image} alt="" fill sizes="56px" className="object-contain p-1" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-black text-white">{product.title}</span>
                                            <span className="mt-0.5 block truncate text-[0.58rem] font-black uppercase tracking-[0.18em] text-neutral-500">
                                                {product.badge}
                                            </span>
                                            <span className="mt-1 block text-sm font-black text-lime-300">${product.price.toFixed(2)}</span>
                                        </span>
                                        <ArrowRight className="h-4 w-4 shrink-0 text-red-500 group-hover:text-lime-300" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onPointerDown={(event) => {
                            event.preventDefault();
                            navigateSearchResult(`/new?q=${encodeURIComponent(searchQuery.trim())}`);
                        }}
                        className="mt-2 flex w-full items-center justify-between border border-white/10 bg-lime-300 px-3 py-2 text-[0.65rem] font-black uppercase tracking-[0.16em] text-black transition hover:bg-lime-200"
                    >
                        Search all results
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="site-shell-header">
            <header className="sticky top-0 z-40 border-b border-white/15 bg-black/95 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur supports-[backdrop-filter]:bg-black/82">
                <div className="mx-auto max-w-[1680px] px-3 md:px-5 lg:px-6">
                    <div className="grid min-h-[5.1rem] grid-cols-[auto_1fr_auto] items-center gap-4 py-2 xl:grid-cols-[1fr_auto_1.1fr]">
                        {/* Left */}
                        <div className="flex items-center">
                            <button
                                className="grid h-11 w-11 place-items-center border border-lime-300/35 bg-black text-lime-300 shadow-[4px_4px_0_rgba(190,242,100,0.18)] transition hover:border-lime-300 hover:bg-lime-300 hover:text-black xl:hidden"
                                aria-label="Toggle menu"
                                onClick={() => setMobileMenu(true)}
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            <nav className="hidden items-stretch gap-1.5 xl:flex" aria-label="Shop navigation">
                                {nav.map((n) => (
                                    <Link
                                        key={n.label}
                                        href={n.href}
                                        className={`${navLinkClass(n.href)} min-w-[5.85rem] px-4`}
                                    >
                                        <span className="text-[0.78rem] font-black leading-none tracking-[0.14em]">{n.label}</span>
                                        <span className="mt-1.5 text-[0.6rem] font-black tracking-[0.2em] text-white/50 group-hover:text-white/80">
                                            {n.meta}
                                        </span>
                                    </Link>
                                ))}
                            </nav>
                        </div>

                        {/* Center */}
                        <div className="relative flex min-h-[4.35rem] w-full items-center justify-center overflow-visible text-center">
                            <span className="absolute inset-x-[-18px] top-1/2 hidden h-px bg-gradient-to-r from-transparent via-lime-300/35 to-transparent md:block" />
                            <BrandLogo className="relative z-10 origin-center scale-[0.95] drop-shadow-[0_10px_22px_rgba(0,0,0,0.55)] md:scale-[1.05]" />
                        </div>

                        {/* Right */}
                        <div className="flex items-center justify-end gap-2">
                            <div className="relative hidden min-w-0 max-w-[360px] flex-1 lg:block">
                                <form onSubmit={submitSearch} className="flex h-12 items-center gap-2 border border-white/10 bg-white/[0.035] px-3 text-sm text-neutral-300 focus-within:border-lime-300">
                                    <Search className="h-4 w-4 shrink-0 text-neutral-500" />
                                    <input
                                        value={searchQuery}
                                        onChange={(event) => updateSearchQuery(event.target.value)}
                                        onFocus={() => setSearchOpen(true)}
                                        onBlur={() => window.setTimeout(() => setSearchOpen(false), 140)}
                                        type="search"
                                        placeholder="Search artists, merch, drops"
                                        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-neutral-500"
                                    />
                                </form>
                                {searchOpen && searchSuggestions}
                            </div>
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
                                    <Link href="/auth/sign-up" className="flex min-h-12 flex-col justify-center bg-lime-300 px-5 py-2 text-left font-black uppercase text-black transition hover:-translate-y-0.5 hover:bg-lime-200">
                                        <span className="text-[0.7rem] leading-none tracking-[0.14em]">Sign up</span>
                                        <span className="mt-1 text-[0.54rem] tracking-[0.2em] text-black/55">early access</span>
                                    </Link>
                                    <Link href="/auth/sign-in" className={navLinkClass("/auth/sign-in")}>
                                        <span className="text-[0.7rem] font-black leading-none tracking-[0.14em]">Sign in</span>
                                        <span className="mt-1 text-[0.54rem] font-black tracking-[0.2em] text-white/50 group-hover:text-white/80">backstage</span>
                                    </Link>
                                </nav>
                            )}

                            <button
                                onClick={toggle}
                                className="relative ml-1 inline-flex min-h-12 items-center gap-2 border border-white/25 bg-black px-3 text-[0.72rem] font-black uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:border-lime-300 hover:bg-lime-300 hover:text-black md:border-white md:bg-white md:text-black md:px-4"
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
                            <div className="relative mb-3">
                                <form onSubmit={submitSearch} className="flex h-12 items-center gap-2 border border-white/15 bg-white/[0.04] px-3 text-sm text-neutral-300 focus-within:border-lime-300">
                                <Search className="h-4 w-4 shrink-0 text-neutral-500" />
                                <input
                                    value={searchQuery}
                                    onChange={(event) => updateSearchQuery(event.target.value)}
                                    onFocus={() => setSearchOpen(true)}
                                    onBlur={() => window.setTimeout(() => setSearchOpen(false), 140)}
                                    type="search"
                                    placeholder="Search artists, merch, drops"
                                    className="min-w-0 flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-neutral-500"
                                />
                                <button type="submit" className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-lime-300">
                                    Go
                                </button>
                            </form>
                                {searchOpen && searchSuggestions}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {mobileNav.map((n) => (
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
                                        <Link href="/auth/sign-up" className="group relative flex min-h-12 flex-col justify-center bg-lime-300 px-3 py-2 text-left uppercase text-black transition" onClick={() => setMobileMenu(false)}>
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-black leading-none tracking-[0.14em]">Sign up</span>
                                                <ArrowRight className="h-4 w-4" />
                                            </span>
                                            <span className="mt-2 text-[0.6rem] font-black tracking-[0.2em] text-black/55">early access</span>
                                        </Link>
                                        <Link href="/auth/sign-in" className={navLinkClass("/auth/sign-in")} onClick={() => setMobileMenu(false)}>
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-black leading-none tracking-[0.14em]">Sign in</span>
                                                <ArrowRight className="h-4 w-4" />
                                            </span>
                                            <span className="mt-2 text-[0.6rem] font-black tracking-[0.2em] text-white/50">backstage</span>
                                        </Link>
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
